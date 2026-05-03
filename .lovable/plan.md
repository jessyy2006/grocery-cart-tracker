## Problem

On **Start new trip**, the "Near you" list spins forever and never shows stores. Three root causes are likely, and the current code masks all of them:

1. **Geolocation never resolves in the preview iframe.** Lovable's preview iframe doesn't always grant `geolocation` permission. In Safari/Chrome, when permission is blocked at the iframe level, `getCurrentPosition` can hang past our 10s timeout without firing either callback.
2. **Overpass API is slow or rate-limited.** `https://overpass-api.de/api/interpreter` regularly takes 10–30s and sometimes returns 429/504. Our `fetch` has no timeout, so a slow response keeps the spinner up indefinitely.
3. **Errors are swallowed.** `StartTrip.tsx` wraps the whole flow in `try { … } catch {}` with an empty handler, so the user has no idea what failed and no way to recover. (The `finally` does set `loading=false`, so a true infinite spinner only happens when geolocation/fetch never settle — see #1 and #2.)

## Fix

### 1. Add real timeouts and split the two phases
`src/lib/device/geolocation.ts`
- `getCurrentPosition`: keep the GPS timeout but also wrap in a hard `Promise.race` (12s) so a misbehaving iframe permission still rejects.
- `findNearbyStores`: pass an `AbortController` with a 12s timeout to `fetch`. Fall back to the mirror `https://overpass.kumi.systems/api/interpreter` on first failure. Throw typed errors (`GeoPermissionError`, `GeoTimeoutError`, `StoreSearchError`) so the UI can render specific messages.
- Add a `searchStoresByName(query)` helper that hits Nominatim (`https://nominatim.openstreetmap.org/search?q=…&format=json&limit=10`) for a manual text/address fallback — no GPS needed.

### 2. Make `StartTrip.tsx` show state, not spin
- Track three independent states: `gpsState` (`idle|loading|denied|timeout|ok`), `nearbyState` (`idle|loading|error|ok`), and `savedStores`.
- Render saved stores and the "type a name" input **immediately**, before GPS resolves, so the user is never blocked.
- For the "Near you" section, show:
  - spinner while `nearbyState === "loading"`,
  - friendly error + **Retry** button on `error`/`timeout`,
  - "Location blocked — search by name instead" on `denied`, with a Nominatim-backed search box.
- Replace the silent `catch {}` with `console.error` + `toast.error` for unexpected failures.

### 3. Cache the last successful position
Store the latest coords in `sessionStorage` so a retry doesn't re-prompt for GPS, and so navigating back to `StartTrip` skips the slow geolocation call when fresh (<5 min).

## Tests

Add Vitest specs (jsdom env already configured in `vitest.config.ts`):

- `src/lib/device/geolocation.test.ts`
  - `getCurrentPosition` resolves with mocked `navigator.geolocation`.
  - `getCurrentPosition` rejects with `GeoPermissionError` when the error code is `1`.
  - `getCurrentPosition` rejects with `GeoTimeoutError` after 12s when the browser callback never fires (use fake timers).
  - `findNearbyStores` returns parsed `{name, address, lat, lng}` from a mocked Overpass response.
  - `findNearbyStores` falls back to the kumi mirror when the primary endpoint 5xxs.
  - `findNearbyStores` rejects with `StoreSearchError` when both endpoints fail or the request aborts.
  - `searchStoresByName` parses Nominatim results into the same shape.
- `src/pages/StartTrip.test.tsx` (React Testing Library)
  - Renders saved stores immediately even while GPS is still pending.
  - Shows a "Location blocked" hint when geolocation rejects with permission error.
  - Shows a Retry button on Overpass failure and re-fires the lookup when clicked.
  - Manual Nominatim search renders results and starting a trip from one creates a store + trip (Supabase client mocked).

## Files touched

- `src/lib/device/geolocation.ts` — timeouts, typed errors, mirror fallback, `searchStoresByName`.
- `src/pages/StartTrip.tsx` — granular state, error UI, retry, manual-search box, sessionStorage cache.
- `src/lib/device/geolocation.test.ts` *(new)*
- `src/pages/StartTrip.test.tsx` *(new)*

No DB or schema changes. No new dependencies.

## Note on the preview iframe

Even after this fix, GPS may stay "denied" inside Lovable's preview because the iframe's `allow="geolocation"` policy isn't always present. The new UI degrades cleanly: saved stores + manual name/address search will still work, and once the PWA is installed (or opened in a full browser tab via the preview URL), GPS will work normally.