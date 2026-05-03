create table public.user_budgets (
  user_id uuid primary key,
  monthly_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_budgets enable row level security;

create policy "budgets own read" on public.user_budgets
  for select using (auth.uid() = user_id);

create policy "budgets own insert" on public.user_budgets
  for insert with check (auth.uid() = user_id);

create policy "budgets own update" on public.user_budgets
  for update using (auth.uid() = user_id);

create or replace function public.touch_user_budgets()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_user_budgets
before update on public.user_budgets
for each row execute function public.touch_user_budgets();