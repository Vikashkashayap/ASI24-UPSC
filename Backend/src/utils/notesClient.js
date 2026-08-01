/**
 * Detect Notes Website requests from Origin / Referer only.
 * Never trust req.body.source from the client.
 */

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
 * Base URL for Notes Website password-reset links.
 * Dev → http://localhost:3000 | Prod → https://notes.mentorsdaily.com
 */
export function getNotesFrontendOrigin() {
  if (process.env.NODE_ENV !== "production") {
    const localOverride = (
      process.env.NOTES_CLIENT_URL ||
      process.env.NOTES_CLIENT_ORIGIN ||
      ""
    )
      .trim()
      .replace(/\/$/, "");

    // Prefer explicit local Notes URL; otherwise default to Notes Website port
    if (localOverride && /localhost|127\.0\.0\.1/.test(localOverride)) {
      return localOverride;
    }
    return "http://localhost:3000";
  }

  const fromEnv = (
    process.env.NOTES_CLIENT_URL ||
    process.env.NOTES_CLIENT_ORIGIN ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  return fromEnv || "https://notes.mentorsdaily.com";
}
