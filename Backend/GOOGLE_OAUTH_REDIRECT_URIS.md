# Google OAuth – Authorized redirect URIs

Add these **exact** URIs in Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID → **Authorized redirect URIs**.

Copy-paste (no trailing slash, no space):

```
http://localhost:5000/api/auth/google/callback
```

```
https://studentportal.mentorsdaily.com/api/auth/google/callback
```

**Important:** The path must be `/api/auth/google/callback` (with `api`).  
If you have `/auth/google/callback` (without `api`), replace it with the URIs above.

Save the client. Changes can take a few minutes to apply.
