import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, ShoppingBasket } from "lucide-react";
import { CATEGORIES, CATEGORY_ORDER, CategorySlug, getCategory, guessCategory } from "@/lib/categories";
import { toast } from "sonner";

type Item = {
  id: string;
  name: string;
  qty: number;
  category: string;
  barcode: string | null;
  checked_at: string | null;
};

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listName, setListName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [category, setCategory] = useState<CategorySlug>("other");
  const [autoCat, setAutoCat] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: l } = await supabase.from("shopping_lists").select("name").eq("id", id).maybeSingle();
      if (l) setListName(l.name);
      const { data } = await supabase
        .from("shopping_list_items")
        .select("*")
        .eq("list_id", id)
        .order("created_at", { ascending: true });
      setItems((data ?? []) as Item[]);
    })();
  }, [id, user]);

  useEffect(() => {
    if (autoCat && name.trim()) setCategory(guessCategory(name));
  }, [name, autoCat]);

  const grouped = useMemo(() => {
    const map = new Map<CategorySlug, Item[]>();
    for (const it of items) {
      const slug = (CATEGORY_ORDER.includes(it.category as CategorySlug)
        ? it.category
        : "other") as CategorySlug;
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug)!.push(it);
    }
    // sort: unchecked first, then checked; preserve creation order otherwise
    for (const arr of map.values()) {
      arr.sort((a, b) => Number(!!a.checked_at) - Number(!!b.checked_at));
    }
    return CATEGORY_ORDER.filter((s) => map.has(s)).map((s) => ({ slug: s, items: map.get(s)! }));
  }, [items]);

  const total = items.length;
  const done = items.filter((i) => i.checked_at).length;

  const addItem = async () => {
    if (!id || !name.trim()) return;
    const slug = autoCat ? guessCategory(name) : category;
    const insert = {
      list_id: id,
      name: name.trim(),
      qty: Math.max(1, qty),
      category: slug,
    };
    const { data, error } = await supabase.from("shopping_list_items").insert(insert).select("*").single();
    if (error) return toast.error(error.message);
    setItems((c) => [...c, data as Item]);
    setName("");
    setQty(1);
    setAutoCat(true);
  };

  const toggle = async (it: Item) => {
    const checked_at = it.checked_at ? null : new Date().toISOString();
    setItems((c) => c.map((i) => (i.id === it.id ? { ...i, checked_at } : i)));
    await supabase.from("shopping_list_items").update({ checked_at }).eq("id", it.id);
  };

  const remove = async (itId: string) => {
    setItems((c) => c.filter((i) => i.id !== itId));
    await supabase.from("shopping_list_items").delete().eq("id", itId);
  };

  const startRun = async () => {
    if (!user || !id) return;
    if (items.length === 0) return toast.error("Add some items first");
    // Reuse existing active trip if present, otherwise create a new one linked to this list
    const { data: active } = await supabase
      .from("trips")
      .select("id")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1);
    if (active?.[0]) {
      await supabase.from("trips").update({ list_id: id }).eq("id", active[0].id);
      navigate("/trip");
      return;
    }
    const { data, error } = await supabase
      .from("trips")
      .insert({ user_id: user.id, list_id: id, status: "active" })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    navigate("/trip/new");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
        <button onClick={() => navigate("/lists")} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Shopping list</p>
          <h1 className="font-semibold">{listName}</h1>
        </div>
        <span className="text-xs text-muted-foreground">
          {done}/{total}
        </span>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {grouped.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No items yet — add your first one below.
          </p>
        ) : (
          grouped.map(({ slug, items }) => {
            const meta = getCategory(slug);
            return (
              <section key={slug}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {meta.emoji} {meta.label}
                </h3>
                <ul className="space-y-2">
                  {items.map((it) => (
                    <li key={it.id}>
                      <Card className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={!!it.checked_at}
                          onCheckedChange={() => toggle(it)}
                          aria-label="Toggle item"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate font-medium ${
                              it.checked_at ? "text-muted-foreground line-through" : ""
                            }`}
                          >
                            {it.name}
                          </p>
                          {it.qty > 1 && (
                            <p className="text-xs text-muted-foreground">Qty {it.qty}</p>
                          )}
                        </div>
                        <button
                          onClick={() => remove(it.id)}
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

      <footer className="space-y-3 border-t border-border bg-card p-4 safe-bottom">
        <div className="flex gap-2">
          <Input
            placeholder="Add item (e.g. milk)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-16"
          />
        </div>
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
          <Button onClick={addItem} disabled={!name.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <Button size="lg" className="h-14 w-full text-base" onClick={startRun}>
          <ShoppingBasket className="mr-2 h-5 w-5" /> Start grocery run
        </Button>
      </footer>
    </div>
  );
}
