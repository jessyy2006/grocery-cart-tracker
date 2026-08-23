# Receipt scanner: match the item scanner UI + manual entry

## Goal

Make the "scan a previous receipt" camera screen visually identical to the barcode item scanner, and add an "enter manually" path for logging a past grocery run without a photo.

## What changes on screen

Receipt capture screen adopts the item-scanner treatment exactly:

- Same close button: square-ish icon button in the top-left using the app's dark button variant, with iOS safe-area top spacing (not a translucent circle pinned to the very edge).
- Same overlay stack, in the same order and spacing: frame box, caption, then the "enter manually" button underneath.
- Same caption style as the barcode screen (plain light text, no dark pill background) reading "Center your receipt in the frame".
- Same frame styling (rounded border, light stroke). Only difference: the receipt box stays tall/portrait, sized as it is today.
- No "enter manually" button.

Kept as-is functionally: the shutter button and the gallery/upload button at the bottom. No auto-capture — the user taps the shutter, exactly like today. the shutter button should be redesigned to have the same kind of thin outline the enter manually button in the scan barcode UI does.

## Technical notes

- `src/pages/ScanReceipt.tsx`: restyle the capture-stage overlay and close button to mirror `src/components/Scanner.tsx` (shared classes, `variant="primaryDark"` buttons, `pt-[max(env(safe-area-inset-top),12px)]`).
- Guard the review save path so a manual entry with no parsed payload still saves (it currently assumes `parsed` exists for a few derived values such as the parsed total).
- No schema, edge function, or navigation changes.

## Out of scope

- Auto-capture / frame detection
- Changing the review form layout