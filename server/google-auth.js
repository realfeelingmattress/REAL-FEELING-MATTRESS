import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, uid } from "./db.js";
import { createGoogleVerifier } from "./google-identity.js";
export const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
export const googleConfigured =
  /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(googleClientId);
const verify = createGoogleVerifier(googleClientId);
const hash = (s) => createHash("sha256").update(s).digest("hex");
export function registerGoogleAuth(app, { signIn, audit }) {
  const available = (req, res, next) =>
    googleConfigured
      ? next()
      : res.status(503).json({
          code: "GOOGLE_NOT_CONFIGURED",
          error:
            "Google sign-in is not connected yet. Please use email and password.",
        });
  app.post("/api/auth/google/challenge", available, async (req, res) => {
    const { purpose } = z
      .object({
        purpose: z.enum(["login", "link"]).default("login"),
      })
      .parse(req.body);
    if (purpose === "link" && req.user?.role !== "customer")
      return res.status(403).json({
        error: "Sign in to your customer account first.",
      });
    const nonce = randomBytes(32).toString("hex");
    await db
      .prepare("DELETE FROM google_challenges WHERE expires<? OR session_id=?")
      .run(Date.now(), req.session.id);
    await db
      .prepare("INSERT INTO google_challenges VALUES(?,?,?,?)")
      .run(hash(nonce), req.session.id, purpose, Date.now() + 5 * 60 * 1000);
    res.json({
      nonce,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  });
  app.post("/api/auth/google", available, async (req, res) => {
    const b = z
      .object({
        credential: z.string().min(50).max(16000),
        nonce: z.string().regex(/^[a-f0-9]{64}$/),
        purpose: z.enum(["login", "link"]).default("login"),
        password: z.string().max(128).optional(),
      })
      .parse(req.body);
    const challenge = await db
      .prepare(
        "SELECT * FROM google_challenges WHERE nonce_hash=? AND session_id=? AND expires>? AND purpose=?",
      )
      .get(hash(b.nonce), req.session.id, Date.now(), b.purpose);
    if (!challenge)
      return res.status(400).json({
        error: "This Google sign-in request expired. Please try again.",
      });
    let identity;
    try {
      identity = await verify(b.credential, b.nonce);
    } catch {
      return res.status(401).json({
        error: "Google could not verify this sign-in. Please try again.",
      });
    }
    // Atomic single-use challenge consumption also defeats concurrent replay.
    if (
      (
        await db
          .prepare(
            "DELETE FROM google_challenges WHERE nonce_hash=? AND session_id=? AND expires>?",
          )
          .run(hash(b.nonce), req.session.id, Date.now())
      ).changes !== 1
    )
      return res.status(401).json({
        error: "This sign-in request has already been used. Try again.",
      });
    let u = await db
      .prepare("SELECT * FROM users WHERE google_sub=?")
      .get(identity.subject);
    if (u && u.role !== "customer")
      return res.status(403).json({
        error: "Google sign-in is available for customer accounts only.",
      });
    if (b.purpose === "link") {
      const existing =
        req.user &&
        (await db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id));
      if (!existing || existing.role !== "customer")
        return res.status(403).json({
          error: "Sign in to your customer account first.",
        });
      if (existing.google_sub || (u && u.id !== existing.id))
        return res.status(409).json({
          error: "This Google account is already connected.",
        });
      if (existing.email !== identity.email)
        return res.status(409).json({
          error:
            "Choose the Google account with the same email as your customer account.",
        });
      if (!b.password || !(await bcrypt.compare(b.password, existing.password)))
        return res.status(401).json({
          error: "Confirm your current account password to connect Google.",
        });
      await db
        .prepare("UPDATE users SET google_sub=?,avatar=?,name=? WHERE id=?")
        .run(identity.subject, identity.avatar, identity.name, existing.id);
      u = await db.prepare("SELECT * FROM users WHERE id=?").get(existing.id);
    } else if (!u) {
      if (
        await db
          .prepare("SELECT id FROM users WHERE email=?")
          .get(identity.email)
      )
        return res.status(409).json({
          code: "GOOGLE_ACCOUNT_EXISTS",
          error:
            "An account already uses this email. Sign in with your password, then connect Google in Profile & security.",
        });
      const id = uid(),
        password = await bcrypt.hash(randomBytes(48).toString("hex"), 12);
      // No client role is ever copied. Google registrations are customers only.
      try {
        await db
          .prepare(
            "INSERT INTO users(id,name,email,password,role,avatar,google_sub,google_only) VALUES(?,?,?,?,?,?,?,1)",
          )
          .run(
            id,
            identity.name,
            identity.email,
            password,
            "customer",
            identity.avatar,
            identity.subject,
          );
      } catch {
        return res.status(409).json({
          error: "An account already exists. Please try signing in again.",
        });
      }
      u = await db.prepare("SELECT * FROM users WHERE id=?").get(id);
    } else {
      await db
        .prepare("UPDATE users SET name=?,avatar=? WHERE id=?")
        .run(identity.name, identity.avatar, u.id);
      u = {
        ...u,
        name: identity.name,
        avatar: identity.avatar,
      };
    }
    await audit(
      {
        ...req,
        user: u,
      },
      b.purpose === "link"
        ? "Google account connected"
        : "Google customer sign-in",
      "Account",
    );
    await signIn(req, res, u);
  });
}
