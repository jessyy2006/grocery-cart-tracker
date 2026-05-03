import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOnboarding, ONBOARDED_KEY } from "@/hooks/useOnboarding";
import { toast } from "sonner";
import OnboardingLayout from "./Layout";

// $400 CAD reference, scaled to selected currency.
const DEFAULT_BUDGET_BY_CURRENCY: Record<string, number> = {
  CAD: 40000,
  USD: 30000,
  EUR: 28000,
  GBP: 24000,
  AUD: 45000,
  JPY: 4500000,
};
import { getCurrency } from "@/lib/format";

const persistOnboarding = async (userId: string, draft: ReturnType<typeof useOnboarding>["draft"]) => {
  const currency = getCurrency();
  const budget = draft.budgetCents ?? DEFAULT_BUDGET_BY_CURRENCY[currency] ?? 40000;

  await (supabase as any).from("user_onboarding").upsert({
    user_id: userId,
    first_name: draft.firstName.trim() || null,
    last_name: draft.lastName.trim() || null,
    gender: draft.gender,
    age_range: draft.ageRange,
    goals: draft.goals,
    shopping_behavior: draft.shoppingBehavior,
    completed_at: new Date().toISOString(),
  });

  await supabase.from("user_budgets").upsert({ user_id: userId, monthly_cents: budget });

  const displayName = [draft.firstName, draft.lastName].filter(Boolean).join(" ").trim();
  if (displayName) {
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId);
  }
};

export default function OnboardingFirstList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, update } = useOnboarding();
  const [items, setItems] = useState<string[]>(draft.firstListItems);
  const [newItem, setNewItem] = useState("");
  const [busy, setBusy] = useState(false);

  const add = () => {
    const v = newItem.trim();
    if (!v) return;
    setItems([...items, v]);
    setNewItem("");
  };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const editItem = (i: number, v: string) => setItems(items.map((it, idx) => (idx === i ? v : it)));

  const finishCommon = async () => {
    if (!user) return;
    update({ firstListItems: items });
    await persistOnboarding(user.id, { ...draft, firstListItems: items });
    localStorage.setItem(ONBOARDED_KEY, "1");
  };

  const startTrip = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await finishCommon();
      const cleaned = items.map((s) => s.trim()).filter(Boolean);
      let listId: string | null = null;
      if (cleaned.length > 0) {
        const { data: list, error: lErr } = await supabase
          .from("shopping_lists")
          .insert({ user_id: user.id, name: "My first list" })
          .select("id")
          .single();
        if (lErr) throw lErr;
        listId = list!.id;
        await supabase.from("shopping_list_items").insert(
          cleaned.map((name, i) => ({ list_id: listId!, name, position: i }))
        );
      }
      sessionStorage.setItem("pendingTrip:listId", listId ?? "none");
      navigate("/trip/new", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't start your first trip");
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await finishCommon();
      navigate("/?intro=1", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingLayout
      step={5}
      title="Create your first grocery list"
      subtitle="Edit this list, then jump straight into a shopping trip."
      onSkip={skip}
      primaryLabel={busy ? "Starting…" : "Start your first trip"}
      primaryDisabled={busy}
      onPrimary={startTrip}
    >
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input value={it} onChange={(e) => editItem(i, e.target.value)} />
            <button
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Add an item"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button variant="outline" onClick={add} disabled={!newItem.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </OnboardingLayout>
  );
}
