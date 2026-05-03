I understand the current receipt is close visually, but there’s still a right-side white sliver and the tear interaction isn’t producing the expected share/save flow. I’ll keep the receipt design intact and focus this pass on the artifact, reliable gesture completion, a real tear-off animation, and a modal with Save / Share actions.

## Plan

### 1. Remove the right-side white rectangle
- Update `src/components/finance/ReceiptView.tsx` so the exported receipt wrapper clips its own content cleanly.
- Remove/adjust the current `drop-shadow(...)` filter if it is contributing to a rendered edge artifact, replacing it with a normal shadow wrapper that doesn’t create a vertical white strip.
- Ensure jagged SVG edges use the exact same width behavior as the body and don’t leave transparent/filled overflow at the right edge.

### 2. Make the barcode stub tear off visibly
- Split the bottom barcode section into a dedicated “stub” element below the perforation line.
- On a completed horizontal swipe, animate only that stub away from the receipt:
  - translate horizontally in the swipe direction
  - slightly rotate
  - fade out and drop down a bit to read as “falling off”
- Keep the main receipt body stationary so it feels like the perforated barcode piece is tearing away.

### 3. Fix swipe completion reliability
- Replace the current percent-only pointer logic with a more robust swipe state:
  - track `pointerId`, `startX`, `startY`, latest `dx`, and swipe direction in refs
  - compute completion from absolute pixel distance, with a realistic threshold for a 390–414px phone viewport
  - support both left-to-right and right-to-left swipes
  - keep vertical scrolling working when the user starts moving mostly vertically
- Expand the active hit target to the full perforation + barcode area.
- Add `onTouchStart/onTouchMove/onTouchEnd` fallback if needed so iOS Safari doesn’t silently miss pointer-event capture.

### 4. Add post-swipe action pop-up
- Add a receipt export dialog in `ReceiptView.tsx` using the existing `src/components/ui/dialog.tsx` and `src/components/ui/button.tsx` components.
- When the swipe reaches completion:
  - play the stub tear animation
  - then open a dialog with two buttons:
    - `Save image`: generate the PNG and download it
    - `Share`: generate the PNG and call `navigator.share({ files: [...] })` when supported
- If the browser/device does not support file sharing, show a clear toast and keep Save available.

### 5. Export clean receipt image
- Capture the full receipt body and jagged edges, excluding:
  - helper text below the receipt
  - drag/progress overlay
  - modal UI
- For export, temporarily render/capture the barcode stub in its original attached position even if the visible stub has torn away, so the saved/shared PNG is a clean full receipt.

### 6. Test in mobile preview
- Verify at the current mobile viewport:
  - no right-side white sliver
  - swipe across the barcode area progresses and completes
  - barcode stub visibly tears/falls away
  - dialog appears after completion
  - Save triggers a PNG download fallback
  - Share attempts native file share when supported

## Important limitation
Showing the true iOS share sheet is only possible on iOS Safari / compatible mobile browsers using the Web Share API with files. The desktop/preview browser may not show the iOS sheet, so I’ll implement the correct API path plus a Save fallback and user-facing message when native sharing is unavailable.