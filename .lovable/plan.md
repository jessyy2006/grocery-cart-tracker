## Problem

In `src/pages/Finance.tsx` (lines 762–768), the 6-month chart's y-axis column uses `-translate-x-5` (−20px) to push the `$0 / $50 / $100` labels outside the page's `px-5` padding. That makes the labels hug the screen edge and simultaneously shoves the bars/gridlines into the right portion of the screen.

```text
[page px-5] [-20px y-axis] [gap-2] [bars px-1 ............]
   ^ labels escape padding         ^ bars start ~30px in from left
```

## Fix

Two small changes inside the chart row (and the matching label row below it):

1. Remove `-translate-x-5` from the y-axis column so labels sit inside the page's `px-5` margin like every other section.
2. Tighten the y-axis column width (`w-10` → `w-8`) and drop the row's `gap-2` so the bars container expands to the full remaining width, with gridlines spanning edge-to-edge between page margins.
3. Mirror the same width/gap change on the month-label row directly below (lines 824–827) so the month names stay aligned under their bars.

### Minimal diff

```tsx
// Chart row
- <div className="flex gap-2">
-   <div className="flex h-40 w-10 -translate-x-5 flex-col justify-between py-0.5 ...">
+ <div className="flex">
+   <div className="flex h-40 w-8 flex-col justify-between py-0.5 ...">
      {yTicks.map(...)}
    </div>
-   <div className="relative flex h-40 flex-1 items-stretch gap-3 px-1">
+   <div className="relative flex h-40 flex-1 items-stretch gap-3">
      ...
    </div>
  </div>

// Month-label row
- <div className="-mt-3 flex gap-2">
-   <div className="w-10" />
-   <div className="flex flex-1 gap-3 border-t ... px-1 pt-1.5">
+ <div className="-mt-3 flex">
+   <div className="w-8" />
+   <div className="flex flex-1 gap-3 border-t ... pt-1.5">
```

## Risk / verification

- Visual-only change, no data or layout outside the chart section.
- Verify on 390px viewport that: labels sit at the same x as the section heading, gridlines stretch edge-to-edge, and month names remain centered under their bars.

## Open question

None — the screenshot annotation is unambiguous. Proceeding on approval.