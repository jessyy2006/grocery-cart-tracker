## Plan

### 1. Anchor the Lists CTA above the floating nav
- Update the Lists page so `+ New list` is a bottom-centered fixed action button instead of right-aligned.
- Keep it above the floating tab bar using the same safe-area spacing as the nav.
- Preserve the empty-state inline “New list” button; only change the FAB shown when lists exist.

### 2. Fix the page-load glitch / placeholder pop-in
**Root cause found:** most pages render their “empty” default state immediately, then replace it after async data returns. Examples:
- `Lists` starts with `lists = []`, so it briefly shows “No lists yet.”
- `History` starts with `rows = []`, so it briefly shows “No saved trips yet.”
- `Home` starts with `monthSpend = 0` and `recent = []`, so the dashboard briefly shows zero/empty content.
- `ListDetail` starts with `listName = ""` and `items = []`, so the header and empty list message appear before real data.
- `TripDetail` renders partial structure before `trip` and `items` finish loading.
- `ActiveTrip` renders `null` until `tripId`, then can show the free-shop/list empty message before the linked list finishes loading.
- `Finance` uses skeleton boxes, which avoids wrong values but still creates the “placeholder boxes then real values” flash.

**Fix:** add explicit page readiness states and only show final content once the required first load has completed.
- Create a small reusable `MarketLoader` / `PageLoadingState` component with the farmers-market visual language, not generic grey skeleton boxes.
- Replace premature empty states with loading gates on `Home`, `Lists`, `History`, `ListDetail`, `TripDetail`, `Finance`, and `ActiveTrip`.
- Keep layout dimensions stable during loading with `min-h`/`flex-1` wrappers so route transitions don’t collapse or jump.
- Add cancellation guards to async effects so stale requests cannot overwrite newer page state after quick navigation.
- For `Finance`, replace the skeleton-box stack with the branded loader to avoid the placeholder-to-content flicker.

### 3. Anchor the Active Trip “Cart Total” card to the bottom
- Rework `ActiveTrip` as a fixed-height screen layout:
  - Header stays at the top.
  - Shopping list/content area scrolls independently.
  - Cart Total footer is pinned to the bottom of the viewport.
- Give the scroll area bottom padding equal to the checkout footer height so list items never hide behind it.
- Adjust the footer styling to match the screenshot: a contained bottom card with standard horizontal padding, safe-area-aware bottom spacing, and the scan button sitting at the design-system margin from the bottom.
- Use responsive spacing so the footer sits correctly on small iPhones and taller screens.

### Technical notes
- Frontend-only changes; no backend/database changes.
- Files expected: `src/pages/Lists.tsx`, `src/pages/Home.tsx`, `src/pages/History.tsx`, `src/pages/ListDetail.tsx`, `src/pages/TripDetail.tsx`, `src/pages/Finance.tsx`, `src/pages/ActiveTrip.tsx`, plus one small shared loading component.
- No route or feature changes; this is presentation/loading behavior and layout stabilization only.