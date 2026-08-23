# Smooth row removal in the scanned-receipt review list

## Problem

When a row is fully swiped away, it is removed from state immediately, so the rows below snap up into the gap with no transition.

## What changes

- The swiped row slides off to the left, then collapses its height to zero (fade + height) over ~180ms.
- Remaining rows glide up smoothly into the freed space instead of jumping.
- Same behavior when deleting via the trash button.
- No change to swipe thresholds, red background, or any save logic.

## Technical notes

- In `src/pages/ScanReceipt.tsx`: wrap the items `<ul>` children in `AnimatePresence` (framer-motion, already used here).
- Make `SwipeRow` render a `motion.li` with `layout` and an `exit` variant animating `height: 0, opacity: 0` with a short spring/tween; keep `_k` stable keys.
- Remove the current `setTimeout(onDelete, 140)` hand-off so deletion is driven by the exit animation instead of a timer.
