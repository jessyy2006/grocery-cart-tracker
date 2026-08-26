# CartWise — native (iOS / TestFlight) build

The web app is wrapped with [Capacitor](https://capacitorjs.com). The web build is unchanged; native code paths are gated behind `isNative()` (`src/lib/native.ts`).

## First-time setup

```bash
# after exporting to GitHub and pulling locally
npm install
npx cap add ios          # and/or: npx cap add android
npm run build
npx cap sync
npx cap run ios          # requires macOS + Xcode
```

Re-run `npm run build && npx cap sync` after every `git pull`.

## Required Info.plist strings

These are **already set** in `ios/App/App/Info.plist`, which is committed. Without them
iOS terminates the app the first time the feature is used — no prompt, no error, just an
immediate crash.

| Key | Value |
| --- | --- |
| `NSCameraUsageDescription` | CartWise uses the camera to scan barcodes and receipts. |
| `NSPhotoLibraryUsageDescription` | CartWise lets you pick a receipt photo or profile picture from your library. |
| `NSLocationWhenInUseUsageDescription` | CartWise uses your location to suggest nearby stores. |

`npx cap sync` does not overwrite `Info.plist`, so these survive. They *would* be lost by
deleting and re-adding the `ios/` platform — re-apply them if you ever do that.

## Before an App Store / TestFlight build

- **No `server` block in `capacitor.config.ts`.** It was removed — it pointed the
  shell at the Lovable sandbox, which would ship remote content and fail review.
  For hot reload use `npx cap run ios --live-reload`, which injects the dev server
  at run time instead of committing a URL.
- **Bundle ID is `com.cartwise.app`.** This must match the app record in App Store
  Connect exactly, and cannot be changed after that record is created.

## Sign-in on native

Email OTP (6-digit code, `pages/onboarding/Verify.tsx`) is the only sign-in path in
the native shell, and it is the one that matters: the code is typed into the app, so
no deep link is involved. It also satisfies Guideline 4.8 as the privacy-preserving
option.

**Google OAuth is hidden on native** (`pages/onboarding/Signup.tsx`, gated on
`isNative()`). Inside the shell `window.location.origin` is `capacitor://localhost`,
and Google rejects non-HTTPS redirect URIs, so the round trip cannot complete.

To re-enable it later you need an HTTPS redirect that hands control back to the app:

1. Serve `/.well-known/apple-app-site-association` from a domain you control, listing
   `<TEAM_ID>.com.cartwise.app`. No file extension, `Content-Type: application/json`,
   HTTPS, no redirects.
2. Add the Associated Domains capability in Xcode: `applinks:yourdomain.com`.
3. Set the OAuth `redirect_uri` to `https://yourdomain.com/auth/callback` and register
   that exact URL in both Google Cloud Console and Supabase's allowed redirect list.
4. Handle the inbound URL with Capacitor's `App.addListener('appUrlOpen', …)` and pass
   the code to `supabase.auth.exchangeCodeForSession()`.

Step 1 is the real work — the rest is wiring. Sign in with Apple is the cheaper path
if the goal is just "a second sign-in button", since it needs no domain.

### Required Supabase configuration for email OTP

The client code is correct and expects a 6-digit code, but **it will not work until the
email template is changed.** Verify both of these in the Supabase dashboard before
inviting any tester:

1. **Auth → Email Templates → Magic Link must contain `{{ .Token }}`.**
   Supabase's default template only contains `{{ .ConfirmationURL }}`, which sends a
   *link* and no code. With the default template a tester receives an email with
   nothing to type, and — on native — a link that resolves to `capacitor://localhost`
   and does nothing. Signup is completely broken in that state. The template needs a
   line such as `<p>Your code is {{ .Token }}</p>`.

2. **Auth → SMTP Settings — configure a custom SMTP provider.**
   Supabase's built-in email sender is rate-limited to a handful of messages per hour
   and is explicitly not intended for production. A TestFlight round with several
   testers signing in will silently hit that ceiling, and the failure looks like "the
   code never arrived." Resend, Postmark or SendGrid all work.

### Follow-up: Sign in with Apple

Not required for submission. Guideline 4.8 only applies when the app offers a
third-party login service; with Google hidden on native the app ships email OTP only,
which is first-party auth, so nothing triggers the rule. This is a conversion
improvement (one Face ID tap vs. leaving the app to fetch a code), not compliance.

Worth doing as a **second** build, after the first archive is confirmed working — it
adds a native dependency, and bundling it with the first `cap add ios` means debugging
two unknowns at once.

It avoids the Universal Link problem entirely: the native flow returns a signed JWT
in-process, with no redirect URI and no domain.

- Cost: none beyond the $99/yr Apple Developer Program that TestFlight already requires.
- Compatibility (verified 2026-08-26): `@capacitor-community/apple-sign-in@7.1.0` has
  peer `@capacitor/core >=7.0.0`, satisfied by our 8.5.0. `signInWithIdToken` accepts
  `provider: 'apple'` in the installed `@supabase/auth-js`.

Steps:

1. `npm i @capacitor-community/apple-sign-in && npx cap sync`
2. Xcode → Signing & Capabilities → **+ Sign in with Apple**
3. Supabase → Auth → Providers → Apple: enable, add `com.cartwise.app` to **Client IDs**.
   No secret key is needed for the native ID-token flow — that field is only for the
   web OAuth flow.
4. In `pages/onboarding/Signup.tsx`, render the Apple button under `isNative()` (the
   inverse of the existing Google gate):

```ts
const { response } = await SignInWithApple.authorize({
  clientId: "com.cartwise.app",
  scopes: "name email",
  nonce,                              // must match the JWT's nonce claim
});
await supabase.auth.signInWithIdToken({
  provider: "apple",
  token: response.identityToken,
  nonce,
});
```

Note that Apple returns the user's name **only on the very first authorization**. It
must be persisted to `profiles` / `user_onboarding` on that first call — subsequent
sign-ins return `null` for it, and there is no way to ask Apple again.

## Compliance notes

- **Account deletion** (Guideline 5.1.1(v)) is implemented: Profile → "delete account",
  backed by the `delete-account` edge function, which removes the user's rows and their
  auth record. It clears all nine owned tables (including `user_budgets` and
  `user_budget_history`, which previously survived deletion), and now returns 500 rather
  than reporting success if any table fails to clear. Migration
  `20260826180000_onboarding_backfill_and_user_cascades.sql` additionally adds
  `on delete cascade` from `auth.users` to the three tables that lacked a foreign key,
  so orphaned rows cannot accumulate even if the function is bypassed.
- **Still outstanding:** the app has no privacy policy URL. This is required for App
  Privacy nutrition labels and for external TestFlight testing (internal testing with
  your own team does not need it).
- **Session durability**: on native the auth session is mirrored into Capacitor Preferences (`src/lib/nativeSession.ts`) and rehydrated before the app mounts, so a WKWebView storage purge doesn't sign users out.
- **Camera failures** now surface a readable message plus "Upload photo" / "Enter manually" fallbacks instead of a black screen.
- The PWA manifest and `apple-mobile-web-app-*` tags in `index.html` are inert inside the native shell; they only affect the web build and can stay.
