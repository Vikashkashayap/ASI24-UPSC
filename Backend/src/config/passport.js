import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/authService.js";
import { getFrontendOrigin, getGoogleCallbackUrl } from "./urlConfig.js";

let googleStrategyRegistered = false;

function getGoogleCredentials() {
  return {
    clientID: (process.env.GOOGLE_CLIENT_ID || "").trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
  };
}

export function isGoogleOAuthConfigured() {
  const { clientID, clientSecret } = getGoogleCredentials();
  return Boolean(clientID && clientSecret);
}

/**
 * Register the Google strategy once env vars are available.
 * Safe to call on every OAuth request (no-op after first registration).
 */
export function ensureGoogleStrategy(req) {
  if (googleStrategyRegistered) return true;

  const { clientID, clientSecret } = getGoogleCredentials();
  if (!clientID || !clientSecret) {
    return false;
  }

  const callbackURL = getGoogleCallbackUrl(req);

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const { user, token } = await findOrCreateGoogleUser(profile);
          return done(null, { user, token });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  googleStrategyRegistered = true;
  console.log("✅ Google OAuth strategy registered, callback:", callbackURL);
  return true;
}

export const googleAuth = (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res
      .status(503)
      .json({ message: "Google login is not configured" });
  }

  if (!ensureGoogleStrategy(req)) {
    return res
      .status(503)
      .json({ message: "Google login is not configured" });
  }

  const callbackURL = getGoogleCallbackUrl(req);

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    callbackURL,
  })(req, res, next);
};

export const googleAuthCallback = (req, res, next) => {
  if (!isGoogleOAuthConfigured() || !ensureGoogleStrategy(req)) {
    const origin = getFrontendOrigin(req);
    return res.redirect(
      `${origin}/login?error=${encodeURIComponent("Google login is not configured")}`
    );
  }

  const callbackURL = getGoogleCallbackUrl(req);

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
        return res.redirect(`${origin}/login?error=${message}`);
      }

      if (!result?.token) {
        return res.redirect(`${origin}/login?error=no_token`);
      }

      return res.redirect(
        `${origin}/auth/callback?token=${encodeURIComponent(result.token)}`
      );
    }
  )(req, res, next);
};

export default passport;
