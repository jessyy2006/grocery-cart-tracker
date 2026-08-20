# Stop the loader flash on tab navigation

## What's happening

Home, Lists, Finance, and History each gate their whole page behind a `ready` flag. Their data queries usually resolve in a fraction of a second, so the sprout loader mounts and unmounts almost immediately — a brief blink before the page fades in. The page rendering itself is correct; only the loader is too eager.

## The fix

Give the loader a short grace period: it only appears if data is still pending after ~200ms. Fast navigations show nothing at all, then the finished page fades in as it does today. Slow loads behave exactly as they do now.

## Technical notes

- `src/components/PageLoadGate.tsx`: add a `delayMs` prop (default 200). While `!ready`, run a timer; render `null` until it elapses, then render `MarketLoader`. Reset the timer whenever `ready` flips back to false.
- No changes needed in `Home.tsx`, `Lists.tsx`, `Finance.tsx`, or `History.tsx` — they inherit the new default.
- Fade-in on ready stays unchanged, still respecting `useReducedMotion`.

## Out of scope

No changes to data fetching, routing, or `PageTransition`.
