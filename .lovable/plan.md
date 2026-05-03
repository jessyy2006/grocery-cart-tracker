I understand: you want to stay web/PWA-only, save the receipt image itself, and understand why the previous approach stopped saving to Photos/Camera Roll.

## Diagnosis

The current code is trying to use the right browser capability, but two implementation details are likely breaking it:

- `src/components/finance/ReceiptView.tsx` now generates the PNG asynchronously inside the Save tap, then calls `navigator.share(...)`. In some mobile/PWA contexts, the share call can fail because the browser’s required “user activation” expires while the PNG is being rendered.
- The receipt capture targets the live torn receipt DOM while a dialog is open. The barcode stub is absolutely positioned and its container can have `height: 0`, so `toPng(..., { width, height })` can crop or miss part of the receipt. This explains why “receipt-only” export is less reliable than the old full-screen screenshot.

Also: a PWA/browser cannot silently write directly to Camera Roll without native APIs. The best web-only path is to hand an image file to the OS share sheet, where the user taps “Save Image” / “Save to Photos”.

## PWA-only save options

1. **Best option: Web Share API with a pre-generated PNG file**
   - Generate the receipt-only PNG before the user taps Save.
   - On Save tap, immediately call the native share sheet with the cached PNG file.
   - User selects “Save Image” / “Save to Photos”.

2. **Reliable fallback: show the generated PNG as an actual image**
   - If file sharing is unavailable, open a preview modal containing only the receipt PNG.
   - User long-presses the image and chooses “Save to Photos”.
   - This is usually the most reliable fallback on iOS PWAs.

3. **Download fallback**
   - Keep a normal PNG download link for desktop/unsupported browsers.
   - On mobile this often saves to Files/Downloads, not Camera Roll, so it should not be the primary mobile path.

## Implementation plan

1. **Make receipt PNG generation independent of the torn UI**
   - Refactor `generatePng` in `src/components/finance/ReceiptView.tsx` to clone/render a clean static receipt offscreen.
   - Force the barcode stub to be visible, untorn, and part of normal layout during export.
   - Remove reliance on the live dialog/torn state for capture.

2. **Pre-generate the receipt image when the share dialog opens**
   - Add export state like `preparedExport`, `exportError`, and `preparingExport`.
   - When the tear finishes and the dialog opens, generate/cache the PNG Blob/File/Data URL once.
   - Disable Save/Share until the PNG is ready.

3. **Update Save behavior for PWA/mobile**
   - On Save tap, use the cached file immediately with `navigator.share({ files: [...] })` when supported.
   - If unsupported or blocked, show an in-app image preview with clear instructions: “Long-press the receipt image, then choose Save to Photos.”
   - Keep desktop download as a fallback.

4. **Add focused tests**
   - Add/adjust tests around the export helper behavior where feasible.
   - Run the existing test suite via the project test command after changes.

## Risk / limitation

Even after this fix, web/PWA apps cannot do true one-tap silent Camera Roll writes. That requires native capabilities such as Capacitor. The plan above gives the most reliable PWA-only flow while ensuring the saved image is just the receipt.