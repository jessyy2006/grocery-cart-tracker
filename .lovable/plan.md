# Shopping Lists + Barcode Check-off

Add a "Shopping Lists" feature: build a categorized list of items before a grocery run, then during an active trip scan barcodes to auto-cross items off. Also retheme the app to dark green / neutral white with a light green accent.

## User flow

1. From Home or new "Lists" tab → create a list (e.g. "Weekly groceries").
2. Add items to the list. Each item has a name, quantity, and a category (auto-suggested from a built-in dictionary, editable). Items are grouped by category in the UI (Dairy, Produce, Bakery, Meat & Seafood, Pantry, Frozen, Snacks, Other).
3. Swipe / tap trash to delete an item.
4. Tap "Start grocery run" on a list → creates an active trip linked to that list and navigates to ActiveTrip.
5. In ActiveTrip, the linked list is shown above the cart with items grouped by category. Scanning a barcode that matches a list item (by barcode OR fuzzy name match against the OFF product name) auto-checks it off AND adds it to the cart as today. Manual tap on the checkbox also toggles it.
6. Items already checked are visually struck through and sink to the bottom of their category. Progress indicator shows "7 / 12 picked up".

## Data model (new tables)

```text
shopping_lists
  id uuid pk, user_id uuid, name text, created_at, updated_at

shopping_list_items
  id uuid pk
  list_id uuid -> shopping_lists.id (cascade)
  name text
  qty int default 1
  category text          -- one of the canonical category slugs
  barcode text null      -- optional, set when matched/scanned
  checked_at timestamptz null
  position int           -- for ordering within category
  created_at

trips
  + list_id uuid null    -- new column linking a run to its list
```

RLS: owner-only via `user_id` on lists; items via `EXISTS` join on parent list (mirrors trip_items pattern).

## Category dictionary

Static map in `src/lib/categories.ts`:

- Slugs: `produce`, `dairy`, `bakery`, `meat`, `pantry`, `frozen`, `beverages`, `snacks`, `household`, `other`.
- Each has label, emoji/icon, and a keyword list for auto-categorization (e.g. "milk|yogurt|cheese|butter" → dairy).
- Helper `guessCategory(name: string): CategorySlug` used when adding items manually and when ingesting an OFF product.

## Barcode → list match

In ActiveTrip's `onScanned`:

1. After OFF/product-cache lookup (existing logic), if there is a linked list with unchecked items:
  - Match by `barcode` first.
  - Else fuzzy-match the resolved product name against unchecked item names (lowercase token overlap, threshold ≥ 1 strong token).
2. If matched, mark `checked_at = now()` and persist the scanned `barcode` back onto the list item so future scans are exact.
3. Toast: "Checked off: Milk".
4. Cart insert proceeds as today.

## Screens / components

- `src/pages/Lists.tsx` — list of shopping lists with "New list" button.
- `src/pages/ListDetail.tsx` — items grouped by category; add-item input with category picker; delete; "Start grocery run" CTA.
- `src/components/ListItemRow.tsx` — checkbox, name, qty, category chip, trash.
- Update `src/pages/ActiveTrip.tsx` — show linked list panel above cart, wire scan-to-checkoff.
- Update `src/pages/StartTrip.tsx` — optional "Use a list" selector.
- Update `src/components/BottomNav.tsx` — replace "History" with "Lists" (History stays accessible from Profile/Home), or add a 5th tab. Recommend 5 tabs: Home, Lists, Trip, History, Profile.
- Update `src/App.tsx` routes: `/lists`, `/lists/:id`.

## Theme refresh (dark green + white + light green accent)

Update `src/index.css` tokens:

- `--background: 0 0% 99%` (neutral white)
- `--foreground: 150 35% 12%` (deep green text)
- `--primary: 150 50% 20%` (dark forest green)
- `--primary-glow: 145 55% 32%`
- `--accent: 130 55% 65%` (light green)
- `--secondary: 140 25% 95%`
- `--border: 140 15% 88%`
- Dark mode: invert with `--background: 150 30% 8%`, `--primary: 130 55% 65%` (light green), `--accent: 145 50% 45%`.
- Replace the orange-derived utilities and any hardcoded oranges in components.

## Tests

- `src/lib/categories.test.ts` — `guessCategory` returns correct slug for representative items (milk→dairy, apple→produce, bread→bakery, frozen pizza→frozen, etc.) and falls back to `other`.
- `src/lib/listMatch.test.ts` — fuzzy match: barcode hit, name token hit, no-match returns null, already-checked items skipped.
- `src/pages/ListDetail.test.tsx` (RTL) — adding an item assigns category; deleting removes it; checking moves it to bottom of section.
- Manual QA via browser tool: create list → start run → scan known barcode → item crossed off and added to cart.

## Out of scope

- Sharing lists with other users.
- Voice / image add (icon shown in inspiration but not requested).
- Recipe templates / "Often purchased".