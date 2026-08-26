# Phase 2 — Navigation & continuity

Close the remaining navigation dead-ends and state-loss gaps left after Phase 1 critical protection work.

## Scope

### T-09 — Onboarding route guards (UX-07, UX-39)

- Add a `RedirectIfOnboarded` guard for `/onboarding`, `/onboarding/showcase`, `/onboarding/signup`, and `/onboarding/verify`.
- Signed-in, fully onboarded users who land on these routes are redirected to `/` instead of seeing onboarding again with no close control.
- The guard checks the same source of truth as `RequireOnboarding` (`user_onboarding.completed_at` plus the local `cartwise:onboarded` flag), with the same timeout/fail-open behavior.
- Clear the onboarding draft (`cartwise:onboardingDraft`) when the signed-in user's email changes or on sign-out, so a stale name does not leak into a different account's onboarding.

### T-10 — Detail-route chrome fix (UX-26)

- In `AppLayout.tsx`, change the trip-detail matcher so `/trip/new` is treated as a fullscreen route and `/trip/:id` is treated as a detail route.
- Current regex `/^\/trip\/[^/]+$/` matches `/trip/new`; update it to exclude `/trip/new` explicitly.
- Verify `/trip/:id` hides the tab bar and uses the detail layout, while `/trip` and `/trip/new` remain fullscreen.

### T-11 — Back fallbacks (UX-40)

- Update `BackHeader.tsx` to fall back to a declared parent route when the browser history stack is empty (e.g. cold deep link).
- Add an optional `parent` prop to `BackHeader` (e.g. `parent="/lists"` for `ListDetail`, `parent="/history"` for `TripDetail`).
- When `window.history.state?.idx > 0`, use `navigate(-1)`; otherwise `navigate(parent)`.
- Audit all `BackHeader` call sites and supply the correct parent route.

### T-12 — Selection persistence (UX-42, UX-43)

- Persist `ListDetail` `groupBy` (category/tag) to `sessionStorage` per list id.
- Persist `ActiveTrip` `tripGroupBy` (category/tag) to `sessionStorage` per trip id.
- Persist the active store on the `trips` row itself: add/update a `store_id` foreign key on `trips` and restore from the DB on reload instead of only from `sessionStorage`.
- Keep `sessionStorage` as a fast cache, but treat the DB row as the source of truth.

### T-13 — Onboarding error boundary (UX-38)

- Wrap the onboarding route subtree (`/onboarding/*`) in `RouteErrorBoundary` so a render crash in Hero/Showcase/Signup/Verify/Budget shows the existing error screen instead of a white screen.

## Technical notes

- Files expected to change:
  - `src/App.tsx` — add `RedirectIfOnboarded` wrapper and onboarding error boundary.
  - `src/components/RedirectIfOnboarded.tsx` — new guard component.
  - `src/components/AppLayout.tsx` — fix detail-route regex.
  - `src/components/BackHeader.tsx` — add parent fallback.
  - `src/pages/ListDetail.tsx`, `src/pages/TripDetail.tsx`, and other `BackHeader` callers — supply `parent` prop.
  - `src/pages/ListDetail.tsx` — persist `groupBy`.
  - `src/pages/ActiveTrip.tsx` — persist `tripGroupBy`; write/read `store_id` on the `trips` row.
  - `src/hooks/useAuth.tsx` or `src/hooks/useOnboarding.tsx` — clear draft on email change/sign-out.
- Schema change: add `store_id uuid references stores(id) on delete set null` to `public.trips`. Include RLS GRANTs and a policy allowing the trip owner to update `store_id`.
- No other schema changes planned.

## Validation plan

- Signed-in, onboarded user visits `/onboarding` and `/onboarding/signup` directly → redirected to `/`.
- Signed-out user visits `/onboarding` → onboarding renders normally.
- Cold deep link to `/trip/<valid-id>` → tab bar hidden, `BackHeader` visible and functional.
- Cold deep link to `/trip/new` → fullscreen layout, no tab bar.
- `/trip/new` no longer matches the detail regex.
- `BackHeader` on a deep-linked `ListDetail` falls back to `/lists` instead of exiting the app.
- `ListDetail` groupBy survives refresh within the same session.
- `ActiveTrip` store survives refresh and is restored from the DB row.
- Trigger a render error in `Showcase.tsx` → `RouteErrorBoundary` screen appears.

## Rollback plan

- Each task is isolated. If a regression appears, revert the specific file change.
- Highest-risk change is the `trips.store_id` migration; validate with a single trip save/update before touching broader flows.
