## Goal
On the onboarding "Create your account" page, add a tabbed UI so existing users can sign in. After a successful sign-in, if the user has already completed onboarding, send them straight to `/` (Home), skipping the onboarding flow.

## Why this is straightforward
The infrastructure already exists:
- `RequireOnboarding` already checks `user_onboarding.completed_at` and `localStorage[ONBOARDED_KEY]` and routes accordingly.
- `handle_new_user` trigger already creates a `profiles` row on signup.
- We just need to surface a sign-in path inside the onboarding flow and branch the post-auth redirect.

## Changes

### 1. `src/pages/onboarding/Signup.tsx` — only file that changes
- Wrap the form in `<Tabs defaultValue="create">` from `@/components/ui/tabs` with two triggers:
  - **Create account** (current behavior)
  - **Sign in**
- Header copy switches with the active tab ("Create your account" / "Welcome back"). App icon stays.
- **Create account tab**: keep existing email + password form, "Create account" button, and "Sign up with Google" button below the divider. Behavior unchanged — on success, navigate to `/onboarding/profile`.
- **Sign in tab**: new email + password form calling `supabase.auth.signInWithPassword`. Same Google button below the divider (Google flow is identical for new + returning users).
- **Post-auth redirect logic** (shared): replace the current `useEffect` that always pushes to `/onboarding/profile` with a helper that, once `user` exists:
  1. Reads `localStorage[ONBOARDED_KEY]`. If `"1"` → `navigate("/", { replace: true })`.
  2. Otherwise queries `user_onboarding.completed_at` for `user.id`. If present → set `localStorage[ONBOARDED_KEY] = "1"` and go to `/`.
  3. Else go to `/onboarding/profile`.
- This means a returning user who signs in via either the password form OR the Google button skips onboarding automatically. New signups continue into onboarding.

### 2. Nothing else to touch
- No DB changes — `user_onboarding.completed_at` is already the "has onboarded" boolean source of truth.
- `RequireOnboarding` already enforces the same rule for any other entry point.
- `Intro.tsx` (the very first onboarding screen with "Sign in" already linking to `/onboarding/signup`) keeps working — the tab UI just gives users the option once they get there.

## Notes / risks
- If email confirmation is required, `signInWithPassword` will fail until the user verifies; we'll surface the Supabase error via `toast` (same pattern as the existing signup form).
- No change to validation rules, RLS, or routes.