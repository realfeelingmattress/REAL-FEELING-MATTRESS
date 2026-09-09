/**
 * A SameSite=Lax cookie is not sent from our cross-site embedded preview.
 * CHIPS keeps the HTTPS preview's HttpOnly session partitioned by its parent
 * site while SameSite=None permits it inside the frame. Normal deployments
 * retain Lax cookies; authentication and CSRF checks stay server-side.
 */
export function sessionCookieConfig(req, production = false) {
  const previewHost = /(?:^|\.)e2b\.app$/i.test(req.hostname || "");
  let previewReferrer = false;
  try {
    const referrer = new URL(req.get("referer") || "");
    previewReferrer =
      referrer.protocol === "https:" &&
      /(?:^|\.)e2b\.app$/i.test(referrer.hostname);
  } catch {
    // Referrer is optional. Never infer an insecure cookie from its absence.
  }
  const secure = Boolean(
    production || req.secure || previewHost || previewReferrer,
  );
  const embeddedPreview =
    previewHost || previewReferrer || (!production && secure);
  return {
    // Separate names avoid ambiguity with cookies from the previous Lax setup.
    name: embeddedPreview ? "nocte_preview_session" : "nocte_session",
    options: {
      httpOnly: true,
      secure,
      sameSite: embeddedPreview ? "none" : "lax",
      ...(embeddedPreview ? { partitioned: true } : {}),
      maxAge: 86400000 * 7,
      path: "/",
    },
  };
}
