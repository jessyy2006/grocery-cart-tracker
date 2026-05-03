# Updates to Active Trip + Shopping List

## 1. Manual-entry button on the Scanner

`src/components/Scanner.tsx`

- Add a new prop `onManualEntry: () => void`.
- Add a floating button in the bottom-right of the scanner overlay (above the safe-bottom hint) with a pencil/keyboard icon and label "Enter manually".
- Tapping it calls `onManualEntry()`, which the parent uses to close the scanner and open the existing add-item dialog (`pending` state) with `barcode: null` and empty fields.

`src/pages/ActiveTrip.tsx`

- Pass `onManualEntry` to `<Scanner>` that runs:
  - `setScanning(false)`
  - if no `activeStore`, prompt to pick one (same guard as scan)
  - `setPending({ barcode: null, name: "", price: "", qty: 1 })`
- The existing dialog + `confirmAdd` already handle null-barcode inserts, so no further changes needed.

## 2. Replace checked list-item name with scanned product name + show price

DB: `shopping_list_items` already has `name` and `barcode` columns; we'll reuse `name` for the displayed name and add a new nullable `price_cents integer` column via migration to remember the matched item's price for display.

Migration:

```sql
alter table public.shopping_list_items
  add column if not exists price_cents integer;
```

`src/pages/ActiveTrip.tsx` — in `handleMatchOrExtra` when a match is found:

- Update local + DB `shopping_list_items` row with `{ checked_at, barcode: code, name: productName, price_cents: tripItem.price_cents }`.
- The `ListItem` type gets a `price_cents: number | null` field.

Render in the grouped list (and in `ListDetail.tsx` for consistency):

- Right-aligned price label inside the row's `Card`, using `text-primary font-semibold` (the app's primary green) — only shown when `price_cents != null`.
- Keep the existing strike-through / muted styling on the name for checked items.

When the user manually un-checks a list item (`toggleListItem`), clear `price_cents` (set null) so it returns to its plain state. The original list name is overwritten — that is per request and acceptable.

## 3. Progress badge in cart footer

`src/pages/ActiveTrip.tsx`

- Compute `const checkedCount = listItems.filter(i => i.checked_at).length;` and `const totalCount = listItems.length;`.
- In the footer, next to the `Cart total` price, render a small pill: `bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs font-semibold` showing `{checked}/{total}` — only when `totalCount > 0`.
- Updates automatically as `listItems` state changes.

## 4. Confetti animation = 2s bounce

`src/index.css` — add a keyframe:

```css
@keyframes confetti-bounce {
  0%   { transform: translateY(120vh) scale(0.6); opacity: 0; }
  25%  { transform: translateY(-20px) scale(1.2); opacity: 1; }
  50%  { transform: translateY(0)     scale(1);   opacity: 1; }
  75%  { transform: translateY(-10px) scale(1.1); opacity: 1; }
  100% { transform: translateY(120vh) scale(0.8); opacity: 0; }
}
.animate-confetti-bounce { animation: confetti-bounce 2s ease-in-out forwards; }
```

`ActiveTrip.tsx`:

- Force the emoji to `🎉` (drop the random array).
- Replace `animate-ping` with `animate-confetti-bounce`.
- Change the timeout to `2000ms`.

## 5. Optional "notes" on shopping list items

Migration:

```sql
alter table public.shopping_list_items
  add column if not exists notes text;
```

`src/pages/ListDetail.tsx`:

- Add a `notes` text input in the add-item footer (small, placeholder "Notes (e.g. 500 ml) — optional"), included in the insert payload. Max character length of 25. 
- Display notes underneath the item name in muted small text when present.
- Add a pencil icon on each row to edit notes inline via a small `Dialog` (name + qty + notes fields), so existing items can gain notes too.

`src/pages/ActiveTrip.tsx`:

- Include `notes` in `ListItem` type and show it under the name in the same muted style so the shopper sees them while scanning.

## Files

- migration: add `price_cents int` and `notes text` to `shopping_list_items`
- edit `src/components/Scanner.tsx` — manual-entry button + prop
- edit `src/pages/ActiveTrip.tsx` — manual entry wiring, name/price overwrite on match, footer progress pill, 2s bounce confetti, render notes
- edit `src/pages/ListDetail.tsx` — notes input on add + edit dialog, display notes, display price for checked items
- edit `src/index.css` — `confetti-bounce` keyframe + utility