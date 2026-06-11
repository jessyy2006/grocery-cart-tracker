## Refactor: History detail as static Summary Receipt

Replace the card-grid layout in `src/pages/TripDetail.tsx` with a flat, centered paper-receipt canvas that reuses the visual language of `PrintedReceiptOverlay` — without any printing/tearing animation.

### 1. Layout

- Strip the current `Card` grid and store-grouping section headers.
- Render a single centered column (max-w-sm), generous vertical padding, background uses the existing app surface — no overlay, no portal.
- Receipt sheet: cream paper (`#fdfaf1`) with jagged top/bottom edges, soft drop shadow, identical to the checkout receipt's typography (mono, 13px, charcoal `#0e1a14`).
- Header inside the sheet: store name (or "GROCERY RUN" fallback) in bold uppercase tracking-widest, date+time underneath in muted xs.
- Keep the small back button above the sheet.

### 2. Items list

- One row per item: name left-aligned, line total right-aligned, tabular-nums.
- Beneath each name, a muted secondary line `qty × unit price` in `text-[11px] text-neutral-500`.
- Only render the multiplier line when `qty > 1` (or unit price differs from line total).
- Name sanitization: strip trailing quantity markers from `name_snapshot` when a multiplier is shown — regex on patterns like  `x2`,  `×2`,  `(2)`,  `2x` at end of string, case-insensitive. Centralize as `stripQtyMarker(name, qty)` in this file.
- Drop the per-store subtotal row — the receipt totals at the bottom replace it. Items stay in scanned order.

### 3. Totals block

Dashed divider, then:

- `TOTAL SPENT` — bold, right-aligned amount.
- `% OF BUDGET SPENT` — computed from `user_budgets.monthly_cents` for the trip's month; renders `—` when no budget is set. Fetched in the same effect (single extra query).

### 4. Insights fine-print (center-aligned)

- Dashed divider, then a centered block in `font-mono text-[11px] lowercase text-neutral-500 leading-relaxed`, no card, no border.
- 2 lines, each a full sentence:
  1. Highest-ticket item: `"your most expensive item was the {name} at {price}."`
  2. Budget context: depending on data, one of
    - `"this run was {pct}% of your {month} budget."`
    - `"{x}% above / below your average trip this month."`
    - omitted entirely if no budget and only one trip exists.
- All computation is client-side from already-loaded `trip_items` plus the month's trips/budget (one extra `trips` query for the month aggregate).

### 5. Footer handle tab

- Below the receipt sheet's bottom jagged edge, render a monochrome "bag handle" tab: a deep-charcoal rounded pill (`bg-[#0e1a14] text-[#fdfaf1]`) centered under the sheet, with a small arched cut-out look (two stacked rounded rects) — purely CSS, no new asset.
- Tab label: **"Shop from this list"**.
- Tap behavior: create a new `shopping_lists` row named after the trip title, insert one `shopping_list_items` per trip item (name + qty, no store binding), then `navigate(`/list/${newListId}`)` (or the existing list route — confirm during implementation by checking `App.tsx` routes). Show a toast on success, error toast on failure, disable while pending.

### 6. Files touched

- **Edit** `src/pages/TripDetail.tsx` — full rewrite of the render tree; reuse `JaggedEdge`, `Row`, `Divider` helpers by extracting them into a new shared module.
- **New** `src/components/trip/ReceiptPaper.tsx` — exports `JaggedEdge`, `Row`, `Divider`, `PAPER`, `INK` constants. Refactor `PrintedReceiptOverlay.tsx` to import from here (no behavior change there).
- No DB migrations. No edge function changes.

### Technical notes

- Budget lookup: `supabase.from("user_budgets").select("monthly_cents").maybeSingle()` — the table is single-row per user in current schema; if it's monthly-keyed we'll filter by month. Verified during implementation via `supabase--read_query`.
- "Shop from this list" reuses the existing list-creation pattern from `ScanReceipt.tsx` ("Save as reusable list") to keep insert shape consistent.
- No animation libs added; the page is fully static (no `framer-motion` usage in TripDetail).