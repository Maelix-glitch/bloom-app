# Bloom — Make it look & feel like a mobile app

You asked "what website/service is good, what is better". Here's the honest map:

## The options, ranked

| Path | Cost | What you get | Verdict |
|---|---|---|---|
| **1. PWA "Add to Home Screen"** | Free, 30 sec | Home-screen icon, splash screen, fullscreen, offline. From your deployed URL. | ✅ **Do this first, today.** 90% of the "it's an app" feeling, zero stores. |
| **2. Capacitor wrapper (this repo)** | Free | **Real** `.apk/.aab` + iOS app, offline bundle, store-publishable. Already scaffolded in `android/` + `ios/`. | ✅ **The real answer** for "headless wrapper that looks like an app". |
| 3. PWABuilder / TWA → Play Store | Free | Your PWA repackaged as a Play Store listing (Android only). | Decent shortcut if you only care about Play Store. iOS not possible this way. |
| 4. Paid wrappers (Median.co, GoNative, WebIntoApp) | $30 one-time → $99/mo | They wrap your URL in a webview for you. | ❌ Don't pay for this — option 2 is the same thing but free, offline, and yours. |

**Bottom line: PWA now (nothing to install, works from the site), Capacitor when
you want a store app / APK to send friends.** Both are already built in this repo.

---

## Path 1 — PWA install (do this the minute you deploy)

No build, no store, no cable. On your phone, open the deployed URL:

- **Android (Chrome):** menu → *Add to Home screen* (or the *Install* prompt —
  the app also offers it in Profile → settings).
- **iPhone (Safari):** Share → *Add to Home Screen*.

What makes it feel native (all already in the repo):

- `manifest.webmanifest` — icon, theme color, portrait, shortcuts (Today / Mood
  / Cycle / Trackers on long-press).
- `sw.js` — offline shell: the app opens with no connection.
- iOS splash screens (`public/bloom/splash/`, 12 sizes) — no white flash on
  launch. Regenerate with `npm run splash` if the icon ever changes.
- Edge-to-edge + safe areas (`viewport-fit=cover`, status-bar styling,
  no pull-to-refresh rubber-banding, no tap-delay).

## Path 2 — Capacitor: the real native wrapper (scaffolded, ready)

`android/` and `ios/` in this repo are genuine native projects. The web app is
compiled to a **static offline bundle** (`npm run build:app` → `dist/client/`)
and embedded in them — not a URL wrapper, the app truly lives on the phone
(and Bloom is device-first already, so offline works).

What's already done for you: bundle scripts, branded icons + splash screens on
both platforms (`npm run app:assets`), dark status bar, camera/mic permissions
for the Coach camera and voice composer.

### Build it on your machine

You need **Android Studio** (Android, any OS) and/or **Xcode** (iOS, Mac only).
Nobody can build store apps without these — not even paid services.

```bash
npm install
npm run app:build     # static bundle → synced into android/ + ios/

npx cap open android  # → Android Studio: Run ▶ on your phone / emulator
npx cap open ios      # → Xcode (Mac): Run ▶ on your iPhone
```

After changing web code, just `npm run app:build` again (rebuild + re-sync).

### Ship it to friends / stores

- **Android, no store:** Android Studio → Build → Generate App Bundle (`app-release.aab`)
  for the Play Store, or Build APK to send a file directly (installs with one
  "unknown apps" prompt). First: Build → Generate Signed Bundle (create a
  keystore **once**, back it up — lose it and you can never update the app).
- **Android, Play Store ($25 one-time):** Play Console → create app → upload the
  `.aab`. Needs a privacy policy URL (Supabase hosts nothing — put a page on
  your deployed site) and data-safety answers (Bloom stores data on-device +
  optional Supabase sync — say exactly that).
- **iOS, App Store ($99/yr):** Xcode → Product → Archive → Distribute. Change
  `appId` in `capacitor.config.ts` to a domain you own first
  (e.g. `com.yourname.bloom`). Apple review note: this is a real offline app
  bundle, which passes far better than URL wrappers — and Bloom's Profile →
  erase-everything already satisfies the "account deletion" rule.
- **Version bumps:** `version` in `package.json` → `npm run app:build` → rebuild
  in the IDE. (`android:versionCode` / iOS build number must rise each upload.)

### Dev loop with live reload (optional)

```bash
npx cap run android -l --external   # app on phone, code from your dev server
```
Needs phone + PC on the same Wi-Fi. If it can't reach the server, add
`android:usesCleartextTraffic="true"` to the `<application>` tag in
`AndroidManifest.xml` (dev only — never ship that).

### Known wrapper limitations (honest)

- **Push/reminder notifications:** the PWA path supports web reminders when
  installed; inside Capacitor, web notifications don't fire on iOS and are
  flaky on Android. The fix is `@capacitor/local-notifications` + a small
  scheduler bridge — say the word and it's the next build.
- **Service worker:** doesn't run under the `capacitor://` scheme — irrelevant,
  because the bundle is already on the device.
- **Google Fonts** need network once, then cache. Offline first-run falls back
  to system fonts gracefully.

## Path 3 — PWABuilder / TWA (Android/Play only, no code)

1. Deploy the site (HTTPS required) and open it in Chrome on desktop.
2. Go to **pwabuilder.com** → enter your URL → Package for Android.
3. It returns a signed `.aab` (generate the keystore when asked, back it up).
4. Upload to the Play Console ($25 one-time).

Good shortcut, but: Play Store only, requires network (it's your live site in
a Chrome shell), and you don't own the pipeline. Capacitor (Path 2) is strictly
better once you have Android Studio open.

## Commands cheat-sheet

| Command | What it does |
|---|---|
| `npm run splash` | Regenerate the 12 iOS PWA splash screens |
| `npm run build:app` | Offline static bundle → `dist/client/` |
| `npm run app:build` | Bundle + sync into `android/` + `ios/` |
| `npm run app:sync` | Re-sync only (after IDE-side/native edits) |
| `npm run app:assets` | Regenerate native icons + splash from `icon-1024.png` |
| `npx cap open android/ios` | Open the native project in its IDE |
