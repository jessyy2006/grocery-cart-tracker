## Plan

### 1. Budget history → drives y-axis max
Add a per-month budget snapshot so the chart can scale to the largest budget you've ever set in the last 6 months.

- New table `public.user_budget_history(user_id, month_start date, monthly_cents, created_at)` with `unique(user_id, month_start)`.
- Standard RLS (`auth.uid() = user_id`) + GRANTs for `authenticated` and `service_role`.
- On every save in the budget dialog (`saveBudget` in `Finance.tsx`): also upsert a row for the current month (`month_start = first day of current month`). Backfill the current month from existing `user_budgets` on first load if no row exists.
- `Finance.tsx` fetches the last 6 months of history alongside trips. `niceMax` becomes `max(history.monthly_cents over last 6 months)`, falling back to current `budgetCents` if history is empty. Bars still render at their true height — if a month's spend exceeds the axis max it'll clip at 100% (acceptable; the goal-dot still marks that month's budget).
- Goal dot per bar now uses **that month's** historical budget (not the current one), so each bar shows its own target.

### 2. Stat number sizing
Only the three stat columns wrap. Shrink them by 4px; leave hero untouched.

- `StatColumn` value: `text-[22px]` → `text-[18px]`.
- Hero `$XXX.XX left` stays at `text-[44px]`.

### 3. "left" / "over" color
Currently `text-foreground` (near-black). Change to `text-muted-foreground` (the lighter warm brown already used app-wide, `hsl(35 7% 45%)`). `over` stays `text-destructive`.

### 4. Unify breakdown number font
The "breakdown by group" and "breakdown by store" rows use `text-sm font-semibold tabular-nums` (Inter Tight). Switch the dollar values (and the ↑/↓ delta amounts beneath them) to the `text-money` utility (JetBrains Mono) so they match `$3.00`, `$17.28`, etc. elsewhere on the page.

### Files touched
- `supabase/migrations/*` — new `user_budget_history` table (via migration tool, approval required).
- `src/pages/Finance.tsx` — fetch + write history, recompute `niceMax`, per-bar goal dots, stat font size, "left" color, breakdown font.

### Risks
- Migration needs your approval before code changes ship — I'll run it first, then edit `Finance.tsx`.
- Bars for months that spent above the axis max will visually clip at the top. Tell me if you'd rather the axis grow to `max(budget, spend)` in that case.
- No rollback needed for the UI changes; the new table is additive.
