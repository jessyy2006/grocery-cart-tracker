## Fixes for Scan Receipt flow

### 1. Hide bottom nav on `/scan-receipt`
- Update `BottomNav.tsx` and the `fullscreen` check in `AppLayout.tsx` to treat `/scan-receipt` the same as `/trip` (return `null` / use fullscreen layout). This removes the floating nav so the Retake / Use photo / Cancel / Save buttons are no longer covered.

### 2. Fix price input
The current cell binds value to `(line_total_cents / 100).toFixed(2)` and re-parses on every keystroke through `parsePriceToCents`, which causes the "increment by cents" feel (typing `6` becomes `0.06`, etc.).
- Store a per-row local string draft for the price field while editing. On change, just update the draft string; on blur (or Enter), parse to cents and write back to the item. Keep `inputMode="decimal"` and add `pattern="[0-9]*[.,]?[0-9]*"`. This lets users type `6.98` naturally.

### 3. Restyle "Save as new store" as a small checkbox
- Remove the Select dropdown UI. Below the store name input, render a single small caption-style checkbox row (matching the "Save these items as a reusable shopping list" styling: `flex items-start gap-3 rounded-lg border border-hairline p-3`, `text-small`) labeled `Save "<Store Name>" as a new store`.
- Behavior: checkbox is shown only when the typed store name does not already match an existing store. If matched, auto-link silently (no UI). If unmatched and user leaves it unchecked, save store name as snapshot only (current `NO_STORE` behavior). If checked, create new store (current `NEW_STORE` behavior).
- Drop the `Select`, `SelectContent`, etc. imports and `storeChoice` state in favor of a single boolean `saveAsNewStore` plus a resolved `matchedStoreId` derived from `storeName`.

### 4. Item row layout + swipe-to-delete
- Change the row grid from `[1fr_56px_92px_28px]` to roughly `[1fr_44px_72px]` so name ≈ two-thirds, qty fits 2 digits, price fits 4 digits (e.g. `99.99`). Remove the visible trash icon column.
- Wrap each `<li>` content in a swipeable container:
  - Outer `<li>` is `relative overflow-hidden`.
  - Behind the row, render an absolutely-positioned red `Delete` button (`bg-destructive text-destructive-foreground`, width ~72px, right-aligned, full row height).
  - Foreground row is a `motion.div` with horizontal drag (`drag="x"`, `dragConstraints={{ left: -72, right: 0 }}`, `dragElastic={0.05}`). On drag end, snap to `-72` if dragged past ~ -32, else snap back to 0. Tapping the revealed Delete button calls `removeItem(idx)`.
  - Use framer-motion (already a dep). Track open state per row in local state (e.g. `openSwipeIdx`); opening one row closes others.

### Files to edit
- `src/components/AppLayout.tsx` — include `/scan-receipt` in fullscreen check
- `src/components/BottomNav.tsx` — hide on `/scan-receipt`
- `src/pages/ScanReceipt.tsx` — items 2, 3, 4 (review card markup + state)

### Out of scope
No backend/edge-function or scan capture changes.