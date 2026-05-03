# Active Trip page overhaul

Reshape `/trip` so the shopping list is the page, scanned items auto-check matching list entries (verified by AI), and unmatched scans land in a hidden "Extras" tray.

## 1. Hide the bottom nav on the trip page

In `src/components/BottomNav.tsx`, read the current route via `useLocation()` and return `null` when `pathname === "/trip"`. This keeps `AppLayout` untouched and the trip screen full-height.

## 2. Full-screen shopping list (replaces the empty-cart placeholder)

Rewrite the body of `src/pages/ActiveTrip.tsx`:

- Remove the "Cart is empty / Tap Scan to add your first item" block and the small list summary card.
- The main scrollable area becomes the **shopping list itself**, grouped by category (reuse the existing `CATEGORY_ORDER` / `getCategory` rendering already in the file).
- Each list item row gets a `Checkbox` (like `ListDetail.tsx`) so the user can manually tick items off. Toggling updates `shopping_list_items.checked_at` in Supabase and local state. Checked items are greyed + struck-through and sorted to the bottom of their category.
- Delete the per-store "cart items" section from the visible list — keep that data only for the cart total in the footer (which already sums `trip_items`). Cart total + Save trip + Scan barcode footer stays as-is.

## 3. Extras tray + red badge

State: `const [extras, setExtras] = useState<TripItem[]>([])` and `const [extrasOpen, setExtrasOpen] = useState(false)`.

Header (right side, replacing/next to "Switch"):

- A circular red badge button shown only when `extras.length > 0`. White number, `bg-destructive` (or `bg-red-500`), `rounded-full`, ~22px. Clicking toggles `extrasOpen`.
- Keep the "Switch" text button to its left.

Extras module:

- Rendered ABOVE the shopping list inside the scroll area, only when `extrasOpen` is true.
- Light-red accent card titled "Extras", listing each unmatched scanned item (name, qty, price). Each row has a trash icon to remove (also deletes the `trip_items` row).
- When an extra is removed, celebration emoji confetti animation is enlarged on the screen for a brief moment. keep this animation simple and quick. 

## 4. Scan → AI match → check off OR add to extras

Replace `tryCheckOffList` with a new flow used inside `onScanned` and `confirmAdd`:

1. After the user confirms an item in the existing add dialog (`confirmAdd`), insert into `trip_items` as today.
2. Then call a new edge function `match-list-item` with `{ scannedName, listItems: openItems.map(i => ({id, name})) }`.
3. The function returns `{ matchId: string | null }`. If non-null, mark that `shopping_list_items` row as `checked_at = now()` and update local `listItems`.
4. If null, push the trip item onto `extras` and (if not already open) flash a subtle toast "Added to Extras".

Local fallback: if the edge call fails, fall back to the existing `findListMatch` token logic so the feature still works offline.

## 5. New edge function: `supabase/functions/match-list-item/index.ts`

- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) using tool calling for structured output.
- System prompt: "You decide whether a scanned grocery product matches any item on a shopping list. A match means at least one meaningful word in the scanned product name corresponds to a word/concept in a list item (e.g. '2% Whole Milk' matches 'milk', 'Boneless chicken thighs' matches 'chicken'). Pick the single best match or none."
- Tool schema returns `{ match_id: string | null }` chosen from the provided list IDs.
- Handles 429/402 and returns `{ matchId: null, error }` so the client can fall back.
- CORS headers + `verify_jwt = true` (default).

## 6. Data flow notes

- The existing list-load effect in `ActiveTrip` already fetches `listItems`; reuse it.
- "Extras" is derived from `trip_items` whose name didn't match — track this client-side via the `extras` state set during scanning. (No schema change needed.) On page refresh extras reset to empty; this is acceptable for the active session.
- Manual checkbox toggling in the list updates Supabase the same way `ListDetail.tsx` does.

## Files

- edit `src/components/BottomNav.tsx` — hide on `/trip`
- edit `src/pages/ActiveTrip.tsx` — full-screen list, checkboxes, extras tray, red badge, AI match call
- new `supabase/functions/match-list-item/index.ts` — Gemini-backed matcher
- (no DB migration, no `config.toml` changes needed)