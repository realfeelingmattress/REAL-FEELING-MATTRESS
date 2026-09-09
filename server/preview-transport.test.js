import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
const base = "http://127.0.0.1:3102/api";
const dbPath = `data/preview-regression-${Date.now()}.sqlite`;
let server, owner, customer, anonymous;
const post = async (path, body) => {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json(), headers: r.headers };
};
const start = async () => {
  const r = await post("/preview/session", { transport: "isolated-preview" });
  assert.equal(r.status, 200);
  return r.data;
};
const call = async (
  session,
  path,
  method = "GET",
  payload,
  csrf = session.csrf,
) =>
  post("/preview/request", {
    sessionToken: session.previewSessionToken,
    csrfToken: csrf,
    path,
    method,
    payload,
  });
before(async () => {
  server = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: "3102",
      DB_PATH: dbPath,
      OWNER_EMAIL: "owner@preview-test.example",
      OWNER_PASSWORD: "PreviewOwner!2026",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    let log = "";
    const timer = setTimeout(
      () => reject(new Error("Test server did not start: " + log)),
      20000,
    );
    server.stdout.on("data", (d) => {
      log += d;
      if (log.includes("is ready on port")) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on("data", (d) => (log += d));
    server.on("exit", (c) => {
      clearTimeout(timer);
      reject(new Error("Test server stopped: " + c + " " + log));
    });
  });
  anonymous = await start();
});
after(async () => {
  if (server && server.exitCode === null) {
    await new Promise((resolve) => {
      server.once("exit", resolve);
      server.kill("SIGTERM");
    });
  }
  for (const suffix of ["", "-wal", "-shm"])
    try {
      fs.unlinkSync(dbPath + suffix);
    } catch {}
});
test("Preview handshake always creates an anonymous short-lived session, not an owner session", async () => {
  assert.equal(anonymous.user, null);
  assert.deepEqual(anonymous.permissions, []);
  assert.match(anonymous.previewSessionToken, /^np1_[a-f0-9]{64}$/);
  assert.ok(anonymous.previewSessionExpiresAt > Date.now());
  assert.ok(
    anonymous.previewSessionExpiresAt < Date.now() + 4 * 60 * 60 * 1000 + 1000,
  );
  const r = await call(anonymous, "/admin/orders");
  assert.equal(r.status, 401);
  const bad = await call(anonymous, "/auth/owner/login", "POST", {
    email: "owner@preview-test.example",
    password: "WrongPassword",
  });
  assert.equal(bad.status, 401);
});
test("Owner password login rotates token; old anonymous token is invalidated", async () => {
  const r = await call(anonymous, "/auth/owner/login", "POST", {
    email: "owner@preview-test.example",
    password: "PreviewOwner!2026",
    role: "owner",
  });
  assert.equal(r.status, 200);
  owner = r.data;
  assert.equal(owner.user.role, "owner");
  assert.notEqual(owner.previewSessionToken, anonymous.previewSessionToken);
  assert.equal(r.headers.get("set-cookie"), null);
  assert.equal((await call(anonymous, "/admin/orders")).status, 401);
  assert.equal((await call(owner, "/admin/orders")).status, 200);
});
test("Cookie-independent mutations still require the session’s CSRF token", async () => {
  const before = (await call(owner, "/admin/settings")).data;
  const bad = await call(
    owner,
    "/admin/settings",
    "POST",
    { ...before, storeName: "NOT ALLOWED" },
    "forged",
  );
  assert.equal(bad.status, 403);
  assert.equal(bad.data.code, "CSRF_MISMATCH");
  assert.equal(
    (await call(owner, "/admin/settings")).data.storeName,
    before.storeName,
  );
  const good = await call(owner, "/admin/settings", "POST", {
    ...before,
    storeName: "Preview Regression Store",
  });
  assert.equal(good.status, 200);
  assert.equal(
    (await call(owner, "/admin/settings")).data.storeName,
    "Preview Regression Store",
  );
});
test("Customer registration and client-supplied role claims cannot elevate privileges", async () => {
  const guest = await start();
  const r = await call(guest, "/auth/register", "POST", {
    name: "Preview Customer",
    email: "customer@preview-test.example",
    password: "PreviewCustomer!2026",
    role: "owner",
  });
  assert.equal(r.status, 200);
  customer = r.data;
  assert.equal(customer.user.role, "customer");
  assert.deepEqual(customer.permissions, []);
  assert.equal((await call(customer, "/admin/orders")).status, 403);
  assert.equal(
    (await call(customer, "/admin/settings", "POST", {})).status,
    403,
  );
  assert.equal((await call(customer, "/admin/upload", "POST", {})).status, 403);
  assert.equal((await call(customer, "/account")).status, 200);
});
test("Unknown/tampered tokens fail even on correctly formed owner requests", async () => {
  const token = "np1_" + "0".repeat(64);
  const bad = await post("/preview/request", {
    sessionToken: token,
    csrfToken: owner.csrf,
    path: "/admin/settings",
    method: "GET",
  });
  assert.equal(bad.status, 401);
  assert.equal(bad.data.code, "PREVIEW_SESSION_EXPIRED");
});
test("Transport cannot dispatch URLs, files, traversal, nested transports or arbitrary methods", async () => {
  for (const path of [
    "https://example.com/",
    "/../data/nocte.sqlite",
    "/server/index.js",
    "/preview/request",
    "/admin/products?__proto__=bad",
    "/api/admin/orders",
  ]) {
    assert.equal((await call(owner, path)).status, 400, path);
  }
  assert.equal((await call(owner, "/admin/orders", "CONNECT")).status, 400);
});
test("Server price checks still apply to checkout requests transported in JSON", async () => {
  const q = await call(customer, "/checkout/quote", "POST", {
    items: [
      {
        productId: "hybrid",
        size: "Queen",
        thickness: "8",
        firmness: "Medium",
        quantity: 1,
        price: 1,
      },
    ],
    coupon: "REST10",
  });
  assert.equal(q.status, 200);
  assert.equal(q.data.subtotal, 24999);
  assert.equal(q.data.total, 22499);
});
test("Fallback image routing retains authorization, decoding and file-path restrictions", async () => {
  const malformed = {
    sessionToken: owner.previewSessionToken,
    csrfToken: owner.csrf,
    path: "/admin/upload",
    method: "POST",
    image: {
      type: "image/png",
      base64: Buffer.from("not an image").toString("base64"),
    },
  };
  assert.equal((await post("/preview/request", malformed)).status, 400);
  assert.equal(
    (await post("/preview/request", { ...malformed, path: "/admin/settings" }))
      .status,
    400,
  );
  assert.equal(
    (
      await post("/preview/request", {
        ...malformed,
        sessionToken: customer.previewSessionToken,
        csrfToken: customer.csrf,
      })
    ).status,
    403,
  );
});
test("Logout revokes the exact preview token; neither customer nor owner token can be replayed", async () => {
  for (const s of [customer, owner]) {
    const r = await call(s, "/auth/logout", "POST");
    assert.equal(r.status, 200);
    assert.equal(r.data.previewSessionEnded, true);
    assert.equal((await call(s, "/account")).status, 401);
  }
});
