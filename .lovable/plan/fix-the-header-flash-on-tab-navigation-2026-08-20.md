# Fix the header flash on tab navigation

## What's happening

Every main page (Home, Lists, Finance, History) renders in two stages:

1. The route mounts instantly and paints its header/eyebrow with empty data.
2. A data fetch runs, and only the area *below* the header swaps from a loader to real content.

So the moment you tap a tab you get the header alone, then the page reflows as the body arrives. Home makes it worse: the greeting eyebrow renders as a blank non-breaking space while the profile loads, then pops into "Good evening, Jessica" — the visual "disappear and reappear" you're seeing. The page-transition fade also runs at mount, so it animates the half-empty shell rather than the finished page.

## The fix

Gate the *entire* page, header included, behind its ready state:

- While loading: show only the branded sprout loader, sized to fill the page area (no header, no partial layout).
- When ready: render header and content together in a single fade-in, so the page arrives all at once.

Applies to Home, Lists, Finance, and History. Home's ready state will also wait for the profile (name) so the greeting never pops in late.

## Technical notes

- Add `src/components/PageLoadGate.tsx`: takes `ready` and children; renders `<MarketLoader minHeight="80vh" />` until ready, then wraps children in a short framer-motion opacity fade (respecting `useReducedMotion`).
- `src/pages/Home.tsx` — move `PageHeader` (and the hero/recent blocks) inside the gate; change readiness to `ready && !profileLoading`; drop the `\u00a0` eyebrow placeholder.
- `src/pages/Lists.tsx` — move the `header` element and the notebook margin rule inside the gate, keeping the current `ready` flag.
- `src/pages/History.tsx` — move `PageHeader` (with the month filter) inside the gate.
- `src/pages/Finance.tsx` — move its header/eyebrow block inside the gate driven by the existing `loading` flag.
- No changes to `PageTransition`, routing, or any data fetching logic.

## Out of scope

Trip pages, list detail, and onboarding keep their current behavior.
