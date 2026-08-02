# Production `.env` (on server: `Backend/.env`)

**Important:** `loadEnv.js` loads **`Backend/.env` only** — not `.env.production`.
Copy these values into the live server file `Backend/.env`. Editing `.env.production` locally does nothing on the server until you sync into `.env` and restart.

Set these values on the live server. **Do not** duplicate keys — the last value wins.

```env
NODE_ENV=production
PORT=5000

# Student Portal (do not use for Notes password-reset emails)
CLIENT_ORIGIN=https://studentportal.mentorsdaily.com
CLIENT_URL=https://studentportal.mentorsdaily.com
BASE_URL=https://studentportal.mentorsdaily.com
BACKEND_URL=https://studentportal.mentorsdaily.com

# Notes Website — password-reset emails use RESET_PASSWORD_URL first
NOTES_FRONTEND_URL=https://notes.mentorsdaily.com
NOTES_CLIENT_ORIGIN=https://notes.mentorsdaily.com
NOTES_CLIENT_URL=https://notes.mentorsdaily.com
RESET_PASSWORD_URL=https://notes.mentorsdaily.com/reset-password

GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=https://studentportal.mentorsdaily.com/api/auth/google/callback
```

Then restart (PM2 **must** use `--env production` so `NODE_ENV=production`):

```bash
cd /path/to/ASI24/Backend
npm install
pm2 delete asi24-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Or if already running:

```bash
pm2 restart asi24-backend --update-env
# or after git pull of the URL-builder fix:
pm2 restart asi24-backend
```

Verify logs show:

- `✅ .env loaded from: .../Backend/.env`
- After forgot-password: `[password-reset] email link host=https://notes.mentorsdaily.com/reset-password`
- `✅ Google OAuth credentials loaded`
- On first login: `✅ Google OAuth strategy registered, callback: https://studentportal.mentorsdaily.com/api/auth/google/callback`
