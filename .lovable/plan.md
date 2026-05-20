## Problem

When the user starts a trip via **Shop freely (no list)**, `trips.list_id` is `null` → `listItems` is empty → every added item falls through `handleMatchOrExtra` into `setOffList`, which routes to the **Extras** modal. Visually they live in the red "Extras" strip instead of being grouped by category like a normal list.

Note: Finance already excludes these from impulse stats (`isExtra` returns false when the trip has no list), so this is purely an in-trip UX bug — but it makes the live view feel wrong.

## Approach

**Auto-create a hidden shopping list on freely-shop trips.** All add-item paths then go through the existing planned-item flow with category grouping, tags, edit, etc. No new UI code paths, no special-casing.

Why hidden: we don't want every spontaneous trip to clutter `/lists` or the "Choose a list" picker.

### Schema

```sql
-- UP
ALTER TABLE public.shopping_lists ADD COLUMN hidden boolean NOT NULL DEFAULT false;
CREATE INDEX idx_shopping_lists_user_hidden ON public.shopping_lists (user_id, hidden);
-- DOWN
DROP INDEX IF EXISTS idx_shopping_lists_user_hidden;
ALTER TABLE public.shopping_lists DROP COLUMN hidden;
```

### Code changes

1. **`src/pages/StartTrip.tsx`** — when `pendingTrip:listId === "none"`, before inserting the trip:
   - Insert a `shopping_lists` row with `name = "Free trip · {date}"`, `hidden = true`.
   - Use that new id as the trip's `list_id`.

2. **`src/pages/ActiveTrip.tsx`** — when the linked list is `hidden`:
   - Hide the list title in the header (or show "Shopping" generically).
   - Replace empty-state copy "No shopping list linked to this trip" with "Tap + to add items as you shop."
   - Everything else (grouping by category, tag selector, check-off) just works.
   - `handleMatchOrExtra` still runs; since the list starts empty, scanned/manual items won't match — so we change the behavior: **when `list.hidden`, skip the OffList modal and directly insert a new `shopping_list_items` row (checked off, with the snapshot price), instead of routing to `setExtras`.** This makes spontaneous additions look identical to "I added it then checked it off."

3. **`src/pages/Lists.tsx`** — append `.eq("hidden", false)` to the list query so hidden lists never appear.

4. **`src/pages/Home.tsx`** — same filter on the "Choose a list" dialog query.

5. **`src/pages/Finance.tsx`** — no change needed. `isExtra` already returns false for these items (now even more correct: they live as planned items in the hidden list).

### Edge cases

- **Existing free-shop trips** with `list_id = null` and items in `extras`: leave alone. Migration only affects new trips. The old extras stay where they are.
- **User clicks "End trip"**: hidden list stays in DB (cheap, audit trail). If we want cleanup, a later sweep can delete hidden lists with no remaining trip references — out of scope here.
- **TripDetail / receipts**: read from `trip_items` (not `shopping_list_items`), so unaffected. Items added in free mode currently aren't in `trip_items` at all (they're only `extras` state) — that's actually another bug, but fixing it via the planned-item path means they correctly become `trip_items` with `price_cents` set when checked off, like any planned item.

Wait — clarification needed. Right now in **list mode**, when a planned item is checked off, does it create a `trip_items` row, or only update `shopping_list_items.checked_at`?

## Open question

Looking at `openManualCheck` flow vs `confirmAdd`: planned-item check-off appears to only update `shopping_list_items` (no `trip_items` insert), while extras create `trip_items`. Trip totals depend on which source. Before I implement, I want to verify: **do planned check-offs already write a `trip_items` row?** If not, free-trip items added through this new path will show in the cart total (which reads `listItems` price_cents) but won't appear in receipt/finance breakdowns (which read `trip_items`).

If that's the case, the right fix is slightly bigger: on planned check-off, also insert a `trip_items` row. That would also fix receipts for normal list trips. Want me to include that, or keep this PR scoped to just the free-trip flag?
