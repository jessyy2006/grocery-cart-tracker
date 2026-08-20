# Finance receipts: copy, typography, and footer cleanup

## Shared quote pool

Both receipts pull one random line from a single shared pool (`src/components/finance/receiptQuotes.ts`), selected deterministically from the period so the same receipt always shows the same quote. Proposed lines — direct, motivational, grocery-grounded:

1. "Every cart you fill is a choice you made on purpose."
2. "Discipline is just a list you actually followed."
3. "You don't need a perfect month. You need the next good trip."
4. "Cheap habits compound. So do good ones."
5. "You bought what you needed. That's the whole skill."
6. "Plan the cart, keep the cash."
7. "Small savings, stacked weekly, become real money."
8. "Nothing wasted, nothing wandered. Keep going."
9. "The budget didn't beat you this month."
10. "Show up, stick to the list, repeat."

Tell me if you want any swapped out — otherwise these ship as-is.

## Monthly receipt (`ReceiptView.tsx`)

- Replace the `* {personality} *` line with a random quote, styled exactly like the yearly quote: centered, Playfair Display italic, 15px, wrapped in curly quotes.
- Remove the "Generated <date>" line.
- Add a footer code line under the barcode: `2026—AUG—FINAL` (year + short month of the receipt period), same mono 10px, wide tracking, centered.

## Yearly receipt (`YearlyReceiptView.tsx`)

Copy changes:
- "Spending Rhythm" → "Spending Behavior"
- "Staple of the Year" → "Your Go-To", and drop the `(2×)` quantity — name only.
- "Largest Haul" → "Fav Category", showing the emoji + label of the category with the highest item count for the year (e.g. `🥬 Fruits & Veggies`).
- Footer code becomes `2026—YEAR—FINAL`.
- Remove the "Generated <date>" line.
- Quote pulls from the shared pool (styling unchanged).

Layout / typography:
- Add ~4px of space below the date line so the three-stat row has breathing room above it.
- Date line matches the monthly format and casing: `January 1 – December 31, 2026` instead of `JAN 1 — DEC 31, 2026`.
- Section headers ("Spending Behavior", "The Hall of Fame") and the small labels ("Most Loyal Store", "Total", "Items", "Avg Cart") adopt the monthly receipt's label style — 13px mono, uppercase, `tracking-wider`, same ink color as monthly rows — instead of the current 9–11px bold micro-caps.
- All numbers/values stay exactly as they are.

## Technical notes

- New file `src/components/finance/receiptQuotes.ts` exports the pool plus `pickQuote(seed: string)`; both receipt components import it. Personality prop stays in the data layer (still used elsewhere) but is no longer rendered on the receipt.
- Fav category computed in `Finance.tsx`'s yearly memo: bucket `yearItems` by `guessCategory(name_snapshot)`, sum `qty`, take the max, return `{ emoji, label }` from `getCategory`. Replaces the `largestHaul` prop on `YearlyReceiptView`.
- No database or backend changes.
