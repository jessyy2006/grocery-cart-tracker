# Grocery Store Locator – Fixes

Stay on free APIs (Overpass + Nominatim, both OpenStreetMap). No paid keys. Three targeted changes.

## 1. Complete addresses for every store (`src/lib/device/geolocation.ts`)

Many OSM nodes don't have `addr:*` tags, which is why some entries show no address. Fix in two stages:

- **Stage A — query enrichment:** Switch the Overpass query to also pull `nwr` (nodes/ways/relations) and request `out center tags;` so we always get tag data plus center coords.
- **Stage B — reverse geocode fallback:** After parsing, for any store missing `street` or `city`, call Nominatim `reverse?lat=..&lon=..&format=json&addressdetails=1` to fill in `street` + `city`. 
  - Run sequentially with a small delay (Nominatim usage policy = max 1 req/s, no key required).
  - Cap fallback lookups to the top 8 stores we'll actually display (we already slice to 8 in `StartTrip.tsx`) — done by slicing *before* reverse geocoding.
  - Cache reverse results in `sessionStorage` keyed by rounded lat/lng to avoid repeat calls.
- **Address format:** Always `"<street>, <city>"` (drop country to match the cleanest entries). Skip the store entirely if both stages fail to produce at least a city — better to omit than show a half-address.

## 2. Stricter grocery-only filter, 5 km radius

In `findNearbyStores`:

- Bump default `radiusMeters` from 600 → **5000**.
- Tighten the Overpass filter to grocery-only categories and explicitly exclude noise:
  ```
  node["shop"~"^(supermarket|greengrocer|grocery|health_food|farm)$"]
      ["shop"!~"^(gift|souvenir|dry_cleaning|laundry|convenience)$"]
      (around:5000,lat,lng);
  ```
  Drop `convenience` (was sweeping in gas-station shops). Also query `way` and `relation` with the same filter.
- Add a JS-side allowlist guard in `parseOverpass` as a second line of defense: only keep `el.tags.shop` ∈ {supermarket, greengrocer, grocery, health_food, farm, market, food}.
- Sort by distance (Haversine) so the closest grocery stores surface first; cap to 25 from Overpass, keep top 8 closest matches in the UI as today.

## 3. Selection requires explicit "Start Trip" confirmation (`src/pages/StartTrip.tsx`)

Currently `StoreCard` calls `startWith(s)` on click. Change the flow:

- Add `selectedStore` state (`NearbyStore | savedStore | { name, custom: true } | null`).
- `StoreCard` click → `setSelectedStore(s)` only. Visually highlight selected card (border-primary + bg-primary/5).
- The "Or type a name" section sets `selectedStore = { name: custom.trim() }` when the user types (button there becomes a normal selector, not an immediate start).
- Add a sticky bottom **"Start Trip"** button (full-width, primary), disabled when `!selectedStore || creating`. Pressing it runs the existing `startWith(selectedStore)` logic (which handles dedup, insert, navigate to `/trip`).
- Keep existing back-navigation behavior unchanged.

## Files touched

- `src/lib/device/geolocation.ts` — query, filter, reverse-geocode fallback, distance sort.
- `src/pages/StartTrip.tsx` — selection state, highlight, Start Trip button, removed click-to-start.

## Risks / notes

- Nominatim rate limit (1 req/s). Mitigated by capping to ≤8 fallback calls, sequential with 1.1s spacing, sessionStorage cache. Adds up to ~8s worst case on first load if many stores lack tags — acceptable, runs after initial Overpass response so the list can render progressively (we'll re-render once enrichment completes).
- Existing `geolocation.test.ts` may need updates for the new filter signature; will adjust to keep tests green.
- No DB / RLS / auth changes.