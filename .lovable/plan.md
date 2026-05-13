## Goal
When the user types in the store search modal, fetch top 5 matching stores from the global geocoder (Nominatim) — not just filter the cached 5 km nearby list. Empty query keeps showing the nearby list.

## Changes (all in `src/pages/ActiveTrip.tsx`)

1. **New state**
   - `searchResults: NearbyStore[] | null`
   - `searching: boolean`
   - `searchError: string | null`

2. **Debounced search effect**
   - Watch `storeQuery` while modal is open.
   - If trimmed query length < 2 → clear `searchResults`, fall back to nearby list.
   - Else after ~350 ms debounce, call `searchStoresByName(query)` (already exported from `src/lib/device/geolocation.ts`).
   - Slice top 5; set `searchResults`. Handle `StoreSearchError` → `searchError`.

3. **Render logic in modal**
   - If `storeQuery.trim().length >= 2`:
     - Show `searching` spinner, `searchError`, or `searchResults` (top 5).
     - Header label: "Search results".
   - Else:
     - Show existing nearby list (unchanged), header "Nearby stores".
   - Remove the current client-side `filteredStores` filter — it conflated the two modes.

4. **No backend / schema changes.** `pickStore` already handles arbitrary `{name, address, lat, lng}` and upserts into `stores`, so global results work as-is.

## Risks
- Nominatim has a ~1 req/s usage policy; debounce + min 2 chars keeps us well under.
- Results may include non-grocery POIs (Nominatim isn't shop-filtered). Acceptable per PRD ("no matter if outside 5 km radius") — user explicitly typed it. If noise becomes a problem we can add a later filter.
