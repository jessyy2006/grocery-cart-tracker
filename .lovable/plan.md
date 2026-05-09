## Grocery Trip Flow Fixes

Three targeted fixes scoped to `src/pages/ActiveTrip.tsx` (issues 1 & 2) and a verification of `src/pages/StartTrip.tsx` (issue 3).

---

### 1. Cart total updates when items are checked off

**Root cause:** `total` is computed from `items` (the `trip_items` table), but checking off a list item via the manual-check dialog only updates `shopping_list_items` (price + checked_at) — it never inserts a `trip_item`. So the cart total stays at $0 unless the user also scans something.

**Fix:** Make the cart total reflect the user's actual progress through the list.

- Recompute `total` as: sum of `price_cents * qty` for every `listItems` entry where `checked_at != null`, plus the existing `extras` (sum of `price_cents * qty`).
- This makes checking/unchecking a list item update the total instantly (state already updates optimistically in `confirmManualCheck` and `handleMatchOrExtra`).
- Unchecking: add an "uncheck" path on the checkbox for already-checked items that clears `checked_at` and `price_cents` locally + in DB. Total recomputes via `useMemo`.
- Keep the existing `numer/denom` progress badge logic working with the same source of truth.

**Files:** `src/pages/ActiveTrip.tsx` only.

---

### 2. Barcode scanner "Add manually" opens the modal in-place

**Root cause:** In the `Scanner`'s `onManualEntry` handler (lines 503–511), if `activeStore` is null we call `setPickStoreOpen(true)`, which opens the store-picker sheet — that's the "navigates to store selection" the PRD describes.

**Fix:**
- Remove the `activeStore` guard from the manual-entry handler. Always `setPending({ barcode: null, name: "", price: "", qty: 1 })` after closing the scanner.
- Defensive fallback: if `activeStore` happens to be null when `confirmAdd` runs, auto-select the first available store (or the trip's stashed store) before insert, instead of silently failing.
- The existing `Dialog` rendered from the `pending` state already matches the standard add-item UI (name / price / qty), so no new modal is needed.

**Files:** `src/pages/ActiveTrip.tsx` only.

---

### 3. Store selection "Start your trip" CTA

**Status: already implemented.** `src/pages/StartTrip.tsx` already has:
- A fixed bottom button (`fixed inset-x-0 bottom-0 ...`) labeled "Start trip at {store}" / "Select a store to start".
- `disabled={!selected || creating}` — disabled until a store is picked.
- `StoreCard onClick` only calls `setSelected(...)` — no navigation side effect.
- Navigation happens only inside `handleStartTrip`, which is wired to the button's `onClick`.

**Action:** No code changes. Will spot-check in the preview after #1 and #2 ship to confirm behavior matches the PRD acceptance criteria. If you've seen a regression here, send a screenshot / repro and I'll dig in.

---

### Risks & rollback

- Switching `total` to a list-derived sum changes the meaning of "cart total" when the trip has both list-driven check-offs and scanned extras. Plan keeps both: `Σ checked listItems + Σ extras`. Rollback = revert the `useMemo`.
- Removing the `activeStore` guard is safe because trips are created from `StartTrip` with a store, and we add a fallback in `confirmAdd`.
- No DB schema changes, no migrations.