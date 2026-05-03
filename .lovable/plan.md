I understand: the receipt export strip should visually resemble the attached travel-ticket/barcode reference, the receipt paper should have true jagged top and bottom edges on a white background, and the horizontal tear gesture needs to actually trigger share/export on mobile.

## Findings from code exploration

Affected file: `src/components/finance/ReceiptView.tsx`

Root causes:
- The current `JaggedEdge` SVG draws a filled rectangular strip with a zig-zag boundary, so it looks like a solid band instead of the receipt paper itself having a torn edge.
- The bottom jagged SVG sits inside a paper-colored wrapper, so any transparent/jagged area is visually hidden by the same paper background.
- The visible swipe target is only a 32px-tall text strip. If the user starts the swipe outside that exact strip, nothing happens.
- The gesture only counts left-to-right movement. Right-to-left swipes clamp to `0`, even though the UI text implies either direction.
- The completion check reads React state (`dragPct`) on pointer-up, which can be stale during fast thumb swipes.
- Export currently captures only the middle receipt body, not the full receipt with jagged edges and barcode.

## Implementation plan

### Phase 1 — Rebuild receipt paper shape
- Replace the current separate filled-edge SVG approach with true transparent jagged edge SVGs:
  - Top edge: transparent above, paper fill below a jagged top boundary.
  - Bottom edge: paper fill above, transparent below a jagged bottom boundary.
- Remove paper-colored backgrounds behind transparent jagged areas so the page background shows through.
- Keep the main receipt background off-white/noisy, but place it on a clean white/near-white screen background.

### Phase 2 — Replace on-receipt swipe text with barcode
- Remove `← swipe to tear & share →` from the receipt itself.
- Add a large generated barcode block in the lower receipt section, styled closer to the attached screenshot:
  - thick/thin black bars
  - high contrast
  - centered with good horizontal width
  - no extra explanatory text on the receipt
- Generate the barcode client-side without adding a dependency.
- Make the generated bars stable for the current mounted receipt/export, so the barcode does not flicker while dragging.
- Keep the instructional text below the receipt, outside the exported area.

### Phase 3 — Fix tear gesture reliability
- Expand the interactive swipe zone to cover the lower barcode/perforation area, not just a tiny 32px strip.
- Track drag progress with refs instead of only React state, so pointer-up uses the latest movement value.
- Accept both left-to-right and right-to-left horizontal swipes.
- Use a more realistic mobile threshold based on absolute pixel distance and/or percent width, so thumb swipes can trigger reliably on a 402px-wide phone viewport.
- Preserve vertical page scrolling outside the barcode/perforation zone.

### Phase 4 — Fix export capture
- Capture the full clean receipt including:
  - top jagged edge
  - receipt body
  - perforation line
  - generated barcode
  - bottom jagged edge
- Exclude only page chrome and external helper text.
- Ensure the tear animation/progress overlay does not appear in the exported PNG.
- Keep native share first, fallback download second.

### Phase 5 — Review and test
- Test in the mobile preview at the current viewport size (`402x716`).
- Verify:
  - Card/Receipt toggle still works.
  - Receipt appears on a white background with jagged top and bottom edges.
  - Barcode replaces receipt text.
  - Horizontal swipe in either direction triggers share/download.
  - Exported PNG contains the full receipt and no UI chrome.

## Files expected to change
- `src/components/finance/ReceiptView.tsx`
- Potentially `src/pages/Finance.tsx` only if spacing/background around the receipt needs minor adjustment.

## Risks
- Native share behavior varies by browser/device. I will keep the fallback download path so export still works when file sharing is unsupported.
- If the preview environment blocks downloads/share popups, the code can still be correct; I’ll note that separately during verification.