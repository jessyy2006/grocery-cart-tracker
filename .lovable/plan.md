## Two-step "Start a new trip" flow

Restructure the start-trip dialog on `src/pages/Home.tsx` so the user picks an intent first, then optionally picks a list in a second dialog.

### Current behavior
The "Start a new trip" dialog renders all shopping lists inline as a vertical stack, with a "Shop freely (no list)" outline button below. Lots of lists = long dialog, and there's no clear primary action.

### New behavior

**Dialog 1 — "Start a new trip"** (existing dialog, simplified):
- Title: `Start a new trip`
- Description: `Shop with one of your lists, or shop freely.`
- Primary button (dark green, `variant="default"`, full width): **Choose a list**
  - Disabled when the user has zero lists, with helper text `Create a list first from My shopping lists.`
  - On click: close this dialog, open Dialog 2.
- Secondary button (`variant="outline"`, full width): **Shop freely (no list)** — same `startTripWith(null)` behavior as today.

**Dialog 2 — "Choose a list"** (new):
- Title: `Choose a list`
- Description: `Pick the list you'll be shopping for.`
- Scrollable list of all shopping lists inside a `ScrollArea` capped at ~60vh so long collections don't blow out the dialog.
- Each row: same card style as today (`ListChecks` icon + list name, hover highlight, `rounded-xl` border).
- Click a row → call existing `startTripWith(listId)` (which already resets the list, stashes the id, and navigates to `/trip/new`).
- Back affordance: a small `Back` ghost button in the footer that returns to Dialog 1 (so the user can switch to "Shop freely" without closing everything).

### Implementation notes (Home.tsx only)
- Add `chooseListOpen` state alongside existing `startOpen`.
- Keep the existing `openStart` fetcher; lists are already loaded before Dialog 1 opens, so Dialog 2 just renders from `lists`.
- Reuse `Dialog`/`DialogContent`/`DialogHeader` and import `ScrollArea` from `@/components/ui/scroll-area` (already in the codebase).
- Primary "Choose a list" button uses default variant — the design system's `--primary` token is the app's dark green, so no custom color classes needed (keeps tokens-only rule).
- No DB changes, no routing changes, no changes to `StartTrip.tsx` or `ActiveTrip.tsx`.

### Risks
- None functional — `startTripWith` is unchanged. Only UI restructuring.
- Edge case: zero lists → "Choose a list" disabled with hint, "Shop freely" still works.
