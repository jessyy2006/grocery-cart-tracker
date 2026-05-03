# Active trip fixes + trip start flow

## 1. Disable manual toggle on auto-checked items
In `src/pages/ActiveTrip.tsx` the list rows render a `<Checkbox>` regardless of how the item became checked. Replace the checkbox with a conditional render:
- If `it.checked_at` is set → render nothing in the checkbox slot (item just shows greyed/strikethrough name + price). The user can no longer toggle it back on.
- If unchecked → render the existing `<Checkbox>` so the user can still manually mark items they grabbed without scanning.

`toggleListItem` keeps working for the manual-check case (only invoked from the unchecked-state checkbox).

## 2. Dynamic color on the "checked / total" tag
Currently the pill in the footer is hard-coded to `bg-accent`. Compute counts and pick a color:

```
const checked = listItems.filter(i => i.checked_at).length;
const total = listItems.length;
// extras count = items in `extras` state (already tracked)
const denom = total;
const numer = checked + extras.length; // total scanned/checked-off so far
```

Color rules for the pill:
- `numer > denom` → red (`bg-red-500 text-white`)
- `numer === denom && denom > 0` → green (current `bg-accent text-accent-foreground`)
- otherwise → grey (`bg-muted text-muted-foreground`)

Display text stays `checked / total` (extras are already surfaced via the red badge in the header, so the tag itself reflects list progress; it only flips red when the combined count exceeds the list size).

## 3. Route through store picker after starting a trip
Today `Home.tsx` inserts a `trips` row immediately and navigates to `/trip`, which skips `/trip/new` (StartTrip). Change the flow:

**`src/pages/Home.tsx` – `startTripWith(listId)`**
- Stop inserting into `trips`.
- Still delete any lingering `active` trips for this user and reset the chosen list's items (`checked_at`, `price_cents` to null) so the next trip starts clean.
- Stash the chosen list selection in `sessionStorage` under a known key, e.g. `pendingTrip:listId` (string uuid or the literal `"none"` for shop-freely).
- Navigate to `/trip/new`.

**`src/pages/StartTrip.tsx` – `startWith(store)`**
- After resolving/creating the `storeId`, read `sessionStorage.getItem("pendingTrip:listId")`. Convert `"none"` → `null`, otherwise use the uuid.
- Insert the `trips` row with `{ user_id, list_id }` (instead of the current `{ user_id }` only).
- Keep the existing `sessionStorage.setItem(\`trip:${trip.id}:store\`, storeId)` so `ActiveTrip` picks up the store.
- Clear `pendingTrip:listId` and navigate to `/trip`.

`ActiveTrip` already loads the active trip + its `list_id` and the stashed store id, so no changes are needed there for routing.

## Files touched
- `src/pages/ActiveTrip.tsx` — checkbox conditional + tag color logic
- `src/pages/Home.tsx` — defer trip creation, stash list choice, navigate to `/trip/new`
- `src/pages/StartTrip.tsx` — consume stashed list choice when inserting the trip
