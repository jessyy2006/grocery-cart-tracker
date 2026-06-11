CREATE TABLE public.trip_planned_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  source_list_item_id uuid REFERENCES public.shopping_list_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  category text NOT NULL DEFAULT 'other',
  notes text,
  tag text,
  barcode text,
  price_cents integer,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_planned_items TO authenticated;
GRANT ALL ON public.trip_planned_items TO service_role;

ALTER TABLE public.trip_planned_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage planned items for own trips"
  ON public.trip_planned_items
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_planned_items.trip_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_planned_items.trip_id AND t.user_id = auth.uid()));

CREATE INDEX trip_planned_items_trip_id_idx ON public.trip_planned_items(trip_id);

-- Backfill snapshots for any currently-active trips with a list so the live trip page keeps working after the code switch.
INSERT INTO public.trip_planned_items (trip_id, source_list_item_id, name, qty, category, notes, tag, barcode, price_cents, checked_at)
SELECT t.id, sli.id, sli.name, sli.qty, sli.category, sli.notes, sli.tag, sli.barcode, sli.price_cents, sli.checked_at
FROM public.trips t
JOIN public.shopping_list_items sli ON sli.list_id = t.list_id
WHERE t.status = 'active'
  AND t.list_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.trip_planned_items tpi WHERE tpi.trip_id = t.id);

-- One-time cleanup: lists should be pristine templates.
UPDATE public.shopping_list_items SET checked_at = NULL, price_cents = NULL WHERE checked_at IS NOT NULL OR price_cents IS NOT NULL;