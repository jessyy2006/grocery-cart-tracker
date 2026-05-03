# Finance Receipt View

Add a secondary **Receipt View** to the Finance tab, toggled from a control in the top-right of the page header. Card view stays the default and is unchanged.

## 1. Toggle

Top-right of `src/pages/Finance.tsx` header, next to the existing edit-budget icon button:

- Two-icon segmented control (`ToggleGroup` from `src/components/ui/toggle-group.tsx`).
  - `LayoutGrid` icon → Card view (default).
  - `Receipt` icon → Receipt view.
- Persist preference to `localStorage` key `finance:view` (`"card" | "receipt"`). Read synchronously on mount so there's no flash.
- Switching is instant — both views read the same state already loaded by the page; no refetch.

## 2. Receipt view component

New file `src/components/finance/ReceiptView.tsx`. Props: the already-derived figures from `Finance.tsx` (`budgetCents`, `monthSpend`, `tripCount`, `avgTrip`, `extrasCents`, `extrasCount`, `momDelta`, current month start/end, currency).

### Visual structure

```text
        ┌─jagged─top─┐         (SVG, straight L/R sides)
        │  paper     │
        │  content   │
        │ ── perforation ── │  (dashed line, draggable)
        │  tear stub        │
        └─jagged─bot─┘
```

- Wrapper is **not** a `Card`. A `<div>` with:
  - `bg-[#fdfaf1]` (off-white paper), subtle CSS noise via inline `background-image` data-URI (tiny SVG turbulence) at low opacity.
  - Straight vertical edges (no border-radius).
  - Top + bottom jagged edges rendered as inline SVGs (zig-zag path) using the same paper fill — full width, ~10px tall.
  - Soft drop shadow underneath for depth.
- Inner padding `px-6 py-5`, **font-mono** (Tailwind built-in), `text-sm leading-tight`, `tracking-tight`.

### Content (exact order)

```text
   MONTHLY GROCERY SUMMARY
        May 1 – May 31
   ----------------------------

   BUDGET                $600.00
   SPENT                 $482.15
   ----------------------------
   REMAINING             $117.85
        (or)
   OVER BUDGET            $42.10

   ----------------------------
   TRIPS                       7
   AVG / TRIP             $68.88
   EXTRAS                 $82.40
   EXTRA ITEMS                14
   VS LAST MONTH         -$48.20    (omit if no prior data)
   ----------------------------

   * 18% of spending was unplanned *

   Generated May 3, 2026
```

- Labels left, values right via `flex justify-between` per row + monospace for column alignment.
- Insight: single line, derived locally (no AI call) — pick the strongest of: extras % of spend, MoM % change, over/under budget %. Falls back to "Keep tracking to unlock insights." when the month has <2 trips.
- Currency rendered through existing `formatMoney`.

### Perforation + tear-to-export

- Below content: a 28px-tall row representing the perforated strip. have small text below the receipt, prompting the user to tear to export.
  - Dashed horizontal line (`border-t border-dashed border-neutral-400`) above a thin "stub" area with smaller text `← swipe to share →`.
- Pointer interaction (touch + mouse), implemented inline with `pointerdown/move/up`:
  - Track horizontal drag distance on the strip; show progress as the strip translates/rotates slightly and a width-bound highlight bar fills left→right.
  - At ≥70% width drag, commit the tear: animate the lower stub off-screen (`translateY` + slight rotate, 250ms), then trigger export popup.
- Export:
  - Add `html-to-image` dependency (~10kb, no canvas polyfills required, works on iOS Safari) and call `toPng(receiptRef.current, { pixelRatio: 3, cacheBust: true })`.
  - The toggle, page chrome, and tear-strip are excluded by passing a ref that wraps **only** the receipt body (perforation strip is hidden during capture via a `data-export="hide"` attribute and a `filter` callback).
  - Use `navigator.share({ files: [pngFile] })` when available; otherwise fall back to a download via an `<a download>` link.
  - Reset the tear animation after the share sheet closes (or immediately on fallback) so the user can swipe again.

## 3. Files touched

- **edit** `src/pages/Finance.tsx` — add view state, top-right toggle, conditional render of `ReceiptView` vs the existing card stack. Lift the already-computed derived values so both views read the same memo.
- **new** `src/components/finance/ReceiptView.tsx` — paper styling, jagged edges SVG, content rows, tear interaction, export handler.
- **package** add `html-to-image` to `dependencies`.

## 4. Out of scope

- No charts, breakdowns, or AI insights inside the receipt (PRD §6).
- No edits to backend, schema, or the existing card view contents.
- No printing flow — share/download only.

## 5. Risks

- iOS Safari `navigator.share` with files works on 16.4+; older devices fall back to download. Acceptable.
- `html-to-image` can miss web fonts; we use the system monospace stack so capture is faithful.
- Drag gesture conflicts with vertical page scroll — the strip uses `touch-action: pan-y` off and `pan-x` on, scoped to the 28px strip only, so the rest of the page scrolls normally.