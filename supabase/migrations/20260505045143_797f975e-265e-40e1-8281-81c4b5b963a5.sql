-- Lock down products: keep insert (needed for scanning new barcodes), remove blanket update
drop policy if exists "products update signed in" on public.products;

-- Remove trips/trip_items from realtime publication (not used by app; prevents cross-user subscription leakage)
alter publication supabase_realtime drop table public.trip_items;
alter publication supabase_realtime drop table public.trips;