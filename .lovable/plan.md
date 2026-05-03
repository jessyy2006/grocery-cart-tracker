I understand: the barcode stub is still behaving like a draggable piece that often snaps back instead of tearing. I inspected `src/components/finance/ReceiptView.tsx`; the core issue is that the gesture is still gated by pointer capture + direction locking + a 35% `window.innerWidth` threshold, and it only listens on the moving stub itself, so the interaction can be lost/cancelled before completion.

Plan:

1. Simplify the tear gesture contract
   - Change the tear threshold from 35% to 20% of the viewport width.
   - Count horizontal distance from wherever the thumb starts on the barcode: middle, left edge, or right edge.
   - Allow diagonal movement by making horizontal displacement the primary success condition instead of requiring a strict horizontal lock.
   - Trigger completion immediately during `pointermove` once `abs(dx) >= window.innerWidth * 0.2`.

2. Make completion reliable
   - Add a `tearCompletedRef` guard so once the threshold is crossed, the stub cannot bounce back or be reset by a later pointer-up/cancel event.
   - Ensure `finishSwipe(true)` sets the torn state, clears pointer tracking, fires haptics, animates the stub falling away, and opens the share/save dialog every time.
   - Prevent `onPointerCancel` from resetting the stub after completion has started.

3. Make the touch target more forgiving
   - Keep the whole barcode stub as the interactive zone.
   - Set the interactive stub to `touch-action: none` while dragging so the browser’s scroll handling does not cancel horizontal swipes.
   - Keep the movement visual subtle during drag, but make the automatic tear animation decisive once triggered.

4. Preserve current export/share behavior
   - Do not change the receipt-only PNG export path.
   - Keep the dialog with Save image and Share buttons.
   - Keep haptics using the Web Vibration API where supported; note that iOS Safari does not support vibration, but Android/compatible browsers will buzz.

Files to update:
- `src/components/finance/ReceiptView.tsx`

Risks / checks:
- `touch-action: none` on the barcode means dragging on the barcode prioritizes tearing over page scroll, which is desired here.
- The threshold on the current 402px viewport becomes ~80px, so a short thumb movement should be enough to tear automatically.
- I’ll keep the code minimal and localized to the receipt gesture handlers to avoid regressions elsewhere.