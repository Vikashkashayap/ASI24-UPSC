const rawFrontendOrigin = (
  process.env.CLIENT_ORIGIN ||
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

const rawBackendOrigin = (
  process.env.BASE_URL ||
  process.env.BACKEND_URL ||
  process.env.SERVER_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

const rawGoogleCallbackUrl = (process.env.GOOGLE_CALLBACK_URL || "").trim().replace(/\/$/, "");

export const FRONTEND_URL = rawFrontendOrigin;
export const BACKEND_URL = rawBackendOrigin;
export const GOOGLE_CALLBACK_URL = rawGoogleCallbackUrl;

const devFallbackFrontend = process.env.NODE_ENV !== "production" ? "http://localhost:5173" : "";
const devFallbackBackend = process.env.NODE_ENV !== "production" ? "http://localhost:5000" : "";

export function getBackendBaseUrl(req) {
  if (BACKEND_URL) {
    return BACKEND_URL;
  }

  if (req?.protocol && req.get?.("host")) {
    return `${req.protocol}://${req.get("host")}`;
  }

  return devFallbackBackend || "";
}

export function getFrontendOrigin(req) {
  if (FRONTEND_URL) {
    return FRONTEND_URL;
  }

  if (req?.protocol && req.get?.("host")) {
    const backendUrl = getBackendBaseUrl(req);
    if (backendUrl) {
      return backendUrl;
    }
  }

  return devFallbackFrontend || "";
}

export function getGoogleCallbackUrl(req) {
  if (GOOGLE_CALLBACK_URL) {
    return GOOGLE_CALLBACK_URL;
  }

  return `${getBackendBaseUrl(req)}/api/auth/google/callback`;
}
