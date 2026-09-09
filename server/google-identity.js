import { createRemoteJWKSet, jwtVerify } from "jose";
// Only Google's published keys are trusted. Never accept a client-supplied
// subject, profile object, signing key, JWKS URL or unverified JWT payload.
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
  { timeoutDuration: 5000 },
);
export function createGoogleVerifier(clientId, keys = googleKeys) {
  return async (credential, nonce) => {
    const { payload } = await jwtVerify(credential, keys, {
      audience: clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      algorithms: ["RS256"],
      requiredClaims: ["sub", "iat", "exp", "nonce", "email"],
      maxTokenAge: "10m",
      clockTolerance: 5,
    });
    if (
      (payload.azp && payload.azp !== clientId) ||
      payload.nonce !== nonce ||
      payload.email_verified !== true ||
      typeof payload.email !== "string" ||
      payload.email.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) ||
      typeof payload.sub !== "string" ||
      payload.sub.length > 255
    )
      throw new Error("Invalid Google identity");
    let avatar = "";
    try {
      const u = new URL(payload.picture);
      if (
        u.protocol === "https:" &&
        /^lh[3-6]\.googleusercontent\.com$/.test(u.hostname) &&
        !u.username &&
        !u.password &&
        !u.port &&
        u.href.length < 2000
      )
        avatar = u.href;
    } catch {}
    return {
      subject: payload.sub,
      email: payload.email.toLowerCase(),
      name:
        (typeof payload.name === "string"
          ? payload.name
          : payload.email.split("@")[0]
        )
          .replace(/[\x00-\x1f\x7f]/g, "")
          .trim()
          .slice(0, 80) || "Customer",
      avatar,
    };
  };
}
