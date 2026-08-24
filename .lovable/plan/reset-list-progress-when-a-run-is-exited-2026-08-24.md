# Reset list progress when a run is exited

## What's actually happening

Check-offs during a live run are stored in a per-trip snapshot (`trip_planned_items`), not on the list itself.

- Tapping the X → "Exit" already deletes the trip, and the snapshot cascades away. That path is clean.
- The bug is the other way out: leaving the run with the back arrow or a tab switch leaves the trip `active`. Later, "start grocery run" from a list finds that active trip and reuses it — old check-offs and prices included, even though you never ended it.

## The fix

Starting a run from a list decides based on where the unfinished run came from:

- Unfinished run came from **this same list** → resume it (progress kept, as today).
- Unfinished run came from a **different list** or a free trip → discard it (delete the trip and its snapshot) and start a fresh run with a clean snapshot of this list.

Also strengthen the explicit Exit action so nothing can survive it: clear the trip, its snapshot, its scanned items, and any stashed store for that trip.

## Technical notes

- `src/pages/ListDetail.tsx` → `startRun`: select the latest active trip with `id, list_id`. If `list_id === id`, keep current behaviour (`snapshotListIntoTrip` is idempotent, so nothing is duplicated). Otherwise `delete` that trip row (cascade removes `trip_planned_items` and `trip_items`), remove its `sessionStorage` store key, then insert a new trip and snapshot.
- `src/pages/ActiveTrip.tsx` → `exitTrip`: keep the trip delete (cascade handles children) and also clear the stashed store key; no writes back to `shopping_list_items`, so the list stays untouched.
- No schema changes needed — `trip_planned_items.trip_id` and `trip_items.trip_id` already cascade on delete.
- `Home.tsx`'s "start trip" path already deletes active trips, so it stays as is.
