import { test, before } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT } from "jose";
import { createGoogleVerifier } from "./google-identity.js";
let pair, verify;
const client = "123456789-example.apps.googleusercontent.com",
  nonce = "a".repeat(64);
before(async () => {
  pair = await generateKeyPair("RS256");
  verify = createGoogleVerifier(client, pair.publicKey);
});
const token = async (claims = {}, opts = {}) =>
  new SignJWT({
    sub: "google-subject-123",
    email: "shopper@gmail.com",
    email_verified: true,
    name: "A Real Customer",
    nonce,
    picture: "https://lh3.googleusercontent.com/a/photo",
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setIssuer(opts.iss || "https://accounts.google.com")
    .setAudience(opts.aud || client)
    .setExpirationTime(opts.exp || "5m")
    .sign(pair.privateKey);
test("Verified Google identity includes only checked subject, email, name and safe profile image", async () => {
  const p = await verify(await token({ role: "owner" }), nonce);
  assert.equal(p.name, "A Real Customer");
  assert.equal(p.email, "shopper@gmail.com");
  assert.equal(p.subject, "google-subject-123");
  assert.equal(p.role, undefined);
  assert.match(p.avatar, /^https:\/\/lh3\.googleusercontent\.com/);
});
test("Wrong audience, issuer, nonce, expiry and unverified email are rejected", async () => {
  for (const [claims, opts, expectedNonce] of [
    [{}, { aud: "another-client" }, nonce],
    [{}, { iss: "https://attacker.example" }, nonce],
    [{}, {}, "wrong-nonce"],
    [{}, { exp: "-1m" }, nonce],
    [{ email_verified: false }, {}, nonce],
    [{ azp: "untrusted-client" }, {}, nonce],
  ])
    await assert.rejects(() =>
      token(claims, opts).then((t) => verify(t, expectedNonce)),
    );
});
test("Unsigned, tampered and attacker-signed Google credentials are rejected", async () => {
  await assert.rejects(() => verify("eyJhbGciOiJub25lIn0.e30.", nonce));
  const other = await generateKeyPair("RS256");
  const forged = await new SignJWT({
    sub: "owner",
    nonce,
    email: "owner@test.example",
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setAudience(client)
    .setIssuer("https://accounts.google.com")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(other.privateKey);
  await assert.rejects(() => verify(forged, nonce));
});
test("Google picture URLs cannot inject scripts, arbitrary remote hosts or local network URLs", async () => {
  for (const picture of [
    "javascript:alert(1)",
    "http://127.0.0.1/private",
    "https://attacker.example/a",
    "https://lh3.googleusercontent.com.attacker.example/a",
  ])
    assert.equal((await verify(await token({ picture }), nonce)).avatar, "");
});
