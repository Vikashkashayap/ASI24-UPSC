# Production `.env` (on server: `Backend/.env`)

Set these values on the live server. **Do not** duplicate keys — the last value wins.

```env
NODE_ENV=production
PORT=5000

CLIENT_ORIGIN=https://studentportal.mentorsdaily.com
BASE_URL=https://studentportal.mentorsdaily.com
BACKEND_URL=https://studentportal.mentorsdaily.com

GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=https://studentportal.mentorsdaily.com/api/auth/google/callback
```

Then restart:

```bash
cd /path/to/ASI24/Backend
npm install
pm2 delete asi24-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Verify logs show:

- `✅ .env loaded from: .../Backend/.env`
- `✅ Google OAuth credentials loaded`
- On first login: `✅ Google OAuth strategy registered, callback: https://studentportal.mentorsdaily.com/api/auth/google/callback`
