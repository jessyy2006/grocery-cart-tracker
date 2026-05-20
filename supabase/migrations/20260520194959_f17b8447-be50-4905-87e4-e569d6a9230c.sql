ALTER TABLE public.shopping_list_items ADD COLUMN tag text;
CREATE INDEX idx_shopping_list_items_list_tag ON public.shopping_list_items (list_id, tag);

ALTER TABLE public.trip_items
  ADD COLUMN substitutes_list_item_id uuid REFERENCES public.shopping_list_items(id) ON DELETE SET NULL;
CREATE INDEX idx_trip_items_substitutes ON public.trip_items (substitutes_list_item_id);