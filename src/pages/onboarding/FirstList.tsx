import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useOnboarding,
  ONBOARDED_KEY,
  type OnboardingListItem,
} from "@/hooks/useOnboarding";
import { toast } from "sonner";
import OnboardingLayout from "./Layout";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  CategorySlug,
  getCategory,
  guessCategory,
} from "@/lib/categories";
import { getCurrency } from "@/lib/format";

// $400 CAD reference, scaled to selected currency.
const DEFAULT_BUDGET_BY_CURRENCY: Record<string, number> = {
  CAD: 40000,
  USD: 30000,
  EUR: 28000,
  GBP: 24000,
  AUD: 45000,
  JPY: 4500000,
};

const persistOnboarding = async (
  userId: string,
  draft: ReturnType<typeof useOnboarding>["draft"],
) => {
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
  const [items, setItems] = useState<OnboardingListItem[]>(draft.firstListItems);
  const [name, setName] = useState("");
  const [qtyText, setQtyText] = useState("1");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<CategorySlug>("other");
  const [autoCat, setAutoCat] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editQtyText, setEditQtyText] = useState("1");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (autoCat && name.trim()) setCategory(guessCategory(name));
  }, [name, autoCat]);

  const grouped = useMemo(() => {
    const map = new Map<CategorySlug, { item: OnboardingListItem; index: number }[]>();
    items.forEach((it, index) => {
      const slug = (CATEGORY_ORDER.includes(it.category as CategorySlug)
        ? it.category
        : "other") as CategorySlug;
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug)!.push({ item: it, index });
    });
    return CATEGORY_ORDER.filter((s) => map.has(s)).map((s) => ({
      slug: s,
      entries: map.get(s)!,
    }));
  }, [items]);

  const add = () => {
    const v = name.trim();
    if (!v) return;
    const slug = autoCat ? guessCategory(v) : category;
    const parsedQty = Math.max(1, parseInt(qtyText, 10) || 1);
    const trimmedNotes = notes.trim() ? notes.trim().slice(0, 25) : null;
    setItems((c) => [...c, { name: v, qty: parsedQty, category: slug, notes: trimmedNotes }]);
    setName("");
    setQtyText("1");
    setNotes("");
    setAutoCat(true);
    setCategory("other");
  };

  const remove = (i: number) => setItems((c) => c.filter((_, idx) => idx !== i));

  const openEdit = (i: number) => {
    const it = items[i];
    setEditing(i);
    setEditName(it.name);
    setEditQtyText(String(it.qty));
    setEditNotes(it.notes ?? "");
  };

  const saveEdit = () => {
    if (editing == null) return;
    const newName = editName.trim();
    if (!newName) return toast.error("Name can't be empty");
    const newQty = Math.max(1, parseInt(editQtyText, 10) || 1);
    const newNotes = editNotes.trim() ? editNotes.trim().slice(0, 25) : null;
    setItems((c) =>
      c.map((it, idx) =>
        idx === editing
          ? { ...it, name: newName, qty: newQty, notes: newNotes, category: guessCategory(newName) }
          : it,
      ),
    );
    setEditing(null);
  };

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
      const cleaned = items.filter((it) => it.name.trim());
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
          cleaned.map((it, i) => ({
            list_id: listId!,
            name: it.name.trim(),
            qty: it.qty,
            category: it.category,
            notes: it.notes,
            position: i,
          })),
        );
      }
      sessionStorage.setItem("pendingTrip:listId", listId ?? "none");
      sessionStorage.setItem("trip:cameFromOnboarding", "1");
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
      title="Ready to shop?"
      subtitle="Edit your first grocery list, then start a grocery trip."
      onSkip={skip}
      primaryLabel={busy ? "Starting…" : "Start your first trip"}
      primaryDisabled={busy}
      onPrimary={startTrip}
      footer={
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add item (e.g. milk)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => setQtyText((v) => String(Math.max(1, parseInt(v, 10) || 1)))}
              className="w-16"
              aria-label="Quantity"
            />
          </div>
          <Input
            placeholder="Notes (e.g. 500 ml) — optional"
            value={notes}
            maxLength={25}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v as CategorySlug);
                setAutoCat(false);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="primaryLight" size="lg" onClick={add} disabled={!name.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {grouped.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No items yet — add your first one below.
          </p>
        ) : (
          grouped.map(({ slug, entries }) => {
            const meta = getCategory(slug);
            return (
              <section key={slug}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {meta.emoji} {meta.label}
                </h3>
                <ul className="space-y-2">
                  {entries.map(({ item, index }) => (
                    <li key={index}>
                      <Card className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.name}</p>
                          {(item.qty > 1 || item.notes) && (
                            <p className="truncate text-xs text-muted-foreground">
                              {item.qty > 1 ? `Qty ${item.qty}` : ""}
                              {item.qty > 1 && item.notes ? " · " : ""}
                              {item.notes ?? ""}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => openEdit(index)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Edit item"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(index)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>

      <Dialog open={editing != null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                value={editQtyText}
                onChange={(e) => setEditQtyText(e.target.value.replace(/[^\d]/g, ""))}
                className="w-20"
                aria-label="Quantity"
              />
              <Input
                value={editNotes}
                maxLength={25}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notes (e.g. 500 ml)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primaryLight" size="lg" onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OnboardingLayout>
  );
}
