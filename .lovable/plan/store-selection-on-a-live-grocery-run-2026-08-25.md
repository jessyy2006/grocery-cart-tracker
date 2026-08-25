# Store selection on a live grocery run

Replace the broken nearby-store lookup with a simple manual entry flow, and move the entry point to a location pin in the top right of the trip header.

## Why the current flow fails

The nearby search runs entirely in the browser: it asks for GPS, queries Overpass for grocery shops, then reverse-geocodes each result through Nominatim with a 1.1s pause between calls, and **drops any store where it can't resolve a city**. Any of GPS denial, Overpass rate limits, or missing address tags produces "Couldn't find nearby stores". Manual entry sidesteps all of it.

## What changes

**Header (trip screen)**
- Add a location-pin button in the top-right slot (currently an empty spacer), 44px tap target, matching the exit button's styling.
- Tapping the pin opens the store sheet. The list title is no longer tappable — it becomes plain text (store name still shown next to it once one is picked).
- Pin renders filled/primary when a store is set, muted when not.

**Store sheet**
- Title: "add store" / "change store". Description: "type the store name for this trip."
- One text input for the store name, plus an optional address line? No — name only, to keep it fast.
- Below the input: the user's previously saved stores (from the `stores` table), tappable to select in one tap. Typing filters that list.
- Primary button "save store" creates the store if the typed name doesn't already exist for that user, then attaches it to the trip. Disabled when the input is empty and nothing is selected.
- Keep "remove current store" when one is set.
- Empty state when the user has no saved stores yet: "no saved stores yet — type one above."

**Cleanup**
- Remove the geolocation/Overpass/Nominatim calls from the trip screen: `openStoreModal` GPS path, the debounced `searchStoresByName` effect, and the `nearbyStores` / `searchResults` / `storeError` / `searchError` / `loadingStores` / `searching` state.
- Existing selection logic (`pickStore`: reuse an existing store row by case-insensitive name, else insert, then persist to `sessionStorage`) is kept as-is and reused.

## Technical notes

- All edits are in `src/pages/ActiveTrip.tsx`. No schema changes; `stores` already has name/address/lat/lng with per-user RLS.
- `src/lib/device/geolocation.ts` and its tests stay on disk but become unused by the trip screen. I'll leave them in place so the nearby lookup can be revived later (Google Places would be the path).
- Saved stores are loaded once when the sheet first opens, ordered by name.
