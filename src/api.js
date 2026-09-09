// Cookie authentication remains the default. Some embedded preview proxies drop
// cookies (and sometimes custom headers) completely. Only when the demo server
// explicitly advertises support do we negotiate its isolated preview transport.
// Tokens never enter URLs or localStorage; sessionStorage is best-effort and
// falls back to memory when browser storage is unavailable.
const STORAGE_KEY = "nocte-isolated-preview-v1";
function readSavedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}
const saved = readSavedSession();
let usePreview = saved?.mode === "isolated-preview";
let previewToken =
  usePreview &&
  saved.expiresAt > Date.now() &&
  /^np1_[a-f0-9]{64}$/.test(saved.token || "")
    ? saved.token
    : "";
let previewExpiresAt = previewToken ? saved.expiresAt : 0;
let csrf = "";
let signedInUserId = null;
let previewAvailable = null;
let sessionRefresh = null;
let previewHandshake = null;

function persistSession() {
  try {
    if (!usePreview) sessionStorage.removeItem(STORAGE_KEY);
    else
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mode: "isolated-preview",
          token: previewToken,
          expiresAt: previewExpiresAt,
        }),
      );
  } catch {
    /* Memory-only operation still allows this page's login to work. */
  }
}
function captureSession(data) {
  if (Object.prototype.hasOwnProperty.call(data, "user"))
    signedInUserId = data.user?.id || null;
  if (data.csrf) csrf = data.csrf;
  if (typeof data.previewTransportAvailable === "boolean")
    previewAvailable = data.previewTransportAvailable;
  if (data.previewSessionToken) {
    usePreview = true;
    previewAvailable = true;
    previewToken = data.previewSessionToken;
    previewExpiresAt = data.previewSessionExpiresAt;
    persistSession();
  }
  if (data.previewSessionEnded) clearPreviewSession();
}
function clearPreviewSession(disable = false) {
  signedInUserId = null;
  previewToken = "";
  previewExpiresAt = 0;
  csrf = "";
  if (disable) {
    usePreview = false;
    previewAvailable = false;
  }
  persistSession();
}
function sessionExpired() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("nocte-session-expired"));
}
function responseError(response, data) {
  const error = new Error(
    data.error || "Unable to complete this request. Please try again.",
  );
  error.code = data.code;
  error.status = response.status;
  return error;
}
async function parseResponse(response) {
  try {
    return await response.json();
  } catch {
    throw new Error(
      "The server could not complete this request. Please try again.",
    );
  }
}
async function openPreviewSession() {
  if (!previewHandshake) {
    previewHandshake = (async () => {
      const response = await fetch("/api/preview/session", {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport: "isolated-preview" }),
      });
      const data = await parseResponse(response);
      if (!response.ok) throw responseError(response, data);
      captureSession(data);
      if (!previewToken || !csrf)
        throw new Error(
          "The preview could not start a session. Please try signing in again.",
        );
      return data;
    })().finally(() => {
      previewHandshake = null;
    });
  }
  return previewHandshake;
}
async function refreshSessionToken() {
  if (!sessionRefresh)
    sessionRefresh = api("/bootstrap").finally(() => {
      sessionRefresh = null;
    });
  return sessionRefresh;
}
async function encodeUpload(form) {
  const image = form.get("image");
  if (!(image instanceof Blob) || !image.size || image.size > 3 * 1024 * 1024)
    throw new Error("Choose an image smaller than 3 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type))
    throw new Error("Only JPEG, PNG and WebP images are supported.");
  const bytes = new Uint8Array(await image.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768)
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return { base64: btoa(binary), type: image.type };
}

export async function api(url, options = {}, retriedSession = false) {
  const method = (options.method || "GET").toUpperCase();
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (usePreview && !previewToken) await openPreviewSession();
  if (mutation && !csrf) await refreshSessionToken();
  const isForm = options.body instanceof FormData;
  let response;
  if (usePreview) {
    const envelope = {
      sessionToken: previewToken,
      csrfToken: csrf,
      path: url,
      method,
    };
    if (isForm) {
      envelope.image = await encodeUpload(options.body);
      envelope.payload = Object.fromEntries(
        [...options.body.entries()].filter(
          ([key, value]) => key !== "image" && typeof value === "string",
        ),
      );
    } else if (options.body !== undefined) envelope.payload = options.body;
    response = await fetch("/api/preview/request", {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      signal: options.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
  } else {
    response = await fetch("/api" + url, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(!isForm ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
        "x-csrf-token": csrf,
      },
      body: options.body
        ? isForm
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    });
  }
  const data = await parseResponse(response);
  captureSession(data);
  const staleSession =
    response.status === 403 &&
    (data.code === "CSRF_MISMATCH" ||
      data.error === "Your session changed. Refresh the page and try again.");
  if (staleSession && mutation && !retriedSession) {
    // A CSRF rejection occurs before the action handler. Only that rejection
    // can retry an action; ordinary permission, payment and network failures cannot.
    if (!usePreview && previewAvailable === true) {
      const wasSignedIn = Boolean(signedInUserId);
      await openPreviewSession();
      // Changing transports must not silently turn a customer's purchase or
      // account action into an anonymous action. Require reauthentication.
      if (
        wasSignedIn &&
        !["/auth/login", "/auth/owner/login", "/auth/register"].includes(url)
      ) {
        sessionExpired();
        throw new Error(
          "Please sign in again to continue in this privacy-restricted preview. Your action was not submitted.",
        );
      }
    } else await refreshSessionToken();
    return api(url, options, true);
  }
  if (data.code === "PREVIEW_TRANSPORT_DISABLED") {
    clearPreviewSession(true);
    if (!retriedSession) return api(url, options, true);
  }
  if (data.code === "PREVIEW_SESSION_EXPIRED") {
    clearPreviewSession();
    sessionExpired();
    if (
      !retriedSession &&
      ["/bootstrap", "/auth/login", "/auth/register"].includes(url)
    ) {
      await openPreviewSession();
      return api(url, options, true);
    }
  }
  if (!response.ok) {
    if (staleSession && retriedSession)
      data.error =
        "Your sign-in session could not be refreshed. Please try signing in again.";
    throw responseError(response, data);
  }
  return data;
}
