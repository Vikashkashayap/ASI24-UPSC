import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/authService.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const CALLBACK_PATH = "/api/auth/google/callback";

// Backend base URL: prefer env (BASE_URL/BACKEND_URL); on live without env, use request host so redirect goes to live URL
function getBackendBaseUrl(req) {
  const fromEnv = (process.env.BASE_URL || process.env.BACKEND_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (req && req.protocol && req.get("host")) {
    return `${req.protocol}://${req.get("host")}`;
  }
  return "http://localhost:5000";
}

function getCallbackUrl(req) {
  return `${getBackendBaseUrl(req)}${CALLBACK_PATH}`;
}

// Default for strategy (used when no per-request override)
const DEFAULT_BASE_URL = (process.env.BASE_URL || process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const CALLBACK_URL = `${DEFAULT_BASE_URL}${CALLBACK_PATH}`;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { user, token } = await findOrCreateGoogleUser(profile);
          done(null, { user, token });
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}

export const googleAuth = (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ message: "Google login is not configured" });
  }
  const callbackURL = getCallbackUrl(req);
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    callbackURL,
  })(req, res, next);
};

function getFrontendOrigin(req) {
  if (process.env.CLIENT_ORIGIN) return process.env.CLIENT_ORIGIN.replace(/\/$/, "");
  const base = getBackendBaseUrl(req);
  if (base && base !== "http://localhost:5000") return base; // same host for frontend on live
  return CLIENT_ORIGIN;
}

export const googleAuthCallback = (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${getFrontendOrigin(req)}/login?error=google_not_configured`);
  }
  const callbackURL = getCallbackUrl(req);
  const origin = getFrontendOrigin(req);
  passport.authenticate("google", { session: false, callbackURL }, (err, result) => {
    if (err) {
      const message = encodeURIComponent(err.message || "Google sign-in failed");
      return res.redirect(`${origin}/login?error=${message}`);
    }
    if (!result || !result.token) {
      return res.redirect(`${origin}/login?error=no_token`);
    }
    const frontendCallback = `${origin}/auth/callback`;
    return res.redirect(`${frontendCallback}?token=${encodeURIComponent(result.token)}`);
  })(req, res);
};
