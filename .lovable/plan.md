## Trip Detail polish

### 1. "Shop from this list" parity with a hand-built list

In `src/pages/TripDetail.tsx` `handleRevisit`, augment the `shopping_list_items` insert payload to match the shape used by `ScanReceipt.tsx` and `ListDetail.tsx`:

- Add `category: guessCategory(name)` per item (import from `@/lib/categories`).
- `qty` already comes from `trip_items.qty` — keep as-is; falls back to `1` only when missing/zero.
- No other field changes.

Result: items land in their proper category groups instead of all in "other".

### 2. Page layout: title → receipt → button

Restructure the render so the trip title becomes a real page header **above** the receipt sheet, not the receipt's storefront line.

- Above the receipt: small eyebrow ("EEEE · MMM d, yyyy"), then `h1` with the trip title, centered.
- Inside the receipt header: replace the bold store-name line with **"GROCERY RECEIPT"** (static, keeps the retail-receipt feel); keep the date/time line beneath.
- Trip title source:
  - **Attached to a list** → use the shopping list's `name`.
  - **Free trip** → relative-time naming:
    - same week as today → `"This {Weekday}'s run"` (e.g. "This Tuesday's run")
    - prior week → `"Last {Weekday}'s run"`
    - older → `"{MMM d} run"` (e.g. "Jun 10 run")
  - Helper `formatTripTitle(date)` colocated at the top of `TripDetail.tsx`.

### 3. Handle-tab spacing

The wrapper around the bag-handle button currently uses `mt-3`, which positions the arch — not the button body — close to the receipt. Increase the outer wrapper margin so the arch itself sits ~24px below the receipt's bottom jagged edge:

- Change wrapper from `mt-3` → `mt-10` (≈40px) so the arch element has natural breathing room and the button body sits further down.

### Files touched

- `src/pages/TripDetail.tsx` — only file changed. No DB, no new components.
