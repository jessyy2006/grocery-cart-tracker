# Monthly receipt: stats section redesign

Goal: give the monthly grocery summary the same visual grammar as the yearly receipt (header → money block → labeled sections separated by dashed dividers → hall-of-fame rows), while keeping it short. Only `src/components/finance/ReceiptView.tsx` changes; no new data, no backend work.

## Current layout (flat)

Everything is one undifferentiated stack of `Row`s: Budget / Spent → Remaining → Trips, Avg/Trip, Impulse Spend, Impulse Rate → Biggest Category, Streak, vs Last Month. No section headers, no visual hierarchy.

## Proposed layout

```text
        MONTHLY GROCERY SUMMARY
          August 1 – August 31
- - - - - - - - - - - - - - - - - - - -
  SPENT          REMAINING       TRIPS
  $412           $88             6
- - - - - - - - - - - - - - - - - - - -
  THE NUMBERS
  Avg / Trip                     $68.67
  Impulse Spend                  $41.20
  Impulse Rate                      10%
  Streak                        3 trips
- - - - - - - - - - - - - - - - - - - -
  THE HIGHLIGHTS
  Biggest Category      🥬 Fruits & Veg
  vs Last Month                  -$32.10
- - - - - - - - - - - - - - - - - - - -
        "Plan your cart, keep your cash."
        [barcode]
          2026—AUG—FINAL
```

### 1. Three-metric header block

Reuses the yearly `Metric` component (borrowed rather than duplicated — lifted into `ReceiptPaper.tsx`): big 20px bold number over a small uppercase label, vertical hairlines between columns.

- **Spent** — month spend, whole dollars
- **Remaining** — budget minus spend; flips to **Over** with the overage amount when negative; shows `—` when no budget is set
- **Trips** — trip count

Budget itself moves out of the top block; it appears as a caption under Remaining (`of $500`) so the number keeps its context without a fourth column.

### 2. "The Numbers" section

Label styled exactly like the yearly section headers (bold, uppercase, `tracking-wider`), then the four behavioral stats as `HallRow`-style label/value pairs: Avg / Trip, Impulse Spend, Impulse Rate, Streak. Streak is omitted when under 2 trips (existing rule kept).

### 3. "The Highlights" section

Only the two contextual lines: Biggest Category and vs Last Month (signed, colored neutral like the rest — no red/green). Each is omitted when its data is absent, and the whole section disappears if both are missing, so a first-month receipt stays short.

### 4. Footer

Adds the shared quote (`pickQuote`) above the barcode, matching the yearly receipt — the monthly receipt currently has no quote line. Barcode and `2026—AUG—FINAL` code unchanged. Tear/share behavior untouched.

## Density notes

- Same `px-6 py-5`, 13px mono, dashed dividers as today.
- Four dividers total (vs three now); sections get `mt-4` breathing room like the yearly one.
- Net row count drops from 10 flat rows to 3 columns + at most 6 rows, so the receipt gets shorter, not longer.

## Technical notes

- Move `Metric` and `HallRow` from `YearlyReceiptView.tsx` into `src/components/trip/ReceiptPaper.tsx` and import in both, so the two receipts can't drift apart.
- `ReceiptView.tsx` keeps its existing props — no changes to `Finance.tsx` data plumbing.
- Local `Row`, `Divider`, `JaggedEdge`, and `useBarcodePattern` duplicates in `ReceiptView.tsx` get replaced with the shared `ReceiptPaper` versions in the same pass.
