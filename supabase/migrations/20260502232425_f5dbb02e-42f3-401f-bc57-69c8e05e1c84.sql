
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Products (shared cache, no user_id)
create table public.products (
  barcode text primary key,
  name text not null,
  brand text,
  image_url text,
  default_price_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "products read all signed in" on public.products for select to authenticated using (true);
create policy "products insert signed in" on public.products for insert to authenticated with check (true);
create policy "products update signed in" on public.products for update to authenticated using (true);

-- Stores (per-user)
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
alter table public.stores enable row level security;
create policy "stores own read" on public.stores for select using (auth.uid() = user_id);
create policy "stores own insert" on public.stores for insert with check (auth.uid() = user_id);
create policy "stores own update" on public.stores for update using (auth.uid() = user_id);
create policy "stores own delete" on public.stores for delete using (auth.uid() = user_id);

-- Trips
create type public.trip_status as enum ('active', 'saved');
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status public.trip_status not null default 'active',
  total_cents integer not null default 0,
  note text
);
alter table public.trips enable row level security;
create policy "trips own read" on public.trips for select using (auth.uid() = user_id);
create policy "trips own insert" on public.trips for insert with check (auth.uid() = user_id);
create policy "trips own update" on public.trips for update using (auth.uid() = user_id);
create policy "trips own delete" on public.trips for delete using (auth.uid() = user_id);
create index trips_user_status_idx on public.trips(user_id, status);

-- Trip items
create table public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  store_name_snapshot text,
  barcode text,
  name_snapshot text not null,
  price_cents integer not null default 0,
  qty integer not null default 1,
  scanned_at timestamptz not null default now()
);
alter table public.trip_items enable row level security;

create policy "trip_items own read" on public.trip_items for select
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "trip_items own insert" on public.trip_items for insert
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "trip_items own update" on public.trip_items for update
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "trip_items own delete" on public.trip_items for delete
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create index trip_items_trip_idx on public.trip_items(trip_id);

-- Recompute trip total on item changes
create or replace function public.recompute_trip_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare _trip_id uuid;
begin
  _trip_id := coalesce(new.trip_id, old.trip_id);
  update public.trips
    set total_cents = coalesce((select sum(price_cents * qty) from public.trip_items where trip_id = _trip_id), 0)
    where id = _trip_id;
  return null;
end;
$$;

create trigger trip_items_recompute
after insert or update or delete on public.trip_items
for each row execute function public.recompute_trip_total();

-- Realtime
alter publication supabase_realtime add table public.trip_items;
alter publication supabase_realtime add table public.trips;
