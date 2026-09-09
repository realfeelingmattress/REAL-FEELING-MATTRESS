import { createHash } from "node:crypto";
import { db } from "./db.js";
const hash = (value) => createHash("sha256").update(value).digest("hex");
// Atomic shared counters: all Vercel instances see the same limits. Raw emails
// and IPs are not stored in the counter keys. Expiry is enforced on every read.
export async function takeRate(key, limit, window = 60000) {
  const now = Date.now(),
    id = hash(key + ":" + Math.floor(now / window));
  const row = await db
    .prepare(
      "INSERT INTO rate_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=rate_limits.count+1 RETURNING count",
    )
    .get(id, now + window);
  return row.count <= limit;
}
export async function loginBlocked(key) {
  const r = await db
    .prepare("SELECT count,expires FROM login_limits WHERE id=?")
    .get(hash(key));
  return Boolean(r && r.expires > Date.now() && r.count >= 5);
}
export async function loginFailed(key) {
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO login_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN login_limits.expires<? THEN 1 ELSE login_limits.count+1 END,expires=CASE WHEN login_limits.expires<? THEN ? ELSE login_limits.expires END",
    )
    .run(hash(key), now + 900000, now, now, now + 900000);
}
export async function loginSucceeded(key) {
  await db.prepare("DELETE FROM login_limits WHERE id=?").run(hash(key));
}
export async function pruneExpired() {
  const now = Date.now();
  for (const table of [
    "sessions",
    "rate_limits",
    "login_limits",
    "google_challenges",
    "product_drafts",
  ])
    await db.prepare(`DELETE FROM ${table} WHERE expires<?`).run(now);
}
