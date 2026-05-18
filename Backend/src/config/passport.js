import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/authService.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

const CALLBACK_PATH = "/api/auth/google/callback";

// Backend URL
function getBackendBaseUrl(req) {
  const fromEnv = (
    process.env.BASE_URL ||
    process.env.BACKEND_URL ||
    ""
  ).replace(/\/$/, "");

  if (fromEnv) return fromEnv;

  if (req && req.protocol && req.get("host")) {
    return `${req.protocol}://${req.get("host")}`;
  }

  return "http://localhost:5000";
}

// Callback URL
function getCallbackUrl(req) {
  return `${getBackendBaseUrl(req)}${CALLBACK_PATH}`;
}

// Default callback
const DEFAULT_BASE_URL = (
  process.env.BASE_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

const CALLBACK_URL = `${DEFAULT_BASE_URL}${CALLBACK_PATH}`;

// Google Strategy
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
          const { user, token } =
            await findOrCreateGoogleUser(profile);

          return done(null, { user, token });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

// Google Login Start
export const googleAuth = (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res
      .status(503)
      .json({ message: "Google login is not configured" });
  }

  const callbackURL = getCallbackUrl(req);

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    callbackURL,
  })(req, res, next);
};

// Frontend URL
function getFrontendOrigin(req) {
  if (process.env.CLIENT_ORIGIN) {
    return process.env.CLIENT_ORIGIN.replace(/\/$/, "");
  }

  const base = getBackendBaseUrl(req);

  if (base && base !== "http://localhost:5000") {
    return base;
  }

  return CLIENT_ORIGIN;
}

// Google Callback
export const googleAuthCallback = (req, res, next) => {
  const callbackURL = getCallbackUrl(req);

  passport.authenticate(
    "google",
    {
      session: false,
      callbackURL,
    },
    (err, result) => {
      const origin = getFrontendOrigin(req);

      if (err) {
        const message = encodeURIComponent(
          err.message || "Google sign-in failed"
        );

        return res.redirect(
          `${origin}/login?error=${message}`
        );
      }

      if (!result || !result.token) {
        return res.redirect(
          `${origin}/login?error=no_token`
        );
      }

      return res.redirect(
        `${origin}/auth/callback?token=${encodeURIComponent(
          result.token
        )}`
      );
    }
  )(req, res, next);
};

export default passport;
