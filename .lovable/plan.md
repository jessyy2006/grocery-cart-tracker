# Extras rehydration, instant "not on your list" prompt, copy fixes

## 1. Extras rehydrate after reload

Today the trip loader fills `items` from `trip_items` but never repopulates `extras`, so extras vanish from the UI (and from the running total) after a refresh even though the rows exist in the database.

Fix: when loading `trip_items`, treat every row with no `substitutes_list_item_id` as an extra and seed `extras` with those rows. Planned/substitute-linked rows stay out of the extras section, so nothing is double-counted in the total.

## 2. "Not on your list" appears instantly

Root cause: after an item is scanned/entered, the code awaits the `match-list-item` AI edge function (network round trip + model call, up to a 20s timeout) before deciding whether to show the prompt. The local fuzzy matcher only runs in the `catch` branch, so the happy path always pays the AI latency.

Fix — reorder the decision so nothing blocks the UI:

1. Barcode match (already instant) — check off immediately.
2. Local fuzzy match (`findListMatch`) — if it hits, check off immediately, no AI call.
3. No local hit: open the "Not on your list" prompt right away, and fire the AI match in the background.
   - If the AI later returns a match and the prompt is still open and untouched, close it and check off the matched planned item instead.
   - If the AI returns nothing (or errors/times out), the prompt simply stays as-is.

Net effect: the sheet appears the moment the item lands, and AI matching becomes a silent upgrade rather than a gate.

## 3. Copy

- Section heading in the trip ledger: "unplanned additions" to "extras".
- Prompt description: `"[item]" isn't on your list. How should we count it?`

## Technical notes

All changes are in `src/pages/ActiveTrip.tsx`:
- Load effect for `trip_items`: derive and `setExtras` from rows where `substitutes_list_item_id == null`.
- `handleMatchOrExtra`: barcode -> local `findListMatch` -> show prompt + background `aiMatch` with a guard that only auto-resolves if `offList` still holds the same trip item.
- Extras section heading and `DrawerDescription` text.

No schema or edge-function changes.
