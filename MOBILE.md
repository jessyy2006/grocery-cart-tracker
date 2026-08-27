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
`isNative()`). Google now goes through Supabase's `/auth/v1/authorize` rather than
Lovable's `/~oauth/initiate`, which removed one blocker — that route only existed on
Lovable's servers. What remains is that `redirectTo` is built from
`window.location.origin`, which is `capacitor://localhost` in the shell, so the
callback has nowhere to land.

**This does not need a domain.** Because Supabase brokers the flow, Google's redirect
URI is always `https://<project>.supabase.co/auth/v1/callback` — Google never sees the
app's scheme, so its https-only rule is satisfied by Supabase, not by us. Only the
final Supabase → app hop has to reach the shell, and Supabase's redirect allow-list
accepts custom schemes. A Universal Link would also work but is strictly more work
(domain, AASA file, hosting) for no gain here.

To re-enable it, register one custom scheme in three places:

1. **Info.plist** — add a `CFBundleURLTypes` entry for `com.cartwise.app`.
2. **Supabase** — Authentication → URL Configuration → add `com.cartwise.app://callback`
   to the redirect allow-list.
3. **`Signup.tsx`** — use that URL as `redirectTo` when `isNative()`, keeping
   `window.location.origin` for web.

Then catch the callback:

```ts
App.addListener("appUrlOpen", async ({ url }) => {
  const params = new URLSearchParams(new URL(url).hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  }
});
```

Tokens arrive in the URL **fragment**, not as a code: the client in
`src/integrations/supabase/client.ts` does not set `flowType`, and auth-js defaults to
`'implicit'`. Hence `setSession`, not `exchangeCodeForSession` — the latter only
applies if the client is switched to `flowType: 'pkce'`.

Google also still requires a client ID and secret configured under Authentication →
Providers → Google, or Supabase answers "Unsupported provider: missing OAuth secret".

### Required Supabase configuration for email OTP

The client code is correct and expects a 6-digit code, but **it does not work until the
server sends one.** Supabase's stock Magic Link template contains only
`{{ .ConfirmationURL }}` — a link and no code — so a tester receives an email with
nothing to type into the six boxes, and in the native shell that link resolves to
`capacitor://localhost` and dead-ends. Signup is fully broken in that state.

The settings live in version control:

- `supabase/templates/magic_link.html` — the email, built around `{{ .Token }}`
- `supabase/config.toml` — `otp_length = 6`, `otp_expiry = 900`, `max_frequency = "60s"`,
  and the pointer to that template

Applying them takes one of two routes.

**Route A — dashboard (recommended for this project).** Two minutes, no blast radius:

1. Authentication → Emails → **Magic Link**: paste the contents of
   `supabase/templates/magic_link.html`, set the subject to `your cartwise code`.
2. Authentication → Sign In / Providers → Email: set **OTP expiry** to `900` and
   **max frequency** to `60s`.
3. Authentication → Emails → **SMTP Settings**: see below.

**Route B — `supabase config push`.** Reproducible, but read this first:

```bash
supabase login
supabase link --project-ref ajtmlttnljbcztivbphh
supabase config push
```

`config push` applies the *entire* `config.toml`, and keys absent from the file may be
reset to CLI defaults rather than left alone. This project is Lovable-managed, so its
remote auth settings were not all set by us and are not all represented in that file.
The committed config is deliberately narrow to limit this, but the risk is real —
diff the dashboard's auth settings before and after if you take this route. For a
single template change, Route A is the better trade.

**SMTP is required before inviting testers**, either way. Supabase's built-in sender is
rate-limited to a handful of messages per hour and is explicitly not for production. A
TestFlight round will hit that ceiling, and the failure is indistinguishable from a bug:
the code simply never arrives. Resend's free tier (3k/month) is ample; Postmark and
SendGrid are equivalent. Sending from a subdomain you control needs SPF and DKIM records
or the codes land in spam. The `[auth.email.smtp]` block in `config.toml` is filled in
and commented out, ready for the credentials.

**Verify end to end before inviting anyone**, on a device and not just the simulator:
request a code, confirm it arrives within a few seconds and reads as six digits, type it,
and confirm you land on `/onboarding/budget`. Then delete the account from Profile and
confirm a clean success — that path had two bugs in it and it is the one App Review
actively tests.

### Follow-up: Sign in with Apple

Not required for submission. Guideline 4.8 only applies when the app offers a
third-party login service; with Google hidden on native the app ships email OTP only,
which is first-party auth, so nothing triggers the rule. This is a conversion
improvement (one Face ID tap vs. leaving the app to fetch a code), not compliance.

Worth doing as a **second** build, after the first archive is confirmed working — it
adds a native dependency, and bundling it with the first `cap add ios` means debugging
two unknowns at once.

It is still the simplest of the two: the native flow returns a signed JWT in-process,
with no redirect hop at all — nothing to register, nothing to catch. Note that Google
is no longer meaningfully harder now that it routes through Supabase (see above); both
are an afternoon. Pick on merit, not on setup cost.

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
