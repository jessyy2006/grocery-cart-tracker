# Yearly receipt on Finance page

Add a yearly variant of the receipt that lives next to the existing monthly receipt and shares its paper/jagged-edge/swipe-to-tear treatment, with a couple of editorial flourishes layered in.

## Scope

- Period switcher above the receipt: `THIS MONTH` / `THIS YEAR` (persisted to `localStorage`, like the existing view toggle). Visible only when `view === "receipt"`.
- New `YearlyReceiptView` component built from real trip data for Jan 1 – Dec 31 of the current year.
- Existing monthly `ReceiptView` is untouched.

## Yearly receipt content (top → bottom)

1. Header: `YEARLY GROCERY SUMMARY` + `JAN 1 — DEC 31, YYYY`.
2. Three metric columns (divided by vertical hairlines): **Total Outlay**, **Items**, **Avg Basket**.
3. **Spending Rhythm** — smooth line chart (monotone SVG path) of 12 monthly totals, forest-green stroke `#143F2D` with soft fill, J/F/M/A/M/J/J/A/S/O/N/D axis labels.
4. **The Hall of Fame** rows:
   - Most Loyal Store (hidden if no `store_name_snapshot` exists for the year)
   - Staple of the Year (most-purchased item by qty, e.g. `OAT MILK (48×)`)
   - Largest Haul (highest-total trip, e.g. `NOV 22 — $342.10`)
5. Dotted-divider Q1–Q4 blocks. Each shows quarter total + a short italic insight derived from the data (top category that quarter, or % vs prior quarter). Deterministic, no AI call.
6. Italic Playfair quote near the footer (one of a small deterministic set keyed off year + spend pattern).
7. Barcode + archive code `YYYY—ARCHIVE—FINAL`.
8. Same jagged top/bottom edges and swipe-to-tear stub as the monthly receipt.

## Style (hybrid)

- Keep paper `#fdfaf1`, JetBrains Mono body, dashed dividers, jagged SVG edges, current barcode/stub component.
- Add forest green `#143F2D` for the chart stroke + accent rules.
- Quote uses Playfair Display italic (load via Google Fonts in `index.html`).
- Everything else (labels, numbers, rows) stays in the existing mono treatment so the two receipts feel like siblings.

## Data

Currently `Finance.tsx` only fetches trips for the last 6 months. Extend the fetch window to `max(jan 1 this year, 6 months ago)` so yearly aggregates have full-year coverage without breaking existing monthly math.

Aggregations (all client-side, in a new `useMemo`):

- `totalOutlay` = sum of `total_cents` for trips this year
- `itemCount` = sum of `qty` across trip_items this year
- `avgBasket` = itemCount / tripCount (one decimal)
- `monthlySeries` = 12 entries (Jan…Dec), cents per month
- `mostLoyalStore` = store with highest summed cents; hidden if none
- `staple` = item name with highest summed qty (case-insensitive match on `name_snapshot`)
- `largestHaul` = trip with max `total_cents` → `MMM DD — $X.XX`
- `quarters` = 4 entries with `{ total, topCategorySlug, deltaVsPrev }`

## Interaction

- Switching `MONTH` / `YEAR` swaps the rendered receipt; share/tear behavior is identical (swipe across barcode → tear → share dialog with PNG export). No archive button.
- Tear PNG export reuses the same `toPng` flow; export ref lives inside the yearly component.

## Files

- New: `src/components/finance/YearlyReceiptView.tsx`
- New: `src/components/finance/receiptPrimitives.tsx` — extract shared `JaggedEdge`, `Divider`, `Row`, `Barcode`, `PAPER` from `ReceiptView.tsx` so both receipts share one implementation. Update `ReceiptView.tsx` to import from it (no visual change).
- Edit: `src/pages/Finance.tsx` — extend trip fetch to start of current year; add `period` state + toggle UI; render `YearlyReceiptView` when `period === "year"`; compute yearly derived data.
- Edit: `index.html` — add Playfair Display italic stylesheet link.

## Out of scope

- Persisting/exporting an "archive" of past years.
- Changes to the monthly receipt's content or styling.
- AI-generated insights for Q1–Q4 blurbs (deterministic only).

## Risks

- Extending the trip fetch range increases payload — bounded to one year of trips for a single user, low risk.
- Staple/store detection is naive string match; acceptable for v1.
