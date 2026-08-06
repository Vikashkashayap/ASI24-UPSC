# MD Student Portal — Play Store & Production Readiness Report

**App name:** MD Student Portal  
**Package / App ID:** `com.mentorsdaily.studentportal`  
**Version:** `1.0.0` (versionCode `1`)  
**Stack:** React + TypeScript + Tailwind + Capacitor 8 + Android  

---

## Branding applied

| Surface | Asset |
|--------|--------|
| Launcher / adaptive icon | Provided MentorsDaily Student “MD” icon (`resources/icon.png`) |
| Splash / open screen | MentorsDaily logo on navy `#0F1E3D` (`resources/splash.png`) |
| In-app / PWA | `public/brand/app-icon.png`, `public/brand/mentorsdaily-logo.png` |

---

## Modified / new areas

### Capacitor & Android
- `capacitor.config.ts` — app id, name, splash, status bar, keyboard, deep-link hosts
- `android/` — regenerated Capacitor 8 Android project
- Adaptive icons + splash densities generated via `@capacitor/assets`
- `AndroidManifest.xml` — INTERNET, NETWORK_STATE, POST_NOTIFICATIONS, deep links, FileProvider
- `network_security_config.xml` — cleartext disabled (pinning-ready)
- `values/strings.xml` — **MD Student Portal**
- `values/colors.xml` + `styles.xml` — navy status / nav bars, splash theme

### Native shell (Frontend)
- `src/native/*` — platform detection, boot, back button, deep links, file share/download
- `src/native/NativeAppProvider.tsx` — wired in `main.tsx`

### Offline architecture
- `src/offline/*` — cache envelopes, queue + retry flush, network provider
- `OfflineBanner` / `OfflineEmptyState`

### Security scaffolding
- `src/security/secureStorage.ts` — Preferences facade + biometric flags + pinning notes
- `src/security/session.ts` + API 401 → `md:session-expired` → login redirect

### Push / notifications
- `src/notifications/notificationService.ts` — center + register stub (needs `google-services.json`)

### Design system & PWA
- `src/design-system/tokens.ts`
- Dark mode CSS tokens + `useTheme` restored (class strategy)
- `public/manifest.webmanifest`, `public/sw.js`
- Error / skeleton UI: `src/components/system/ErrorState.tsx`

### Scripts (`package.json`)
- `cap:sync`, `cap:open`, `cap:assets`, `android:build`, `android:release`

---

## Performance already in place / reinforced

- Route-level `lazyPage` / `Suspense` across `App.tsx`
- Vite manual chunks (pdf, charts, motion, socket, icons, …)
- Relative `base: "./"` for Capacitor WebView
- Native splash hide after first paint (no white flash)
- Page enter transition class on `PageContainer`
- SW cache-first for static assets (web only; skipped in native)

---

## Play Store readiness checklist

| Item | Status |
|------|--------|
| App name MD Student Portal | Done |
| Adaptive icon | Done |
| Splash (MentorsDaily logo) | Done |
| versionName / versionCode | `1.0.0` / `1` |
| targetSdk 36 / minSdk 24 | Done |
| Permissions minimized | Done |
| AAB build path | `npm run android:release` (needs signing) |
| Signing config | Manual — see below |
| Privacy policy URL | Manual (Play Console) |
| Data safety form | Manual |
| Screenshots phone + tablet | Manual |
| Feature graphic | Manual |
| Content rating questionnaire | Manual |
| FCM / push (`google-services.json`) | Manual |
| App Links assetlinks.json | Manual on domain |
| iOS project | Ready to `npx cap add ios` later |

---

## Remaining manual steps

1. **JDK 21 + Android Studio** with SDK 36 installed.
2. Create upload keystore; add `android/keystore.properties` (do not commit); uncomment `signingConfigs` in `app/build.gradle`.
3. Place Firebase `android/app/google-services.json` for push.
4. Host `/.well-known/assetlinks.json` for `https://studentportal.mentorsdaily.com`.
5. Set production `VITE_API_URL` before `npm run android:build`.
6. Build AAB: `npm run android:release` → `android/app/build/outputs/bundle/release/app-release.aab`.
7. Upload to Play Console; complete Data safety, store listing, screenshots.
8. Optional: enable certificate pinning in `network_security_config.xml` + OkHttp when ready.
9. Optional: migrate auth token from `localStorage` → `secureStorage` (architecture ready; not auto-migrated to avoid auth risk).

---

## Final checklist

- [x] Mobile optimized  
- [x] Tablet optimized (existing layout breakpoints)  
- [x] Desktop optimized  
- [x] Android optimized  
- [x] Capacitor ready  
- [x] PWA ready  
- [x] Offline ready architecture  
- [x] Push notification ready  
- [x] Deep link ready  
- [x] Secure storage ready  
- [x] Dark mode ready  
- [x] Play Store ready (pending signing + Console assets)  
- [x] Production ready (pending signing + API env + store listing)  

---

## Commands cheat sheet

```bash
cd Frontend
npm run build          # or android:build (build + cap sync)
npm run cap:assets     # regenerate icons/splash from resources/
npm run cap:open       # open Android Studio
npm run android:release
```
