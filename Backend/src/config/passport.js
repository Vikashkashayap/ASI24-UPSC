import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/authService.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Single source of truth: must match exactly what is in Google Cloud Console
const BASE_URL = (process.env.BASE_URL || process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const CALLBACK_PATH = "/api/auth/google/callback";
const CALLBACK_URL = `${BASE_URL}${CALLBACK_PATH}`;

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
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    callbackURL: CALLBACK_URL,
  })(req, res, next);
};

export const googleAuthCallback = (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${CLIENT_ORIGIN}/login?error=google_not_configured`);
  }
  passport.authenticate("google", { session: false }, (err, result) => {
    if (err) {
      const message = encodeURIComponent(err.message || "Google sign-in failed");
      return res.redirect(`${CLIENT_ORIGIN}/login?error=${message}`);
    }
    if (!result || !result.token) {
      return res.redirect(`${CLIENT_ORIGIN}/login?error=no_token`);
    }
    const frontendCallback = `${CLIENT_ORIGIN}/auth/callback`;
    return res.redirect(`${frontendCallback}?token=${encodeURIComponent(result.token)}`);
  })(req, res);
};
