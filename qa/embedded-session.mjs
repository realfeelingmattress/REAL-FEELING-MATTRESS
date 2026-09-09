// One-shot browser regression: run the real application inside a different-site
// HTTPS iframe, with Chromium's third-party-cookie phase-out enabled.
import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nocte-cookie-check-"));
let server, browser;
const lines = [];
const log = (s) => {
  lines.push(s);
  console.log(s);
};
try {
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      temp + "/key.pem",
      "-out",
      temp + "/cert.pem",
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
    ],
    { stdio: "ignore" },
  );
  server = https.createServer(
    {
      key: fs.readFileSync(temp + "/key.pem"),
      cert: fs.readFileSync(temp + "/cert.pem"),
    },
    (req, res) => {
      if (req.headers.host?.startsWith("arena-parent.test")) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          '<!doctype html><html><body style="margin:0"><iframe title="Store preview" src="https://3000-session-test.e2b.app:3443/owner" style="width:100vw;height:100vh;border:0"></iframe></body></html>',
        );
        return;
      }
      const proxy = http.request(
        {
          hostname: "127.0.0.1",
          port: Number(process.env.TEST_PORT||3000),
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            "x-forwarded-proto": "https",
            "x-forwarded-host": req.headers.host,
          },
        },
        (up) => {
          res.writeHead(up.statusCode, up.headers);
          up.pipe(res);
        },
      );
      proxy.on("error", () => {
        res.writeHead(502);
        res.end("Test proxy unavailable");
      });
      req.pipe(proxy);
    },
  );
  await new Promise((resolve) => server.listen(3443, "127.0.0.1", resolve));
  browser = await chromium.launch({
    args: [
      "--no-proxy-server",
      "--host-resolver-rules=MAP arena-parent.test 127.0.0.1, MAP 3000-session-test.e2b.app 127.0.0.1",
      "--test-third-party-cookie-phaseout",
    ],
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();
  await page.goto("https://arena-parent.test:3443");
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("button", { name: "Use demo owner credentials" })
    .click();
  await frame.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(frame.locator(".admin-content h1")).toContainText(
    "A good day for better nights.",
    { timeout: 15000 },
  );
  log("PASS: owner sign-in succeeds inside a cross-site HTTPS iframe.");
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "nocte_preview_session");
  assert.ok(session);
  assert.ok(session.httpOnly);
  assert.ok(session.secure);
  assert.equal(session.sameSite, "None");
  assert.ok(session.partitionKey);
  log(
    "PASS: browser stores an HttpOnly Secure SameSite=None session partitioned by the parent site.",
  );
  await page.reload();
  await expect(frame.locator(".admin-content h1")).toContainText(
    "A good day for better nights.",
  );
  log("PASS: authenticated session survives reloading the embedded preview.");
  await frame
    .getByRole("button", { name: "Sign out of owner account" })
    .click();
  await expect(
    frame.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await frame
    .getByRole("button", { name: "Use demo owner credentials" })
    .click();
  // Make the in-memory CSRF token stale while keeping the login form intact.
  await context.clearCookies();
  const loginStatuses = [];
  const listener = (r) => {
    if (
      r.url().endsWith("/api/auth/owner/login") ||
      (r.url().endsWith("/api/preview/request") &&
        r.request().postDataJSON()?.path === "/auth/owner/login")
    )
      loginStatuses.push(r.status());
  };
  page.on("response", listener);
  await frame.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(frame.locator(".admin-content h1")).toContainText(
    "A good day for better nights.",
    { timeout: 15000 },
  );
  page.off("response", listener);
  assert.deepEqual(loginStatuses, [403, 200]);
  log(
    "PASS: stale login token is refreshed automatically, then login is retried once (403 → 200).",
  );
  const appFrame = page
    .frames()
    .find((f) => f.url().includes("session-test.e2b.app"));
  const forged = await appFrame.evaluate(async () => {
    const r = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": "forged" },
    });
    return { status: r.status, body: await r.json() };
  });
  assert.equal(forged.status, 403);
  assert.equal(forged.body.code, "CSRF_MISMATCH");
  const stillSignedIn = await appFrame.evaluate(async () => {
    const { api } = await import("/src/api.js");
    await api("/admin/orders");
    return 200;
  });
  assert.equal(stillSignedIn, 200);
  log(
    "PASS: forged CSRF tokens remain blocked and cannot log out the current user.",
  );
  await frame
    .getByRole("button", { name: "Sign out of owner account" })
    .click();
  const remaining = (await context.cookies()).find(
    (c) => c.name === "nocte_preview_session",
  );
  // Provider refresh creates a new anonymous cookie after logout. Verify the
  // account is gone server-side, rather than requiring all cookies to be absent.
  const state = await appFrame.evaluate(async () => {
    const { api } = await import("/src/api.js");
    return (await api("/bootstrap")).user;
  });
  assert.equal(state, null);
  log("PASS: logout revokes the authenticated partitioned session.");
  log("All embedded-session browser regressions passed.");
} catch (e) {
  log("FAIL: " + e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  fs.rmSync(temp, { recursive: true, force: true });
  fs.writeFileSync("qa/embedded-session-results.txt", lines.join("\n") + "\n");
}
