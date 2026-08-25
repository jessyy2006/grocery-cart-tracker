import { supabase } from "@/integrations/supabase/client";
import { getCurrency } from "@/lib/format";
import { safeSetItem } from "@/lib/native";
import { ONBOARDED_KEY } from "@/hooks/useOnboarding";

/** $400 CAD reference budget, scaled per currency. Used when budget is skipped. */
export const DEFAULT_BUDGET_BY_CURRENCY: Record<string, number> = {
  CAD: 40000,
  USD: 30000,
  EUR: 28000,
  GBP: 24000,
  AUD: 45000,
  JPY: 4500000,
};

export const defaultBudgetCents = () =>
  DEFAULT_BUDGET_BY_CURRENCY[getCurrency()] ?? 40000;

/**
 * Final write of the onboarding flow: stamps completion, stores the monthly
 * budget (explicit or default) and mirrors the first name onto the profile.
 */
export const completeOnboarding = async (
  userId: string,
  { firstName, budgetCents }: { firstName: string; budgetCents: number | null },
) => {
  const name = firstName.trim();
  const budget = budgetCents ?? defaultBudgetCents();

  await (supabase as any).from("user_onboarding").upsert({
    user_id: userId,
    first_name: name || null,
    completed_at: new Date().toISOString(),
  });

  await supabase.from("user_budgets").upsert({ user_id: userId, monthly_cents: budget });

  if (name) {
    await supabase.from("profiles").update({ display_name: name }).eq("id", userId);
  }

  safeSetItem(ONBOARDED_KEY, "1");
};

/** Best-effort first name from an OAuth identity. */
export const nameFromMetadata = (meta: Record<string, unknown> | undefined): string => {
  if (!meta) return "";
  const given = meta.given_name as string | undefined;
  const full = meta.full_name as string | undefined;
  return (given ?? full?.split(" ")[0] ?? "").trim();
};
