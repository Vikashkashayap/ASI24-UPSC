/**
 * Detect Notes Website requests from Origin / Referer only.
 * Never trust req.body.source from the client.
 */

function stripTrailingSlash(value) {
  return String(value || "")
    .trim()
    .replace(/\/$/, "");
}

function firstConfigured(...values) {
  for (const value of values) {
    const cleaned = stripTrailingSlash(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return `${url.protocol}//${url.host}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return String(value).replace(/\/$/, "").toLowerCase();
  }
}

function notesAllowedOrigins() {
  const fromEnv = [
    process.env.NOTES_FRONTEND_URL,
    process.env.NOTES_CLIENT_ORIGIN,
    process.env.NOTES_CLIENT_URL,
  ]
    .filter(Boolean)
    .map((o) => normalizeOrigin(o))
    .filter(Boolean);

  const defaults = [
    "https://notes.mentorsdaily.com",
    "http://notes.mentorsdaily.com",
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  return new Set([...fromEnv, ...defaults]);
}

/**
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function isNotesWebsiteRequest(req) {
  const allowed = notesAllowedOrigins();
  const candidates = [req.headers?.origin, req.headers?.referer].filter(Boolean);

  for (const raw of candidates) {
    const origin = normalizeOrigin(raw);
    if (!origin) continue;
    if (allowed.has(origin)) return true;
    try {
      const host = new URL(origin).hostname.toLowerCase();
      if (host === "notes.mentorsdaily.com" || host.endsWith(".notes.mentorsdaily.com")) {
        return true;
      }
    } catch {
      /* ignore */
    }
  }

  return false;
}

/**
 * Forced registration source — ignores client body.source.
 * @param {import('express').Request} req
 * @returns {"notes"|"portal"}
 */
export function resolveRegistrationSource(req) {
  return isNotesWebsiteRequest(req) ? "notes" : "portal";
}

/**
 * Base URL for Notes Website (OAuth redirect, CORS, reset-link fallback).
 * Honors env in every NODE_ENV — never ignore a configured production URL
 * just because the process is not marked production.
 */
export function getNotesFrontendOrigin() {
  const fromEnv = firstConfigured(
    process.env.NOTES_FRONTEND_URL,
    process.env.NOTES_CLIENT_URL,
    process.env.NOTES_CLIENT_ORIGIN
  );
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "production"
    ? "https://notes.mentorsdaily.com"
    : "http://localhost:3000";
}

/**
 * Student Portal frontend origin (does not affect Notes reset links).
 */
export function getPortalFrontendOrigin() {
  const fromEnv = firstConfigured(
    process.env.STUDENT_PORTAL_URL,
    process.env.CLIENT_ORIGIN,
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL
  );
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "production"
    ? "https://studentportal.mentorsdaily.com"
    : "http://localhost:5173";
}

/**
 * Resolve which product owns this password-reset email.
 * Prefer where the user clicked "Forgot password" (Origin/Referer) over
 * stored user.source — a portal-sourced account resetting from Notes must
 * still land on notes.mentorsdaily.com/reset-password.
 *
 * @param {import('express').Request | null | undefined} req
 * @param {{ source?: string } | null | undefined} user
 * @returns {"notes"|"portal"}
 */
export function resolvePasswordResetSource(req, user) {
  // 1) Request came from Notes Website → always Notes reset page
  if (req && isNotesWebsiteRequest(req)) return "notes";

  // 2) Request came from Student Portal origin → portal (if that flow exists)
  if (req && isPortalWebsiteRequest(req)) return "portal";

  // 3) Fall back to account source
  const stored = String(user?.source || "").trim().toLowerCase();
  if (stored === "notes" || stored === "portal") return stored;

  // 4) Default Notes — portal UI does not email token reset links today
  return "notes";
}

function isPortalWebsiteRequest(req) {
  const portalOrigin = normalizeOrigin(getPortalFrontendOrigin());
  const candidates = [req.headers?.origin, req.headers?.referer].filter(Boolean);
  for (const raw of candidates) {
    const origin = normalizeOrigin(raw);
    if (!origin) continue;
    if (portalOrigin && origin === portalOrigin) return true;
    try {
      const host = new URL(origin).hostname.toLowerCase();
      if (
        host === "studentportal.mentorsdaily.com" ||
        host.endsWith(".studentportal.mentorsdaily.com")
      ) {
        return true;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

const NOTES_PROD_RESET_BASE = "https://notes.mentorsdaily.com/reset-password";

function isLocalhostHost(value) {
  return /localhost|127\.0\.0\.1/i.test(String(value || ""));
}

/**
 * Full password-reset URL embedded in the email.
 *
 * Notes (forgot-password from notes.mentorsdaily.com):
 *   RESET_PASSWORD_URL  (preferred)
 *   else {NOTES_FRONTEND_URL|NOTES_CLIENT_*}/reset-password
 *
 * Portal (only when request Origin is the Student Portal):
 *   PORTAL_RESET_PASSWORD_URL or {CLIENT_*}/reset-password
 *
 * @param {import('express').Request | null | undefined} req
 * @param {string} rawToken
 * @param {{ source?: string } | null | undefined} user
 */
export function buildPasswordResetUrl(req, rawToken, user) {
  const token = encodeURIComponent(String(rawToken || ""));
  const source = resolvePasswordResetSource(req, user);

  if (source === "portal") {
    const dedicated = firstConfigured(process.env.PORTAL_RESET_PASSWORD_URL);
    const base = dedicated || `${getPortalFrontendOrigin()}/reset-password`;
    return `${base}?token=${token}`;
  }

  let base =
    firstConfigured(process.env.RESET_PASSWORD_URL) ||
    `${getNotesFrontendOrigin()}/reset-password`;

  // Never email localhost / studentportal for Notes reset flow
  if (isLocalhostHost(base) || /studentportal\.mentorsdaily\.com/i.test(base)) {
    console.warn(
      "[password-reset] correcting non-Notes reset base → notes.mentorsdaily.com"
    );
    base = NOTES_PROD_RESET_BASE;
  }

  return `${base}?token=${token}`;
}
