# Receipt overlay polish

## Root cause for issues #1 and #3

`PrintedReceiptOverlay` renders inside `<PageTransition>`, which wraps children in a `motion.div` that applies a `transform` (the page-enter `y` animation). A CSS `transform` on an ancestor turns `position: fixed` into "fixed relative to that ancestor", so:

- The overlay's `fixed inset-0` no longer covers the full viewport — the device status-bar area (above the page container) and the bottom safe-area where the green Done button sits are left uncovered.
- This is the same root cause we fixed for the FAB. The fix is the same: render through a React portal to `document.body`.

## Changes (single file: `src/components/trip/PrintedReceiptOverlay.tsx`)

1. **Portal to body.** Import `createPortal` from `react-dom`. Wrap the entire `<AnimatePresence>` return in `createPortal(..., document.body)`. This guarantees `fixed inset-0` covers the true viewport — status bar and bottom safe-area included — and the Done/replacement button sits *inside* the dimmed area rather than below it.
2. **Scrollable items list.** Restructure the receipt body so the items list scrolls inside the receipt instead of capping at 8 with "+N more":
  - Receipt becomes a flex column with a max height (e.g. `max-h-[80vh]`).
  - Header (store/date), totals/insights, and bag-tab footer stay fixed.
  - The items section becomes a flex-1 `overflow-y-auto` region with momentum scrolling (`-webkit-overflow-scrolling: touch`) and a subtle top/bottom mask to hint scrollability.
  - Remove the `MAX = 8` cap and the "+N more" row — render all items, animating in only the first ~8 to keep the printing animation snappy; the rest fade in together once visible.
3. **Replace green Done button with a paper-bag tab.**
  - Remove the current bottom-anchored `<Button>` block.
  - Attach a new footer *to the bottom edge of the receipt sheet itself* (not pinned to viewport): a wide, low-profile tab shaped like a grocery-bag handle cutout. Implementation: a div with the receipt's paper color on the outside, an inner pill-shaped cutout (rounded oval) representing the bag handle, surrounded by a dark charcoal (`hsl(var(--foreground))`-derived deep tone, not green) tab body. Use a small SVG/clip-path for the handle oval to keep it geometric and minimal.
  - Label: "Collect your receipt" in small uppercase tracking-wider text, charcoal-on-light or light-on-charcoal depending on which side of the cutout the label sits. Keep typography in the existing mono receipt font for cohesion.
  - The entire tab is a `<button>` that calls `onDismiss` (still gated by the `ready` flag so it only activates after the print animation finishes).
  - Add a subtle `whileTap` scale to keep it tactile.  
    
  4. remove the darkened rectngle edge that is visible behind the jagged edges of the reciept. the reciept should be a PNG with no background behind it.

## Visual reference (ASCII)

```text
 ┌────────────────────────────┐
 │  receipt content…          │
 │  (scrollable items area)   │
 │  totals / insights         │
 ├────────────────────────────┤  ← jagged edge (kept)
 │  ███████  ⌒⌒⌒  ███████    │  ← bag tab: charcoal w/ handle cutout
 │     Collect your receipt    │
 └────────────────────────────┘
```

## Out of scope

- No changes to `ActiveTrip.tsx` data/save logic.
- No changes to monthly `ReceiptView` on the Finance page.
- No new design tokens; reuse existing `--receipt-paper`, `--foreground`, `--muted-foreground`.