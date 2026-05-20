ALTER TABLE public.shopping_lists ADD COLUMN hidden boolean NOT NULL DEFAULT false;
CREATE INDEX idx_shopping_lists_user_hidden ON public.shopping_lists (user_id, hidden);