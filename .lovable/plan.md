# Binder Tab Navigation + Profile Relocation

## 1. `src/components/BottomNav.tsx` — full rewrite
Replace the floating pill nav with a flush, edge-to-edge binder.

- Container: `fixed inset-x-0 bottom-0 z-30 bg-paper` (Paper White `#FFFFFF`), height capped at **48px** including the 4px tab protrusion. Add `pb-[env(safe-area-inset-bottom)]` *outside* the 48px (safe-area is separate from the visual binder).
- Boundary line: a `1px solid #E5DFD3` stroke that spans full width, sitting at the top of the 44px tab row. Implemented as an absolutely positioned `<div>` so the active tab can visually "break" it via `z-index`.
- 4 equal tabs (`grid grid-cols-4`): HOME, LISTS, FINANCE, HISTORY. Remove the Profile entry from the array.
- **Active tab**: `bg-[#143F2D] text-[#F7F5F0]`, `rounded-t-[4px]`, translated `-4px` upward (`-mt-1` + `h-[44px]`), `z-10` to cover the boundary line. Font: `font-mono font-bold text-[9px] uppercase tracking-widest`.
- **Inactive tabs**: `bg-white text-[#7C756B]`, `border border-[#E5DFD3] border-b-0`, `rounded-t-[4px]`, `py-2`. Same monospace, regular weight. Hover/active: `hover:-translate-y-0.5 transition-transform`.
- No shadows, no gradients, no icons. Text-only labels.
- Keep the existing `/trip`, `/trip/new`, `/scan-receipt` early return for fullscreen pages.

## 2. `src/components/AppLayout.tsx`
- Change non-fullscreen `main` padding from `pb-28` to `pb-14` (56px clears the 48px binder + small gap).

## 3. `src/pages/Home.tsx` — add Profile entry point
- In the `PageHeader` area, add a top-right circular `User` icon button (matching the existing `ScanLine` button pattern from the hero card, but positioned in the page header row). Place it absolutely top-right of the header so it doesn't disrupt the `eyebrow`/`title` rhythm.
- `onClick={() => navigate("/profile")}`, `aria-label="Profile"`.
- Keep the hero `ScanLine` button unchanged.

Implementation note: `PageHeader` likely doesn't accept a right-slot prop; wrap the header in a `relative` div and absolutely position the icon button at `top-3 right-5` so we don't need to modify `PageHeader.tsx`.

## 4. Routing
- Leave `/profile` route in `App.tsx` untouched (still reachable via direct URL and the new Home icon).

## Risks
- Tabs row + safe-area padding on iOS may visually exceed 48px of *colored* area; the 48px constraint applies to the binder itself, with safe-area as transparent/white extension below. Confirming that interpretation.
- Active tab "breaking" the boundary relies on z-stacking; verified by giving the tab `bg-[#143F2D]` that fully overlaps the 1px line.
- `pb-14` may feel tight on pages with sticky footer CTAs (e.g. ListDetail uses fullscreen mode so unaffected). Will spot-check Home, Lists, Finance, History.

## Out of scope
- No changes to BottomNav behavior on fullscreen routes.
- No restyling of PageHeader component itself.
- No animation library additions.
