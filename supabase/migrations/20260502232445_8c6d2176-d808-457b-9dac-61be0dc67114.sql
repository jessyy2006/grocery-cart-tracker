
-- Replace overly-permissive product policies
drop policy "products insert signed in" on public.products;
drop policy "products update signed in" on public.products;
create policy "products insert signed in" on public.products for insert to authenticated
  with check (length(barcode) > 0 and length(name) > 0);
create policy "products update signed in" on public.products for update to authenticated
  using (auth.uid() is not null) with check (length(barcode) > 0 and length(name) > 0);

-- Lock down SECURITY DEFINER trigger functions
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.recompute_trip_total() from public, anon, authenticated;
