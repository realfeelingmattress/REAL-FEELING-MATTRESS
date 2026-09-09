import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { db } from "./db.js";

// This transport is only registered for the demo. It does not weaken normal
// production cookie authentication. Tokens are opaque, short-lived, hashed at
// rest, and never grant a role without the ordinary password/RBAC checks.
export const PREVIEW_SESSION_TTL = 4 * 60 * 60 * 1000;
const tokenPattern = /^np1_[a-f0-9]{64}$/;
const hash = (token) => createHash("sha256").update(token).digest("hex");
export async function issuePreviewToken(sessionId) {
  const token = "np1_" + randomBytes(32).toString("hex");
  const expiresAt = Date.now() + PREVIEW_SESSION_TTL;
  await db.transaction(async () => {
    await db
      .prepare("UPDATE sessions SET expires=? WHERE id=?")
      .run(expiresAt, sessionId);
    await db
      .prepare("DELETE FROM preview_sessions WHERE session_id=?")
      .run(sessionId);
    await db
      .prepare(
        "INSERT INTO preview_sessions(token_hash,session_id) VALUES(?,?)",
      )
      .run(hash(token), sessionId);
  })();
  return {
    previewSessionToken: token,
    previewSessionExpiresAt: expiresAt,
  };
}
export async function resolvePreviewSession(token) {
  if (typeof token !== "string" || !tokenPattern.test(token)) return null;
  return (
    (await db
      .prepare(
        `SELECT s.* FROM preview_sessions p
    JOIN sessions s ON s.id=p.session_id
    WHERE p.token_hash=? AND s.expires>?`,
      )
      .get(hash(token), Date.now())) || null
  );
}
const envelopeSchema = z.object({
  sessionToken: z.string().regex(tokenPattern),
  csrfToken: z.string().max(100),
  // Only existing JSON APIs may be reached: no URLs, files, traversal, query
  // strings, protocol names or recursive access to the preview transport.
  path: z
    .string()
    .max(300)
    .regex(
      /^\/(?:bootstrap|products|auth|account|wishlist|checkout|tracking|support|reviews|admin)(?:\/[A-Za-z0-9_-]+)*$/,
    ),
  method: z.enum(["GET", "POST", "PATCH", "DELETE"]),
  payload: z.unknown().optional(),
  image: z
    .object({
      base64: z
        .string()
        .max(4194304)
        .regex(/^[A-Za-z0-9+/]*={0,2}$/),
      type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    })
    .optional(),
});
export function registerPreviewTransport(app, production) {
  app.post("/api/preview/session", async (req, res) => {
    if (production)
      return res.status(404).json({
        code: "PREVIEW_TRANSPORT_DISABLED",
        error: "Not found",
      });
    z.object({
      transport: z.literal("isolated-preview"),
    })
      .strict()
      .parse(req.body);
    // Always create an anonymous session. Never expose/adopt a signed-in
    // HttpOnly cookie or auto-log a visitor in as the demo owner.
    const id = randomBytes(32).toString("hex");
    const csrf = randomBytes(24).toString("hex");
    const credentials = await db.transaction(async () => {
      await db
        .prepare("INSERT INTO sessions(id,csrf,expires) VALUES(?,?,?)")
        .run(id, csrf, Date.now() + PREVIEW_SESSION_TTL);
      return await issuePreviewToken(id);
    })();
    res.json({
      ...credentials,
      csrf,
      user: null,
      permissions: [],
      demo: true,
    });
  });
  app.post("/api/preview/request", (req, res, next) => {
    if (production)
      return res.status(404).json({
        code: "PREVIEW_TRANSPORT_DISABLED",
        error: "Not found",
      });
    const envelope = envelopeSchema.parse(req.body);
    if (
      envelope.image &&
      (envelope.path !== "/admin/upload" || envelope.method !== "POST")
    ) {
      return res.status(400).json({
        error: "An image can only be sent to the product-image endpoint.",
      });
    }
    req.previewTransport = true;
    req.previewSessionToken = envelope.sessionToken;
    req.previewCsrf = envelope.csrfToken;
    // Express continues through exactly the same authentication, CSRF, RBAC,
    // ownership checks, validation, transactions and handlers as cookie requests.
    req.url = "/api" + envelope.path;
    req.method = envelope.method;
    req.body = envelope.payload || {};
    if (envelope.image) {
      const buffer = Buffer.from(envelope.image.base64, "base64");
      if (!buffer.length || buffer.length > 3 * 1024 * 1024)
        return res.status(400).json({
          error: "Choose an image smaller than 3 MB.",
        });
      req.file = {
        fieldname: "image",
        originalname: "preview-image",
        mimetype: envelope.image.type,
        size: buffer.length,
        buffer,
      };
    }
    next();
  });
}
