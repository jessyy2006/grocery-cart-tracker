CREATE TABLE public.user_budget_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_start date NOT NULL,
  monthly_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_budget_history TO authenticated;
GRANT ALL ON public.user_budget_history TO service_role;

ALTER TABLE public.user_budget_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budget history"
  ON public.user_budget_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget history"
  ON public.user_budget_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget history"
  ON public.user_budget_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget history"
  ON public.user_budget_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER touch_user_budget_history
  BEFORE UPDATE ON public.user_budget_history
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_budgets();