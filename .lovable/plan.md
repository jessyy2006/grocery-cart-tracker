# Editorial Market Ledger Overhaul

A typographic refresh across Home + History, plus a redesigned Hero Card on Home. No data-model changes, no behavior changes — pure presentation.

## 1. Typographic hierarchy (shared)

Establish two contrasting type registers used app-wide on these screens:

- **Section anchors** (Home: "recent trips"; History: page title "history") — `font-display` (Fraunces) at ~28px, weight 500, lowercase, tight tracking. Drops the current tiny `text-small lowercase muted` styling.
- **Group subheads** (History month bands "june 2026", "may 2026") — `font-mono` (JetBrains Mono) at ~11px, uppercase-lowercase preserved as lowercase, muted-foreground, `tracking-[0.14em]`. A typewriter-style ledger label that visibly differs from the serif anchors.
- All text in headers, subheads, and list rows stays lowercase (already in TripTapeRow; extended to new spots).

## 2. Home Hero Card redesign

Greeting/title (`PageHeader` with "Thursday market run?") stays **outside and above** the card — unchanged structurally, just confirmed.

Rebuild the `HeroCard` block on `src/pages/Home.tsx` as:

```text
┌─────────────────────────────────────────┐
│  THIS MONTH                       [ 📷 ] │
│                                          │
│  $45.85                                  │
│                                          │
│  tracked across your saved trips.        │
│  ── 32% of this month's budget utilized  │
│                                          │
│  [        start a live trip         ]    │
└─────────────────────────────────────────┘
```

Specifics:
- Replace `HeroCard` (rounded-xl, soft cream) with a plain `<section>`: `bg-surface-raised` (pure white), `rounded-[6px]`, `shadow-soft`, no border. Padding `p-6`, button row flush to bottom edges via inner layout.
- Top row: `THIS MONTH` eyebrow on the left; the existing scan icon button absolutely positioned top-right inside the card (same icon button styling already used).
- `$45.85` rendered via existing `<Money size="display" />`.
- Subtext line unchanged ("tracked across your saved trips." / empty-state copy).
- New budget line beneath subtext: `font-mono text-[12px] lowercase text-muted-foreground` reading `── {pct}% of this month's budget utilized`. Fetch `user_budgets.monthly_cents` in the same Home `useEffect` (parallel with existing queries). Hide the line entirely when no budget is set or `monthSpend === 0`.
- Full-width CTA: replace the current green `variant="hero"` Button with a sharp rectangular button — `bg-foreground text-background`, `rounded-[4px]`, `h-12`, `w-full`, lowercase label `start a live trip`, no icon. Sits as the bottom row of the card with a small top margin.

## 3. History page header

`src/pages/History.tsx`:
- Replace the `PageHeader` title styling for "History" so the title renders lowercase serif at the same scale as Home's "recent trips" anchor. Easiest: keep `PageHeader` but pass `title="history"` (lowercase) — the existing `text-h1` is already Fraunces. Bump to `text-display` for parity. Drop the "Past runs" eyebrow.
- Month group headers: swap current `text-small lowercase text-muted-foreground` to `font-mono text-[11px] lowercase tracking-[0.14em] text-muted-foreground`. Keep `sticky top-0 bg-background`.
- Keep the scan icon + month select in the top-right action slot (already there).

## 4. Home "recent trips" section

`src/pages/Home.tsx`:
- Section heading "recent trips" → `font-display text-[1.75rem] leading-none lowercase` (matches History anchor). The "see all →" link stays small/muted on the right, vertically aligned to baseline.
- List already uses `TripTapeRow` with `divide-dashed`; soften the perforation: `divide-foreground/10` (paper-thin) and confirm rows render two-line layout (already correct).

## 5. Out of scope

- No changes to `TripTapeRow` internals (already matches the 2-line spec).
- No changes to `FloatingActionButton`, bottom sheet, drawers, TripDetail, or any data writes.
- No new dependencies. No design tokens added (uses existing `font-display`, `font-mono`, `--shadow-soft`, `--foreground`/`--background`).

## Files touched

- `src/pages/Home.tsx` — rebuild HeroCard JSX, fetch budget, restyle "recent trips" heading, soften divider.
- `src/pages/History.tsx` — restyle PageHeader title, restyle month subheads.
