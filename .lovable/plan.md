## Goal

When the user taps **Save trip** on the Active Trip screen, intercept the navigation and play a short (~1.5–2s total) "printed receipt" animation that summarizes the trip, then continue to the Trip Detail page when dismissed.

## UX flow

1. User taps **Save trip** → trip is saved to backend as today.
2. Instead of navigating immediately, open a full-screen overlay (dark scrim).
3. A printer "slot" sits near the top. A receipt slides downward out of the slot:
  - Phase A (0–250ms): paper edge appears, easing out of slot.
  - Phase B (250–1100ms): receipt extends to full height with a subtle paper-feed jitter; content rows fade/translate in staggered (header → items → totals → insight rows → spacer → bottom rows) so it reads as it prints.
  - Phase C (1100–1400ms): final settle, soft drop shadow blooms, perforated bottom edge appears.
4. Tap anywhere / **Done** button → receipt eases off-screen, overlay closes, navigate to `/trip/:id`.
5. Respects `prefers-reduced-motion`: simple fade-in, no slide/jitter.

Total motion budget: ≤ 1.6s.

## Receipt layout

Reuse the visual language of the existing monthly `ReceiptView` (cream paper `--receipt-paper`, JetBrains Mono, dashed dividers, jagged top/bottom edges) so this feels like part of the same family.

```text
   ╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲          ← jagged top edge
  ──────────────────────
        {STORE NAME}           ← uppercase, bold
     {Date}  ·  {Time}         ← muted
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  ITEMS                   N
  {item 1}                $X.XX
  {item 2}                $X.XX
  ...
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  TOTAL SPENT             $XX.XX
  % OF BUDGET SPENT        XX%
                                ← empty spacer row
  Biggest Category        {Name}
  Streak                  2 trips
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        * {personality} *
   ╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱        ← jagged bottom
```

All right-column values use `text-right tabular-nums`. The spacer is a `<div className="h-4" aria-hidden />` between the financial block and bottom rows (matching the pattern already used in monthly `ReceiptView`).

## Data sources

Computed in `ActiveTrip.tsx` at save time from existing state + a single follow-up query:

- **Store Name** — `activeStore?.name ?? "Unknown store"`.
- **Date / Time** — `new Date()` formatted with `toLocaleDateString` / `toLocaleTimeString`.
- **Items checked off** — `items` (trip items already in state) + checked `listItems`. Show item name + line total. Cap visible rows at ~8 with a `+N more` line if longer, to keep receipt height bounded.
- EXTRA ITEMS - list the number of extra items added to the grocery cart.   
**TOTAL SPENT** — `total` (already computed in component).
- **% OF BUDGET SPENT** — fetch `user_budgets.monthly_cents`; sum saved trips in the current month (including this one) ÷ budget × 100. If no budget set, render `—`.
- **Biggest Category** — group this trip's items by category via `getCategory()`/`guessCategory()`, pick the category with the highest summed `price_cents`.
- **Streak** — reuse the same definition as Finance: count of most-recent consecutive saved trips whose running monthly total stayed within budget, including the just-saved trip. Render `"{n} trips"` (no "under budget" text). Hide row if `< 2` or no budget.

These computations live in a small helper `buildTripReceipt(...)` colocated with the new component, mirroring the shape used by `ReceiptView`.

## Components & files

New:

- `src/components/trip/PrintedReceiptOverlay.tsx` — full-screen overlay; owns the framer-motion animation; renders the receipt body and a **Done** CTA.
- `src/components/trip/TripReceiptBody.tsx` — pure presentational receipt (header / items / totals / spacer / bottom rows). Shares the `Row`, `Divider`, `JaggedEdge` style with monthly `ReceiptView`; factor those tiny primitives into `src/components/finance/receiptPrimitives.tsx` and import from both files (no behavior change to the existing monthly receipt).

Edited:

- `src/pages/ActiveTrip.tsx`:
  - In `saveTrip`, after a successful Supabase update, compute the receipt payload, set `setReceipt(payload)` instead of calling `navigate` immediately.
  - Render `<PrintedReceiptOverlay payload={receipt} onDismiss={() => navigate(...)} />` at the end of the page.
  - Keep `toast.success("Trip saved")` but fire it after dismiss to avoid competing with the animation.
- `src/components/finance/ReceiptView.tsx`: swap inline `Row`/`Divider`/`JaggedEdge` for the new shared primitives (no visual change).

## Animation details (framer-motion)

- Overlay: `initial={{opacity:0}} animate={{opacity:1}}` over 150ms with backdrop blur.
- Receipt container: `initial={{ y: '-100%' }} animate={{ y: 0 }}`, spring `{ stiffness: 260, damping: 30, mass: 0.8 }`, duration ≈ 800ms.
- Rows: `staggerChildren: 0.04`, each row `initial={{opacity:0, y:-6}} animate={{opacity:1, y:0}}` 180ms ease-out — gives the "printing line by line" feel without exceeding the budget.
- Subtle 2-frame vertical jitter (±1px) on the receipt while extending, disabled under reduced motion.
- `useReducedMotion()` collapses everything to a single 200ms fade.

## Design system compliance

- Colors only via tokens already defined: `--receipt-paper`, `--receipt-ink`, `--hairline`, `--background`, `--foreground`, plus existing `text-muted-foreground`. No hardcoded hex outside the existing `PAPER` constant in the shared primitives.
- Typography: receipt body keeps JetBrains Mono (matches existing receipt); CTA uses the standard `Button` component.
- Overlay scrim: `bg-foreground/40 backdrop-blur-sm`.
- Honors safe-area insets at the bottom for the **Done** button.

## Edge cases

- No items: keep the existing "Add at least one item" guard — animation never plays in that case.
- No budget set: render `—` for % of budget and hide the Streak row.
- No category data: hide Biggest Category row rather than printing "—".
- User taps outside before animation completes: ignore until Phase B finishes (button disabled), then allow dismiss.
- Reduced motion: 200ms fade in/out only.

## Out of scope

- No changes to the existing monthly `ReceiptView` behavior, share/save flow, or Finance computations.
- No new backend tables or migrations.