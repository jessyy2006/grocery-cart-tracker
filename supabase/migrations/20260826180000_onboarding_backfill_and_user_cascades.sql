-- UP
--
-- Two fixes required before TestFlight:
--
--   1. `user_onboarding` was created out-of-band (it exists in the live DB and in
--      `src/integrations/supabase/types.ts`, but had no migration). This backfills
--      the DDL and, critically, guarantees RLS is on — the table holds PII
--      (first_name, last_name, age_range, gender).
--
--   2. `user_onboarding`, `user_budgets` and `user_budget_history` all keyed off
--      `user_id uuid` with no foreign key to `auth.users`, so deleting an auth user
--      left their rows behind forever. Combined with `delete-account` not clearing
--      the budget tables, a deleted user's financial data survived indefinitely —
--      an App Store Guideline 5.1.1(v) and GDPR erasure failure.
--
-- Everything here is idempotent: the tables already exist in the live project.

-- 1. Backfill user_onboarding -------------------------------------------------

create table if not exists public.user_onboarding (
  user_id uuid primary key,
  first_name text,
  last_name text,
  age_range text,
  gender text,
  shopping_behavior text,
  goals text[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding enable row level security;

drop policy if exists "onboarding own read" on public.user_onboarding;
drop policy if exists "onboarding own insert" on public.user_onboarding;
drop policy if exists "onboarding own update" on public.user_onboarding;
drop policy if exists "onboarding own delete" on public.user_onboarding;

create policy "onboarding own read" on public.user_onboarding
  for select using (auth.uid() = user_id);
create policy "onboarding own insert" on public.user_onboarding
  for insert with check (auth.uid() = user_id);
create policy "onboarding own update" on public.user_onboarding
  for update using (auth.uid() = user_id);
create policy "onboarding own delete" on public.user_onboarding
  for delete using (auth.uid() = user_id);

-- Belt-and-braces: RLS is also asserted on the two budget tables. These already
-- had it enabled; `enable` is a no-op if it is already on.
alter table public.user_budgets enable row level security;
alter table public.user_budget_history enable row level security;

-- 2. Cascade user-owned rows from auth.users ----------------------------------

-- Adding the FK fails if orphaned rows exist (rows whose owner is already gone).
-- Those rows are precisely the leak this migration closes, so clear them first.
delete from public.user_onboarding o
  where not exists (select 1 from auth.users u where u.id = o.user_id);
delete from public.user_budgets b
  where not exists (select 1 from auth.users u where u.id = b.user_id);
delete from public.user_budget_history h
  where not exists (select 1 from auth.users u where u.id = h.user_id);

alter table public.user_onboarding
  drop constraint if exists user_onboarding_user_id_fkey;
alter table public.user_onboarding
  add constraint user_onboarding_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_budgets
  drop constraint if exists user_budgets_user_id_fkey;
alter table public.user_budgets
  add constraint user_budgets_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_budget_history
  drop constraint if exists user_budget_history_user_id_fkey;
alter table public.user_budget_history
  add constraint user_budget_history_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- DOWN
--
-- alter table public.user_budget_history drop constraint if exists user_budget_history_user_id_fkey;
-- alter table public.user_budgets        drop constraint if exists user_budgets_user_id_fkey;
-- alter table public.user_onboarding     drop constraint if exists user_onboarding_user_id_fkey;
--
-- drop policy if exists "onboarding own delete" on public.user_onboarding;
-- drop policy if exists "onboarding own update" on public.user_onboarding;
-- drop policy if exists "onboarding own insert" on public.user_onboarding;
-- drop policy if exists "onboarding own read"   on public.user_onboarding;
--
-- Note: the DOWN deliberately does NOT drop public.user_onboarding. The table
-- predates this migration in the live project; dropping it would destroy data
-- this migration only ever documented.
