# TestFlight Readiness Review — CartWise

Full audit of the app (onboarding excluded). Two hard blockers, then a set of WKWebView-specific bugs that would make the app feel broken to a TestFlight tester.

## Hard blockers

**1. There is no native app.** No Capacitor packages, no `capacitor.config.ts`, no `ios/` project. Nothing can reach TestFlight today.

**2. No account deletion.** Profile only offers sign out. Apple guideline 5.1.1(v) requires an in-app way to delete an account for any app with sign-up. This is an automatic rejection.

## Bugs that will bite testers

**3. Receipt scanner dies silently when camera is denied.** `ScanReceipt.tsx` opens its own camera stream and swallows every error (`catch { /* silent */ }`). A tester who taps "Don't Allow" gets a black screen and a shutter button that only says "Camera not ready". The barcode scanner (`Scanner.tsx`) handles this properly — the two implementations have drifted apart.

**4. Login can be silently lost.** The Supabase session falls back to `localStorage`, which iOS may purge under storage pressure in a webview. Testers get logged out at random.

**5. Preview-only code shipped into the native shell.** The scanner checks "am I in an iframe / is camera blocked by the preview" and, on failure, offers an "Open in new tab" button that does nothing inside a native app. Same for the receipt share flow, which tells users to "open in mobile Safari".

**6. No timeout on receipt parsing.** Uploading a receipt photo over weak cellular can hang forever with a spinner and no way out.

**7. Unguarded `localStorage` reads** in `Home.tsx` and `RequireOnboarding.tsx` can throw in restricted webview storage modes and blank the screen. Finance already wraps its reads in try/catch — match that.

## Fixes

**Phase 1 — Wrap it (blocker 1)**
- Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`; init with appId `app.lovable.p6b5394a6a7dc4ca5a38383f61b5ff35a`, appName `cartwise-by-jess`.
- Add a `capacitor.config.ts` with the sandbox `server.url` for hot reload during development (removed before an App Store build).
- Document the required `Info.plist` strings: `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`. Without these iOS kills the process on first camera access.
- Add an `isNative()` helper (`Capacitor.isNativePlatform()`) used by the fixes below.

**Phase 2 — Account deletion (blocker 2)**
- New `delete-account` edge function: verifies the caller's JWT, deletes their rows, then removes the auth user with the service role.
- Profile gets a "Delete account" destructive row under Sign out, behind a typed confirmation dialog, then signs out and returns to onboarding.

**Phase 3 — Camera hardening**
- Move `ScanReceipt`'s camera onto the shared `startBarcodeScan` error mapping (extract an `openCameraStream()` helper in `src/lib/device/scanner.ts`) so both screens share one permission-error path.
- On denial, show an inline message plus the existing "Upload photo" / "Enter manually" fallbacks instead of a dead screen. On native, copy points at Settings, not browser settings.
- Gate the iframe/permissions-policy checks and the `window.open` toast action behind `!isNative()`.
- Add `env(safe-area-inset-bottom)` padding to the ScanReceipt shutter row.

**Phase 4 — Session durability**
- Supply a Capacitor Preferences-backed storage adapter to the Supabase client on native (web path unchanged; the auto-generated client file stays untouched — the adapter is injected via a small wrapper module).

**Phase 5 — Polish**
- 60s `AbortController` timeout around `parse-receipt` and `match-list-item` invokes, with a clear "took too long, try again" toast.
- Native-aware share copy in `useReceiptShare.ts` and `ReceiptView.tsx`; drop the dead blob-download branch on native.
- try/catch the remaining `localStorage` reads.
- Strip PWA/`apple-mobile-web-app-*` meta tags from `index.html` once native (keeps the web build's manifest optional).

## Notes
- After any native-capability change you'll need to `git pull`, `npm install`, `npx cap sync`, then run from Xcode.
- Recommended reading before the first build: Lovable's Capacitor mobile guide.
- I did not find external payment links, hardcoded `http://` in runtime code, or `.toFixed`/array-index crash risks — those are clean.
