# Receipt scanner: match the item scanner UI + manual entry

## Goal
Make the "scan a previous receipt" camera screen visually identical to the barcode item scanner, and add an "enter manually" path for logging a past grocery run without a photo.

## What changes on screen

Receipt capture screen adopts the item-scanner treatment exactly:

- Same close button: square-ish icon button in the top-left using the app's dark button variant, with iOS safe-area top spacing (not a translucent circle pinned to the very edge).
- Same overlay stack, in the same order and spacing: frame box, caption, then the "enter manually" button underneath.
- Same caption style as the barcode screen (plain light text, no dark pill background) reading "Center your receipt in the frame".
- Same frame styling (rounded border, light stroke). Only difference: the receipt box stays tall/portrait, sized as it is today.
- Same "enter manually" button: outlined dark-tinted button with a keyboard icon, placed directly below the caption.

Kept as-is: the shutter button and the gallery/upload button at the bottom. No auto-capture — the user taps the shutter, exactly like today.

## Manual entry feature

Tapping "enter manually" skips the camera and opens the existing receipt review form with an empty draft:

- Store name (with existing store matching / "save as new store" as today)
- Date (defaults to today)
- Items list, starting with one blank row; the existing "add item" row and swipe-to-delete still work
- Same save flow as a scanned receipt, so the trip lands in history identically

No new screen, no new database work — it reuses the review stage that already exists after a scan.

## Technical notes

- `src/pages/ScanReceipt.tsx`: restyle the capture-stage overlay and close button to mirror `src/components/Scanner.tsx` (shared classes, `variant="primaryDark"` buttons, `pt-[max(env(safe-area-inset-top),12px)]`).
- Add an `enterManually()` handler that stops the camera stream, seeds empty review state (`storeName: ""`, today's date, one empty item row), and sets `stage: "review"`.
- Guard the review save path so a manual entry with no parsed payload still saves (it currently assumes `parsed` exists for a few derived values such as the parsed total).
- No schema, edge function, or navigation changes.

## Out of scope
- Auto-capture / frame detection
- Changing the review form layout
