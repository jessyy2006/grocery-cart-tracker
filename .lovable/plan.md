# Phase 1 critical UX fixes

Implement the full Phase 1 critical protection and recovery set from the UX audit, with one product decision updated: **no Home resume banner**. If a user has an active live trip and returns to the app after leaving, locking the phone, refreshing, or landing on a normal tab route, the app should automatically route them back to `/trip`.

## Goals

- Prevent silent deletion or loss of live grocery runs.
- Remove destructive writes from read-only pages.
- Stop phantom routes and infinite loading gates.
- Make exit/discard flows explicit, recoverable where possible, and hard to trigger accidentally.
- Add pending-state protection to high-value writes so double taps cannot duplicate or corrupt data.

## Scope

### 1. Active-trip continuity and replacement safety

- Add a shared active-trip lookup that returns the current `trips.status = active` row, including enough context for copy and guards: trip id, list id/name, hidden-list flag, item count, and total.
- Add an app-level active-trip redirect guard inside the authenticated/onboarded app shell:
  - When the user is on normal tab routes such as `/`, `/lists`, `/history`, `/finance`, or `/profile`, and an active trip exists, redirect to `/trip`.
  - Do not redirect while already on `/trip`, `/trip/new`, receipt scanning, onboarding, auth, or historical trip detail routes.
  - Re-check on app focus/visibility return so phone lock/unlock or app background/foreground returns the user to the live trip.
- Keep live-trip mode fullscreen with no bottom nav, matching the current behavior.
- Remove the Home behavior that silently deletes active trips before starting a new one.
- In list detail, starting a run while another active trip exists must show a confirm dialog before replacing it. The dialog should name what will be discarded when possible.
- Same-list starts should resume the current trip instead of replacing it.
- Clean up hidden free-trip backing lists when their active trip is explicitly discarded.

### 2. Remove History retention deletion

- Delete the client-side retention purge in `History.tsx`.
- Remove the one-year fetch filter so older saved trips remain visible and openable.
- Ensure visiting History performs reads only, never deletes.

### 3. Not-found states for detail routes

- In `ListDetail.tsx`, distinguish a missing list row from an empty list.
- Unknown, deleted, or inaccessible list ids should render `ErrorState` with a clear message and a “back to lists” action.
- Hide add-item, edit, drag/drop, and start-run controls when the list is not found.
- Keep Trip Detail’s existing not-found behavior, but verify the route chrome uses the detail contract.

### 4. Stop mutating list rows when starting a trip

- **Current issue:** when you start a trip from a list, `Home.tsx` (and previously `ListDetail.tsx`) silently runs `update shopping_list_items set checked_at = null, price_cents = null where list_id = X`. This wipes any checkmarks or prices you had recorded on the list itself, with no warning.
- **Fix:** remove that reset entirely.
- **Why it is safe:** the live grocery run now uses `trip_planned_items` (the snapshot created at trip start) and `trip_items` (scanned/substituted/extra rows) as its source of truth. The list-level `checked_at`/`price_cents` columns are no longer needed for run state.
- **Migration check:** before deleting the reset, verify that no code still reads `shopping_list_items.checked_at` or `price_cents` to decide live-trip state. If anything does, move that logic to read from `trip_planned_items`/`trip_items` instead of keeping the destructive reset.

### 5. Guard routes must never hang forever

- Harden onboarding/auth gates with try/catch and a timeout.
- If onboarding status cannot be checked, fail safely to a usable path with clear feedback rather than leaving the user on an infinite loading state.
- Reuse the existing loading treatment instead of raw “Loading…” text where practical.
- Harden the onboarding signup redirect check the same way, so returning users are not trapped by a failed status query.

### 6. Trip exit safety

- Update the live-trip exit confirmation copy to state the actual consequence.
- For non-empty trips, offer:
  - “save & exit” as the safe path.
  - “discard trip” as the destructive path.
  - “keep shopping” as cancel.
- For empty trips, keep the existing “keep shopping” path and make the destructive action read “discard trip”.
- Include current item count and total in the destructive copy when available.
- Preserve the existing block that prevents ending/saving an empty trip as a receipt.

### 7. Pending-write guard for critical mutations

- Add local pending locks to high-value write flows touched in Phase 1:
  - Start trip from Home/list.
  - Save/end live trip.
  - Discard live trip.
  - Add/edit list item where the add pad writes rows.
  - Save scanned receipt if the existing save button has no lock.
  - Delete account/profile destructive action path.
- Pending buttons should disable, avoid duplicate submits, and show a clear busy label or spinner state using existing components.
- Keep the first pass minimal: local `useState` pending flags are acceptable unless repeated patterns justify a tiny shared helper.

### 8. Account-deletion integrity

- Make the delete-account function safer and more predictable:
  - Continue to identify the caller from the auth token.
  - Attempt user-owned data cleanup in a deterministic order.
  - Return a structured response if cleanup partially fails instead of silently continuing as if everything worked.
  - Delete all tables that actually contain user-owned rows, including budget/history/onboarding/profile data.
- In Profile, await the delete request, lock the button while pending, and force sign-out/navigation after success or partial cleanup so the user is not left in an inconsistent signed-in state.
- Keep all private backend secrets inside the backend runtime; no keys are added to app code.

## Technical notes

- Primary files expected to change:
  - `src/App.tsx`
  - `src/components/AppLayout.tsx`
  - `src/components/RequireOnboarding.tsx`
  - `src/hooks/useActiveTrip.ts` or equivalent shared hook
  - `src/pages/Home.tsx`
  - `src/pages/ListDetail.tsx`
  - `src/pages/StartTrip.tsx`
  - `src/pages/ActiveTrip.tsx`
  - `src/pages/History.tsx`
  - `src/pages/onboarding/Signup.tsx`
  - `src/pages/Profile.tsx`
  - `src/pages/ScanReceipt.tsx` only if its save path lacks a pending lock
  - `supabase/functions/delete-account/index.ts`
- No schema migration is planned unless implementation confirms a missing column is needed. The current plan avoids database schema changes.
- The active-trip auto-redirect should be careful not to redirect away from `/trip/:id` saved receipt detail, because that is a historical view, not the active live trip.
- The existing `AppLayout` trip detail route matcher should be corrected from plural `/trips/:id` to singular `/trip/:id` while excluding `/trip` and `/trip/new`.

## Validation plan

- Manual browser checks:
  - With an active trip, visit `/`, `/lists`, `/history`, `/finance`, and `/profile`; each should land on `/trip`.
  - With no active trip, those routes should behave normally.
  - Lock/background simulation: trigger visibility/focus return and confirm active trip redirects to `/trip`.
  - Start a same-list run: resumes existing trip.
  - Start a different-list run: confirm appears; cancel preserves old trip; confirm discards old trip then starts new one.
  - Visit History and confirm no DELETE request is issued; older saved trips are not filtered out by code.
  - Open a fake list id and confirm only the not-found state appears.
  - Exit a non-empty trip and confirm “save & exit”, “discard trip”, and “keep shopping” behavior.
  - Double-tap critical buttons and confirm only one write happens.
- Targeted tests where practical:
  - Active-trip redirect predicate.
  - History query no longer applies retention cutoff.
  - Missing list id renders error state rather than controls.

## Rollback plan

- Each task is isolated by file/flow. If a regression appears, revert the specific task rather than the entire Phase 1 batch.
- Highest-risk changes are the active-trip redirect guard and delete-account function; validate those first and keep their logic small and explicit.
