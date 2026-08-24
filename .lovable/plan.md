# Lower + narrower floating tab bar

Goal: match the iOS liquid-glass tab bar position — sitting closer to the bottom edge, slightly inset from the screen sides.

## Changes (`src/components/BottomNav.tsx`)

- Bottom offset: replace `calc(env(safe-area-inset-bottom) + 12px)` with `max(env(safe-area-inset-bottom), 8px)` so the bar drops ~12px lower while still clearing the home indicator on devices that have one.
- Width: change horizontal inset from `mx-4` to `mx-6` and cap the bar with `max-w-[420px] mx-auto`, so it reads as a narrower floating pill rather than near-edge-to-edge.
- Keep everything else identical: frosted blur, `rounded-[22px]`, 4 icon+label tabs, active forest-green tint, press scale.

## Notes

- `AppLayout` page padding (`pb-24`) stays as-is; the bar gets shorter in vertical offset only, so no content is newly obscured.
