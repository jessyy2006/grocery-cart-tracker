alter table public.shopping_list_items
  add column if not exists price_cents integer,
  add column if not exists notes text;