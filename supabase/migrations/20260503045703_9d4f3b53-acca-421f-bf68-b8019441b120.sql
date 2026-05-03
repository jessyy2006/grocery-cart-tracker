
CREATE TABLE public.shopping_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lists own read" ON public.shopping_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lists own insert" ON public.shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists own update" ON public.shopping_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lists own delete" ON public.shopping_lists FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'other',
  barcode TEXT,
  checked_at TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "list_items own read" ON public.shopping_list_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));
CREATE POLICY "list_items own insert" ON public.shopping_list_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));
CREATE POLICY "list_items own update" ON public.shopping_list_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));
CREATE POLICY "list_items own delete" ON public.shopping_list_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));

CREATE INDEX idx_list_items_list ON public.shopping_list_items(list_id);

ALTER TABLE public.trips ADD COLUMN list_id UUID REFERENCES public.shopping_lists(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.touch_shopping_list()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shopping_lists_touch BEFORE UPDATE ON public.shopping_lists
FOR EACH ROW EXECUTE FUNCTION public.touch_shopping_list();
