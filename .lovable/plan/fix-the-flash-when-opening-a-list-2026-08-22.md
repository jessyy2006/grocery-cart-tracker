# Fix the flash when opening a list

## What's happening

Opening a list renders the page in three visible steps instead of one:

1. The page chrome (back arrow, empty title, "0 items", ADD button) paints immediately with placeholder data.
2. The body below it swaps to a loader with no grace period, so on a fast load it reads as a blank page.
3. The real name and items arrive and everything re-renders.

The list detail page is the only main page that never adopted the shared page load gate used by Home, Lists, Finance, History and Profile. That gate holds the entire page — header included — until data resolves, and waits 200ms before showing a loader so quick loads never blink.

## The fix

Wrap the whole list detail page in the shared load gate, driven by the existing `ready` state, and drop the inline loader that currently sits below the header. Nothing paints until the list name, items and active-run check have all resolved; if that takes under 200ms the page simply appears at once with no loader.

## Technical notes

- `src/pages/ListDetail.tsx`: wrap the top-level return in `PageLoadGate ready={ready}`; remove the `!ready ? MarketLoader : ...` branch and the now-unused `MarketLoader` import.
- The existing data effect already sets `ready` only after the lists/items/trips queries settle, so no fetch changes are needed.
- Keep the current auth guard behaviour: while `user` is still resolving, `ready` stays false and the gate holds the page.
