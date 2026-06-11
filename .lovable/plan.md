# Receipt Tape redesign — Home & History lists

Refactor the trip lists on `src/pages/Home.tsx` ("Recent trips") and `src/pages/History.tsx` (full history) into one shared, hyper-minimal "receipt tape" row style. All text sits flat on the page background — no cards, borders, or shadows.

## 1. New shared row component

Create `src/components/trip/TripTapeRow.tsx`:

- Props: `title`, `date` (ISO), `itemCount`, `totalCents`, `onClick`.
- Layout: full-width `<button>`, `flex items-center justify-between`, vertical padding `py-5` (~20px).
- Left column:
  - Line 1 — title in `lowercase`, `text-[15px]` regular, `text-foreground` (dark charcoal).
  - Line 2 — `lowercase` `text-[13px]` `text-muted-foreground`, format: `"wed, jun 10 · 7 items"` via `format(date, "EEE, MMM d")` then `.toLowerCase()`.
- Right column: `<Money>` at `size="md"` (~15px) in `text-foreground`, vertically centered by flex.
- No icons, no MapPin, no chevron.

## 2. Shared dashed divider

Use a single hairline rule between rows: `border-t border-dashed border-foreground/10` on each row except the first (`[&>li+li>button]:border-t` pattern on the `<ul>`, or simply `divide-y divide-dashed divide-foreground/10` on the list). Apply inside each section so headers don't get a top rule.

## 3. `src/pages/Home.tsx` changes

- Replace the `recent.map` card buttons with `<ul class="-mx-1">` of `TripTapeRow`s, using `t.title`-equivalent — Home currently shows only the date, so pass `format(started_at, "EEE, MMM d").toLowerCase()` as the title for now and drop the stores subline (kept minimal per spec). Item count comes from `trip_items` length — extend the existing `savedRes` select to include `trip_items(id)` count (already fetches `store_name_snapshot`; change to `trip_items(id)` and use `.length`).
- Section heading "Recent trips" stays but restyled: `lowercase text-small text-muted-foreground` to match the editorial tone (still keep "see all" link, lowercased).

## 4. `src/pages/History.tsx` changes

- Remove `<Card>` wrappers and the `<li>` spacing classes; render each month section's items as a `<ul>` of `TripTapeRow`s with dashed dividers between rows.
- Month header ("june 2026"): keep the sticky behavior, restyle to `lowercase text-small text-muted-foreground tracking-normal` (drop the existing eyebrow uppercase styling for this view). Lowercase via `.toLowerCase()` on `monthLabel(k)`.
- Header row: the scan icon button is already in `PageHeader.action` next to the month `Select` — no change needed; just confirm visual size matches (already `h-10 w-10`, minimalist outline).
- Title fallback already uses list name or `"EEE, MMM d"`; lowercase it for display.

## 5. Cleanup

- Drop now-unused imports (`MapPin`, `Card`, `HeroCard` only where unused) from Home and History.
- No DB, no auth, no routing changes.

## Files touched

- add `src/components/trip/TripTapeRow.tsx`
- edit `src/pages/Home.tsx`
- edit `src/pages/History.tsx`
- edit `src/components/AppLayout.tsx` (hide FAB on `/`)

## Out of scope

- TripDetail page (already redesigned).
- FloatingActionButton internals.
- Any data model or query shape beyond swapping `store_name_snapshot` → `id` in the Home recent select to get item counts.