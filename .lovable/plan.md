## Goal

Kill the per-click "flicker" the user is seeing and replace abrupt route swaps with smooth, springy, "farmers market" motion. Add tactile feedback on cards, FAB, bottom-sheet, and nav.

## Why it currently flickers

1. **No transition between routes** — `<Routes>` swaps the tree synchronously. Each navigation tears down the page and re-paints `bg-background` (cream) + the dotted radial-gradient texture in one frame, which reads as a flash.
2. **Body background-image repaints on every layout change** — two stacked `radial-gradient` patterns on `body` are expensive; they re-tile when content height changes during a route swap.
3. **Buttons/cards have only color transitions** — no scale/opacity easing, so taps feel "stuttery."
4. **Drawer (vaul) uses default timing** — bottom-sheet enters fast/linear, exits abrupt.
5. **AppLayout `<main>`** has no min-height, so when a short page replaces a tall page the viewport jumps before the new content lays out.

## Fix Plan

### 1. Page transition wrapper (root cause of flicker)

- Add `src/components/PageTransition.tsx`: a small framer-motion wrapper using `AnimatePresence mode="wait"` keyed on `location.pathname`.
- Motion preset (playful but quick, no parallax):
  - enter: `opacity 0 → 1`, `y: 8 → 0`
  - exit: `opacity 1 → 0`, `y: 0 → -4`
  - transition: `{ type: "spring", stiffness: 380, damping: 34, mass: 0.7 }` for y; `duration: 0.18` ease-out for opacity
- Mount inside `AppLayout` around `<Outlet />` so onboarding pages are unaffected.
- Wrap `<Routes>` with `useLocation()`-keyed `AnimatePresence` at the layout level only (the existing route tree stays).

### 2. Stabilize the canvas (stops the cream flash)

- In `AppLayout`:
  - Add `min-h-dvh` to `<main>` and `relative isolate` so background paints once.
  - Move the body texture from `body` to a fixed, GPU-composited pseudo-layer:
    ```css
    body::before { content:""; position:fixed; inset:0; z-index:-1;
      background-image: …same two radial gradients…; pointer-events:none;
      will-change: transform; }
    ```
  - Remove `background-image` from `body` itself. Result: route swaps no longer repaint the texture.
- Add `overflow-anchor: none` on `<main>` to prevent scroll-jump.

### 3. Tactile micro-interactions

- **Button (`ui/button.tsx`)**: keep `active:scale-[0.98]`, add `transition-[transform,background-color,box-shadow] duration-150 ease-out`, and `motion-reduce:transition-none`. Hero variant: tiny `hover:-translate-y-[1px]` already present — keep, but transition `transform` not `all`.
- **Card taps** (Home recent trips, Lists rows, Drawer options): wrap interactive cards in `motion.button` with `whileTap={{ scale: 0.985 }}` and `transition={{ type: "spring", stiffness: 500, damping: 30 }}`. Apply via a small helper `TapCard` in `src/components/TapCard.tsx` so we don't repeat motion props.
- **FAB** (`FloatingActionButton.tsx`): convert to `motion.button`, `whileTap={{ scale: 0.94 }}`, `whileHover={{ y: -2 }}`, spring 420/26. Add a subtle "wiggle" on mount: `initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}` once, spring 320/18.
- **BottomNav pill**: already uses `layoutId` — bump spring to `{ stiffness: 420, damping: 32 }` and add `whileTap={{ scale: 0.92 }}` on the NavLink children for a satisfying press.

### 4. Bottom-sheet polish

- In `ui/drawer.tsx`:
  - `DrawerContent`: switch handle to a chartreuse-tinted bar `bg-muted-foreground/30`, widen to `w-12 h-1.5`, add `mt-3 mb-1`.
  - Add `data-[state=open]:animate-in data-[state=closed]:animate-out` and `slide-in-from-bottom-4 fade-in-0 duration-300` / `slide-out-to-bottom-2 fade-out-0 duration-200` so open/close has spring-like easing.
  - Switch `DrawerOverlay` to `bg-foreground/40 backdrop-blur-sm` so it doesn't slam to pure black on a light app (this alone removes a major source of perceived flicker when opening/closing the sheet).

### 5. Reduced motion

- Respect `prefers-reduced-motion`: PageTransition collapses to a 120ms opacity-only fade, and all `whileTap/whileHover` become no-ops (use framer-motion's `useReducedMotion`).

## Files touched (frontend only, no logic changes)

- new: `src/components/PageTransition.tsx`
- new: `src/components/TapCard.tsx`
- edit: `src/components/AppLayout.tsx` (wrap Outlet in PageTransition, min-h, isolation)
- edit: `src/index.css` (move texture to `body::before`, drop from `body`)
- edit: `src/components/FloatingActionButton.tsx` (motion + spring)
- edit: `src/components/BottomNav.tsx` (whileTap, tuned spring)
- edit: `src/components/ui/drawer.tsx` (overlay color, handle, anim classes)
- edit: `src/components/ui/button.tsx` (scoped transition properties)
- edit: `src/pages/Home.tsx`, `src/pages/Lists.tsx`, `src/pages/ListDetail.tsx`, `src/pages/History.tsx`, `src/pages/Finance.tsx` — swap tap-target `<button>` cards for `TapCard` (visual props unchanged).

## Out of scope

- No route/structure changes, no feature/copy/logic changes, no DB or backend changes, no new pages, no dark-mode work.

## Verification

- Click through Home → Lists → ListDetail → Finance → History → Profile and back: expect a 180ms cross-fade with a tiny lift, no cream flash, no texture re-tile.
- Tap any list row / hero card / FAB: expect a quick spring-press, no double-paint.
- Open and close the Start-a-trip sheet: expect soft blurred backdrop, springy in/out, no black flash.
