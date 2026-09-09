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
import sharp from "sharp";
const uploadedFiles = [];
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
          headers: Object.fromEntries(
            Object.entries({
              ...req.headers,
              "x-forwarded-proto": "https",
              "x-forwarded-host": req.headers.host,
            }).filter(
              ([key]) =>
                !["cookie", "authorization", "x-csrf-token"].includes(
                  key.toLowerCase(),
                ) && !key.toLowerCase().startsWith("x-nocte"),
            ),
          ),
        },
        (up) => {
          const headers = { ...up.headers };
          delete headers["set-cookie"];
          res.writeHead(up.statusCode, headers);
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
  const errors = [];
  page.on("pageerror", (e) => {
    if (e.message !== "WebSocket closed without opened.")
      errors.push(e.message);
  });
  const requests = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/preview/request")) {
      const envelope = r.postDataJSON();
      requests.push(envelope.method + " " + envelope.path);
    }
  });
  await page.goto("https://arena-parent.test:3443");
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("button", { name: "Use demo owner credentials" })
    .click();
  await frame
    .getByLabel("Password", { exact: true })
    .fill("WrongPassword!2026");
  await frame.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(frame.locator(".form-error")).toContainText(
    "Email or password is incorrect.",
    { timeout: 15000 },
  );
  log(
    "PASS: with cookies and custom auth/CSRF headers stripped, incorrect credentials are still rejected.",
  );
  await frame.getByLabel("Password", { exact: true }).fill("NocteDemo!2026");
  await frame.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(frame.locator(".admin-content h1")).toContainText(
    "A good day for better nights.",
    { timeout: 15000 },
  );
  assert.equal((await context.cookies()).length, 0);
  log(
    "PASS: owner login and protected dashboard work with ZERO cookies. No new tab needed.",
  );
  await page.reload();
  await expect(frame.locator(".admin-content h1")).toContainText(
    "A good day for better nights.",
  );
  const appFrame = () =>
    page.frames().find((f) => f.url().includes("session-test.e2b.app"));
  const saved = await appFrame().evaluate(() =>
    JSON.parse(sessionStorage.getItem("nocte-isolated-preview-v1")),
  );
  assert.match(saved.token, /^np1_[a-f0-9]{64}$/);
  const localTokens = await appFrame().evaluate(() =>
    Object.keys(localStorage).some((k) =>
      (localStorage.getItem(k) || "").includes("np1_"),
    ),
  );
  assert.equal(localTokens, false);
  log(
    "PASS: cookie-free session survives preview reload; no auth tokens are put in URLs or localStorage.",
  );
  await frame.getByRole("link", { name: "Settings", exact: true }).click();
  await frame
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(frame.getByRole("status")).toContainText(
    "Your store settings are saved.",
  );
  log(
    "PASS: authenticated, CSRF-protected owner mutation works through the same validated API handlers.",
  );
  await frame.getByRole("link", { name: "Products", exact: true }).click();
  await frame
    .locator(".admin-table tbody tr")
    .first()
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const uploadResponse = page.waitForResponse((r) => {
    if (!r.url().endsWith("/api/preview/request")) return false;
    return r.request().postDataJSON()?.path === "/admin/upload";
  });
  await frame.getByLabel("Upload Main product image").setInputFiles({
    name: "cookie-test.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 16, height: 16, channels: 3, background: "#354f42" },
    })
      .png()
      .toBuffer(),
  });
  const uploaded = await uploadResponse;
  const info = await uploaded.json();
  assert.equal(uploaded.status(), 200, JSON.stringify(info));
  assert.match(info.url, /^\/images\/product-the-essential-essential-[a-f0-9]+\.webp$/);
  uploadedFiles.push("public" + info.url);
  await expect(frame.getByRole("status")).toContainText("Image uploaded.");
  await frame
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  log(
    "PASS: product-image uploads still use validated decoding, size limits and re-encoding without cookies.",
  );
  const forged = await appFrame().evaluate(async () => {
    const s = JSON.parse(sessionStorage.getItem("nocte-isolated-preview-v1"));
    const r = await fetch("/api/preview/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: s.token,
        csrfToken: "forged",
        path: "/admin/settings",
        method: "POST",
        payload: {},
      }),
    });
    return { status: r.status, body: await r.json() };
  });
  assert.equal(forged.status, 403);
  assert.equal(forged.body.code, "CSRF_MISMATCH");
  log("PASS: malformed/forged CSRF is not bypassed by the fallback transport.");
  const tokenBeforeLogout = saved.token;
  await frame
    .getByRole("button", { name: "Sign out of owner account" })
    .click();
  await expect(
    frame.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  const oldSession = await appFrame().evaluate(async (token) => {
    const r = await fetch("/api/preview/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: token,
        csrfToken: "",
        path: "/admin/orders",
        method: "GET",
      }),
    });
    return r.status;
  }, tokenBeforeLogout);
  assert.equal(oldSession, 401);
  await page.reload();
  await expect(
    frame.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  log(
    "PASS: logout revokes the old token and reload does not silently sign the owner back in.",
  );
  assert.ok(requests.includes("POST /auth/owner/login"));
  assert.ok(requests.includes("GET /admin/dashboard"));
  assert.ok(requests.includes("POST /admin/settings"));
  assert.ok(requests.includes("POST /admin/upload"));
  assert.deepEqual(errors, []);

  // Also test the strongest privacy restrictions: neither cookies nor either
  // browser storage API is available. An in-memory session still works.
  const memory = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
  });
  await memory.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"])
      Object.defineProperty(window, name, {
        get() {
          throw new DOMException(
            "Storage disabled for regression test",
            "SecurityError",
          );
        },
      });
  });
  const mobile = await memory.newPage();
  const mobileErrors = [];
  mobile.on("pageerror", (e) => {
    if (e.message !== "WebSocket closed without opened.")
      mobileErrors.push(e.message);
  });
  await mobile.goto("https://arena-parent.test:3443");
  const mf = mobile.frameLocator("iframe");
  await mf.getByRole("button", { name: "Use demo owner credentials" }).click();
  await mf.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(mf.locator(".admin-content h1")).toContainText(
    "A good day for better nights.",
    { timeout: 15000 },
  );
  await mf.getByRole("button", { name: "Open owner navigation" }).click();
  await mf.getByRole("link", { name: "Orders", exact: true }).click();
  await expect(mf.locator(".admin-page-title h1")).toContainText("Orders");
  await expect(mf.locator(".admin-table tbody tr").first()).toBeVisible();
  assert.equal((await memory.cookies()).length, 0);
  assert.deepEqual(mobileErrors, []);
  log(
    "PASS: mobile owner login and navigation work even with cookies, sessionStorage and localStorage ALL blocked.",
  );
  await mf.getByRole("button", { name: "Open owner navigation" }).click();
  await mf.getByRole("button", { name: "Sign out of owner account" }).click();
  await expect(
    mf.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  log("PASS: memory-only logout also works.");
  const shopping = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
  });
  await shopping.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"])
      Object.defineProperty(window, name, {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
  });
  const shoppingPage = await shopping.newPage();
  await shoppingPage.goto("https://arena-parent.test:3443");
  const shoppingFrame = shoppingPage.frameLocator("iframe");
  await shoppingFrame
    .getByRole("link", { name: "Back to the storefront", exact: true })
    .click();
  await shoppingFrame
    .getByRole("button", { name: "Add The Essential to bag", exact: true })
    .click();
  await expect(shoppingFrame.getByRole("dialog")).toHaveAccessibleName(
    "Sign in to continue",
  );
  await shoppingFrame
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await shoppingFrame.getByLabel("Your name").fill("Private Preview Customer");
  await shoppingFrame
    .getByLabel("Email address", { exact: true })
    .fill("private" + Date.now() + "@example.com");
  await shoppingFrame
    .getByLabel("Password", { exact: true })
    .fill("PrivateCustomer!2026");
  await shoppingFrame
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  await expect(shoppingFrame.getByRole("dialog")).toHaveAccessibleName(
    "Your bag (1)",
  );
  await expect(shoppingFrame.getByRole("dialog")).toContainText(
    "The Essential",
  );
  await shoppingFrame
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await shoppingFrame
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await shoppingFrame.getByRole("combobox").fill("pillow");
  await shoppingFrame
    .getByRole("button", { name: "Explore all 1 match", exact: true })
    .click();
  await expect(shoppingFrame.locator(".product-card")).toHaveCount(1);
  assert.equal((await shopping.cookies()).length, 0);
  log(
    "PASS: customer registration resumes Add to bag, and search works, with ALL cookies and both storage APIs blocked.",
  );
  log("All cookie-independent preview regressions passed.");
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
  for (const file of uploadedFiles) {
    try {
      fs.unlinkSync(file);
    } catch {}
  }
  fs.writeFileSync(
    "qa/cookieless-preview-results.txt",
    lines.join("\n") + "\n",
  );
}
