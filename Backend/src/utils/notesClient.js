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
 * Prefer stored user.source; fall back to request Origin/Referer; default notes
 * because the live forgot-password email flow is Notes Website.
 *
 * @param {import('express').Request | null | undefined} req
 * @param {{ source?: string } | null | undefined} user
 * @returns {"notes"|"portal"}
 */
export function resolvePasswordResetSource(req, user) {
  const stored = String(user?.source || "").trim().toLowerCase();
  if (stored === "notes" || stored === "portal") return stored;
  if (req && isNotesWebsiteRequest(req)) return "notes";
  // Default to notes: portal UI currently does not send reset emails.
  return "notes";
}

const NOTES_PROD_RESET_BASE = "https://notes.mentorsdaily.com/reset-password";

function isLocalhostHost(value) {
  return /localhost|127\.0\.0\.1/i.test(String(value || ""));
}

/**
 * Full password-reset URL embedded in the email.
 *
 * Notes:
 *   RESET_PASSWORD_URL  (preferred)  e.g. https://notes.mentorsdaily.com/reset-password
 *   else {NOTES_FRONTEND_URL|NOTES_CLIENT_*}/reset-password
 *   Never emails localhost when request/user is Notes (or NODE_ENV=production).
 *
 * Portal:
 *   PORTAL_RESET_PASSWORD_URL (preferred)
 *   else {STUDENT_PORTAL_URL|CLIENT_*}/reset-password
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

  // Safety net: live Notes users must never receive localhost links,
  // even if NOTES_* / RESET_PASSWORD_URL are mis-set on the server.
  const forceProdNotes =
    isLocalhostHost(base) &&
    (process.env.NODE_ENV === "production" ||
      (req && isNotesWebsiteRequest(req)) ||
      String(user?.source || "").toLowerCase() === "notes");

  if (forceProdNotes) {
    console.warn(
      "[password-reset] blocked localhost reset base; using notes.mentorsdaily.com"
    );
    base = NOTES_PROD_RESET_BASE;
  }

  return `${base}?token=${token}`;
}
