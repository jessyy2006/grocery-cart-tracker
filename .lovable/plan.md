## Fix stuck Google sign-in button after cancelled popup

### Root cause
On mobile the Lovable auth SDK opens Google in a new tab/popup. When the user closes it, one of two things happens and both leave `busy` stuck at `true`:

1. **Popup close undetected** — Cross-Origin-Opener-Policy blocks `popup.closed` polling on mobile Safari, so the SDK promise never resolves or rejects. Our `try/catch/finally` never runs → `busy` stays `true` forever.
2. **Full-page redirect path** — SDK returns `{ redirected: true }`. Current code sets a 4s timeout, but if the user cancels and returns faster, the button is still locked, and the timeout is arbitrary.

Both cases affect *only* the Google button visually, but because `busy` is shared with the email/password submit buttons, all three end up disabled — matching the screenshot.

### Fix (Signup.tsx only)

1. **Reset `busy` on window focus / visibility change** while a Google sign-in is in flight. When the OAuth tab closes (or the user returns to the app), `visibilitychange` (visible) and `focus` fire reliably on iOS/Android even when `popup.closed` doesn't. If `user` is still null at that point, unlock the buttons.
2. **Drop the shared `busy` coupling for Google** — use a dedicated `googleBusy` state so a stuck Google flow can never lock the email/password buttons. Email/password keep their own `busy`.
3. **Keep the existing try/catch/finally** as the happy-path unlock, and remove the fragile 4s timeout in favor of the focus listener.

### Files
- `src/pages/onboarding/Signup.tsx`

### Risk
Presentation-only change, scoped to the signup screen. No auth logic or backend changes.
