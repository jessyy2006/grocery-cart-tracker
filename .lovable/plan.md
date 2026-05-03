# Finance Tab

Replace the bottom-nav **Trip** entry with a **Finance** entry. The active trip stays reachable from the Home page (existing "Continue trip" / "Start a new trip" surfaces). The `/trip` route itself is unchanged.

## 1. Schema

New table `user_budgets` for the single global monthly budget.

```sql
-- UP
create table public.user_budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_cents integer not null default 0 check (monthly_cents >= 0),
  updated_at timestamptz not null default now()
);
alter table public.user_budgets enable row level security;
create policy "budgets own read"   on public.user_budgets for select using (auth.uid() = user_id);
create policy "budgets own write"  on public.user_budgets for insert with check (auth.uid() = user_id);
create policy "budgets own update" on public.user_budgets for update using (auth.uid() = user_id);
-- DOWN
drop table public.user_budgets;
```

No other schema changes — extras, trip totals, and categories are derived from existing tables (`trips`, `trip_items`, `shopping_list_items`, `stores`).

## 2. Navigation swap

**`src/components/BottomNav.tsx`**: replace the `{ to: "/trip", label: "Trip", icon: ShoppingCart }` entry with `{ to: "/finance", label: "Finance", icon: BarChart3 }`. The hide-on-`/trip` rule stays so the in-trip footer is uninterrupted.

**`src/App.tsx`**: register `<Route path="/finance" element={<Finance />} />` inside the authed layout.

## 3. New page `src/pages/Finance.tsx`

Single screen, top → bottom, matching existing card / spacing / typography tokens (`Card`, `bg-card`, `rounded-2xl`, `text-muted-foreground`, etc.). All currency rendered via `formatMoney` so the user's currency setting carries over.

### 3a. Data fetching (one effect, parallel queries)
- `user_budgets` row for current user (insert default 0 on first save).
- `trips` for current user where `status = 'saved'` and `started_at >= now() - 6 months` — pull `id, started_at, total_cents, list_id`.
- `trip_items` for those trip ids (`trip_id, name_snapshot, price_cents, qty, store_id, store_name_snapshot, barcode`).
- `shopping_list_items` for the trips that had a `list_id`, used to classify extras (item is an extra when no `list_id` match by `barcode` or normalized name within the trip's list).
- Categorize each `trip_item` via existing `src/lib/categories.ts` helper (already used elsewhere in the app).

Derived state (memoized):
- `monthSpend` = sum of `total_cents` for trips in current calendar month.
- `remaining` = `budget - monthSpend` (negative = over).
- `pctUsed` = `monthSpend / budget`.
- `extras` (current month, list-trips only): `count`, `cents`, `pctOfSpend`; plus prior-month extras for the up/down delta.
- `avgTrip` = `monthSpend / monthTripCount`.
- `momDelta` = `monthSpend − previousMonthSpend`.
- `monthlySeries` = last 6 months of totals (filled with 0).
- `byCategory`, `byStore` = grouped sums for current month, sorted desc.

### 3b. UI sections

1. **Header** — "Finance" title + small edit-budget icon button.
2. **Budget card** — large `$X left` or `$X over`, subtext `of $Y monthly`, full-width progress bar (green `bg-accent` under, red `bg-red-500` over), `pctUsed` chip. Tap opens a `Dialog` (reuses existing dialog styling) with a single price input bound to `formatMoney`/`parsePriceToCents`, saves to `user_budgets`.
3. **Behavior signals row** — 3 small cards in a horizontal scroll on narrow widths:
   - *Unplanned spending*: `$X on extras`, `N items • P% of total`, ↑/↓ vs last month.
   - *Avg trip cost*: `$X avg per trip`, `N trips this month` subtext.
   - *MoM*: `↓/↑ $X vs last month`, neutral when delta = 0.
4. **Monthly chart** — Recharts `BarChart` (already in deps via `src/components/ui/chart.tsx`). 6 bars, x-axis short month labels, neutral fill, red fill when bar > budget, `ReferenceLine` at budget. Tap shows tooltip with exact value. Subtle initial animation (Recharts default).
5. **Breakdown** — `Tabs` (`Categories | Stores`). Categories view shows each category row with name, amount, and a thin progress bar (share of monthly spend). Stores view shows store name + amount, sorted desc.
6. **Insights** — up to 2 cards rendered from a single edge-function call (see §4). Skeleton while loading; hidden if call fails or returns empty.

### 3c. Empty states
- No budget set → budget card shows "Set your monthly budget" + primary CTA opening the same dialog. Behavior signals + chart still render with the data we have; insights section hidden.
- No trips this month → chart + breakdown show "Start tracking trips to see your spending insights" with a CTA linking to Home.

## 4. AI insights edge function

`supabase/functions/finance-insights/index.ts`:
- Validates JWT, loads the caller's last-2-months aggregates (reuses the same SQL the page computes; cheaper than sending raw items).
- Calls Lovable AI Gateway, model `google/gemini-3-flash-preview`, **non-streaming**, with a tool-call schema returning `{ insights: [{ title, body }], max 2 }`.
- Surfaces 429/402 back to the client as JSON errors so the page can hide the section gracefully.
- `LOVABLE_API_KEY` already provisioned; no new secrets.

Client calls via `supabase.functions.invoke('finance-insights')` once per page load (no caching for v1).

## 5. Files touched

- **new** `supabase/migrations/<ts>_user_budgets.sql`
- **new** `src/pages/Finance.tsx`
- **new** `supabase/functions/finance-insights/index.ts`
- **edit** `src/components/BottomNav.tsx` (Trip → Finance)
- **edit** `src/App.tsx` (route registration)

## 6. Risks / notes

- Extras classification depends on list match quality. Using `barcode` first, then normalized lowercased name; trips with `list_id = null` are excluded from extras (per your decision) but still count toward total spend, avg trip, and MoM.
- Budget is a single row per user; editing is immediate (optimistic update).
- Recharts is already bundled — no new deps.
- AI insights are best-effort: failures never block the rest of the page.
