ALTER TABLE public.trip_items DROP CONSTRAINT IF EXISTS trip_items_substitutes_list_item_id_fkey;
ALTER TABLE public.trip_items
  ADD CONSTRAINT trip_items_substitutes_list_item_id_fkey
  FOREIGN KEY (substitutes_list_item_id)
  REFERENCES public.trip_planned_items(id)
  ON DELETE SET NULL;