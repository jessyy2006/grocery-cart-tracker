## Fixes

### 1. Profile header flash ("profile" → "Jessica's profile")

`src/pages/Profile.tsx` uses `useProfile()` but renders the header immediately. While `firstName` is loading, it falls through to the bare "Profile" label.

**Fix:** Pull `loading` out of `useProfile` (already exposed) and render a skeleton placeholder for the H1 until `loading === false`. Use an invisible `<span className="invisible">Placeholder</span>` (or a `Skeleton` component) so the layout doesn't shift, then swap in `${firstName}'s Profile` or `Profile` once loaded. Same treatment for Home's "Welcome back" subtitle to keep behavior consistent.

### 2. Margins / safe-area spacing (match Rocket Money reference)

Rocket Money sits content tighter to the status bar at the top and keeps the bottom nav close to the home indicator. Our current spacing has too much top padding inside pages and too much bottom padding under the nav.

**Fix:**

- `src/components/BottomNav.tsx`: tighten the `<ul>` from `py-2` to `pt-1.5 pb-0` (the `safe-bottom` class on the `<nav>` already covers the home indicator). Result: nav hugs the indicator like Rocket Money.
- `src/components/AppLayout.tsx`: keep `safe-top` on `<main>` but rely on per-page padding only — no extra change needed.
- Page-level top padding: change `pt-6` → `pt-2` on Home, Lists, Profile, Finance, History (header already provides visual breathing room and matches Rocket Money's compact top).
- `src/pages/onboarding/Layout.tsx`: 
  - Outer container: `pt-6 safe-top` → `pt-2 safe-top` (move header up so it isn't pushed too far down).
  - Inner wrapper around progress bar: change `pt-4` → `pt-6` (bumps the progress bar slightly down within the now-tighter container, giving it the small offset the user asked for).
  - Reduce `mt-8` on the header block to `mt-6` so the title doesn't sit too low after the progress bar moves.

### 3. Light-gray strip between "Start grocery run" and bottom nav

`src/pages/ListDetail.tsx` footer has `safe-bottom mb-[16px]`. The `mb-[16px]` plus the BottomNav's own `safe-bottom`/`py-2` creates the visible gray gap.

**Fix:** Remove `mb-[16px]` and remove `safe-bottom` from the footer (BottomNav already handles the safe area). Change `p-4` → `px-4 pt-3 pb-3`. The `border-t` will sit directly above the nav with no gray strip.

### 4. Onboarding intro "Today's list" demo card

`src/pages/onboarding/Intro.tsx` shows a flat 5-item list with no category headers. The user wants it to look like the real list UI (image-6): grouped by category with an emoji header per group, longer.

**Fix:** Replace the flat array with a grouped structure mirroring the real list page:

```
🥛 DAIRY      → 1% Milk; Greek yogurt
🥩 MEAT       → Chicken breast (Qty 2)
🥬 PRODUCE    → Bananas; Spinach
🍞 BAKERY     → Sourdough bread (Note: Get from bakery next door!)
🥫 PANTRY     → Soy sauce, Chili oil
```

Render each group with a small uppercase emoji+label header (matching the real ListDetail styling — `text-xs font-semibold uppercase tracking-wider text-muted-foreground`) and the items underneath. Keep the existing animation. Make the card slightly taller/scrollable-clipped if needed (use `overflow-hidden` with `h-[78%]`) so it visually feels longer like the screenshot.

## Files touched

- `src/pages/Profile.tsx` (loading guard on header)
- `src/pages/Home.tsx` (loading guard on welcome text, `pt-6` → `pt-2`)
- `src/pages/Lists.tsx`, `src/pages/Finance.tsx`, `src/pages/History.tsx` (`pt-6` → `pt-2`)
- `src/components/BottomNav.tsx` (tighten padding)
- `src/pages/onboarding/Layout.tsx` (top padding + progress bar offset + header margin)
- `src/pages/ListDetail.tsx` (remove footer gap)
- `src/pages/onboarding/Intro.tsx` (grouped list demo)
- `src/hooks/useProfile.tsx` — already exposes `loading`, no change needed