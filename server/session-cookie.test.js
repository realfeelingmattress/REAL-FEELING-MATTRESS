import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionCookieConfig } from "./session-cookie.js";
const request = (hostname, secure = false, referer = "") => ({
  hostname,
  secure,
  get: (key) => (key === "referer" ? referer : undefined),
});
test("HTTPS embedded preview uses Secure HttpOnly partitioned SameSite=None cookie", () => {
  const c = sessionCookieConfig(request("3000-example.e2b.app", true));
  assert.equal(c.name, "nocte_preview_session");
  assert.equal(c.options.sameSite, "none");
  assert.equal(c.options.secure, true);
  assert.equal(c.options.httpOnly, true);
  assert.equal(c.options.partitioned, true);
  assert.equal(c.options.path, "/");
});
test("TLS-terminating preview proxy still gets a Secure cookie", () => {
  const c = sessionCookieConfig(request("3000-example.e2b.app", false));
  assert.equal(c.options.secure, true);
  assert.equal(c.options.partitioned, true);
});
test("HTTPS preview referrer works when a proxy rewrites the host", () => {
  const c = sessionCookieConfig(
    request("localhost", false, "https://3000-example.e2b.app/owner"),
  );
  assert.equal(c.options.secure, true);
  assert.equal(c.options.sameSite, "none");
});
test("Local HTTP development keeps Lax non-Secure cookies", () => {
  const c = sessionCookieConfig(request("localhost"));
  assert.equal(c.name, "nocte_session");
  assert.equal(c.options.secure, false);
  assert.equal(c.options.sameSite, "lax");
  assert.equal(c.options.partitioned, undefined);
});
test("Ordinary production hosts retain Secure Lax HttpOnly cookies", () => {
  const c = sessionCookieConfig(request("shop.example.com", true), true);
  assert.equal(c.name, "nocte_session");
  assert.equal(c.options.secure, true);
  assert.equal(c.options.sameSite, "lax");
  assert.equal(c.options.httpOnly, true);
  assert.equal(c.options.partitioned, undefined);
});
test("Lookalike preview hosts are not treated as the trusted preview domain", () => {
  const c = sessionCookieConfig(
    request(
      "e2b.app.attacker.example",
      false,
      "https://e2b.app.attacker.example/",
    ),
  );
  assert.equal(c.name, "nocte_session");
  assert.equal(c.options.sameSite, "lax");
});
