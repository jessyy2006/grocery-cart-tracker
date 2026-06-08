import { useEffect, useMemo, useRef, useState } from "react";
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

import { ArrowLeft, Plus, Trash2, ShoppingBasket, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { CATEGORIES, CATEGORY_ORDER, CategorySlug, getCategory, guessCategory } from "@/lib/categories";
import { getDuplicateAlerts, normalizeItemName } from "@/lib/prefs";
import { TagPill } from "@/components/TagPill";
import { TagSelector } from "@/components/TagSelector";
import { MarketLoader } from "@/components/MarketLoader";
import { toast } from "sonner";

type Item = {
  id: string;
  name: string;
  qty: number;
  category: string;
  barcode: string | null;
  checked_at: string | null;
  notes: string | null;
  price_cents: number | null;
  tag: string | null;
};

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listName, setListName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [qtyText, setQtyText] = useState("1");
  const [category, setCategory] = useState<CategorySlug>("other");
  const [autoCat, setAutoCat] = useState(true);
  const [runActive, setRunActive] = useState(false);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editQtyText, setEditQtyText] = useState("1");
  const [editNotes, setEditNotes] = useState("");
  const [editTag, setEditTag] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [groupBy, setGroupBy] = useState<"category" | "tag">("category");
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    (async () => {
      const [{ data: l }, { data }, { data: trips }] = await Promise.all([
        supabase.from("shopping_lists").select("name").eq("id", id).maybeSingle(),
        supabase
          .from("shopping_list_items")
          .select("*")
          .eq("list_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("trips")
          .select("id")
          .eq("list_id", id)
          .eq("status", "active")
          .limit(1),
      ]);
      if (cancelled) return;
      if (l) setListName(l.name);
      setItems((data ?? []) as Item[]);
      setRunActive(!!trips?.[0]);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  useEffect(() => {
    if (autoCat && name.trim()) setCategory(guessCategory(name));
  }, [name, autoCat]);

  const tagSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const it of items) {
      if (it.tag && !seen.has(it.tag.toLowerCase())) {
        seen.add(it.tag.toLowerCase());
        out.push(it.tag);
      }
    }
    return out;
  }, [items]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<CategorySlug, Item[]>();
    for (const it of items) {
      const slug = (CATEGORY_ORDER.includes(it.category as CategorySlug)
        ? it.category
        : "other") as CategorySlug;
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug)!.push(it);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => Number(!!a.checked_at) - Number(!!b.checked_at));
    }
    return CATEGORY_ORDER.filter((s) => map.has(s)).map((s) => ({ key: s as string, label: getCategory(s).label, emoji: getCategory(s).emoji, items: map.get(s)! }));
  }, [items]);

  const groupedByTag = useMemo(() => {
    const map = new Map<string, Item[]>();
    const order: string[] = [];
    for (const it of items) {
      const k = it.tag ?? "__none";
      if (!map.has(k)) {
        map.set(k, []);
        order.push(k);
      }
      map.get(k)!.push(it);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => Number(!!a.checked_at) - Number(!!b.checked_at));
    }
    const sortedKeys = order.filter((k) => k !== "__none");
    if (map.has("__none")) sortedKeys.push("__none");
    return sortedKeys.map((k) => ({
      key: k,
      label: k === "__none" ? "Other" : k,
      isTag: k !== "__none",
      items: map.get(k)!,
    }));
  }, [items]);

  const total = items.length;
  const done = items.filter((i) => i.checked_at).length;

  const performAdd = async () => {
    if (!id || !name.trim()) return;
    const slug = autoCat ? guessCategory(name) : category;
    const parsedQty = Math.max(1, parseInt(qtyText, 10) || 1);
    const insert = {
      list_id: id,
      name: name.trim(),
      qty: parsedQty,
      category: slug,
      notes: notes.trim() ? notes.trim().slice(0, 25) : null,
      tag: tag,
    };
    const { data, error } = await supabase.from("shopping_list_items").insert(insert).select("*").single();
    if (error) return toast.error(error.message);
    setItems((c) => [...c, data as Item]);
    setName("");
    setQtyText("1");
    setNotes("");
    setTag(null);
    setAutoCat(true);
    setAddOpen(false);
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  };

  const addItem = async () => {
    if (!id || !name.trim()) return;
    if (getDuplicateAlerts()) {
      const target = normalizeItemName(name);
      const dup = items.some((it) => normalizeItemName(it.name) === target);
      if (dup) {
        setDupOpen(true);
        return;
      }
    }
    await performAdd();
  };

  const openEdit = (it: Item) => {
    setEditing(it);
    setEditName(it.name);
    setEditQtyText(String(it.qty));
    setEditNotes(it.notes ?? "");
    setEditTag(it.tag ?? null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const newName = editName.trim();
    if (!newName) return toast.error("Name can't be empty");
    const newQty = Math.max(1, parseInt(editQtyText, 10) || 1);
    const newNotes = editNotes.trim() ? editNotes.trim().slice(0, 25) : null;
    const newTag = editTag;
    setItems((c) =>
      c.map((i) => (i.id === editing.id ? { ...i, name: newName, qty: newQty, notes: newNotes, tag: newTag } : i))
    );
    await supabase
      .from("shopping_list_items")
      .update({ name: newName, qty: newQty, notes: newNotes, tag: newTag })
      .eq("id", editing.id);
    setEditing(null);
  };

  const toggle = async (it: Item) => {
    if (!runActive) {
      toast.error("Start the grocery run to check items off");
      return;
    }
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
      <header className="glass sticky top-0 z-10 flex items-center justify-between border-b border-hairline px-5 py-3 safe-top">
        <button onClick={() => navigate("/lists")} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sunk" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setRenameValue(listName);
            setRenameOpen(true);
          }}
          className="flex flex-col items-center text-center"
          aria-label="Rename list"
        >
          <p className="text-eyebrow">Shopping list</p>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-h2 font-display">
            {listName}
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </button>
        <span className="text-money text-small text-muted-foreground w-10 text-right">
          {done}/{total}
        </span>
      </header>


      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {!ready ? (
          <MarketLoader minHeight="50vh" />
        ) : (
          <>
            {items.length > 0 && (
              <div className="flex items-center justify-end gap-1 text-xs">
                <span className="mr-1 text-muted-foreground">Group by</span>
                <button
                  onClick={() => setGroupBy("category")}
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    groupBy === "category" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  Category
                </button>
                <button
                  onClick={() => setGroupBy("tag")}
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    groupBy === "tag" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  Tag
                </button>
              </div>
            )}

            {items.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No items yet — tap the + below to add your first one.
              </p>
            )}

            {(groupBy === "category" ? groupedByCategory : groupedByTag).map((group) => (
              <section key={group.key}>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupBy === "category"
                    ? `${(group as any).emoji} ${group.label}`
                    : (group as any).isTag
                    ? <TagPill tag={group.label} />
                    : "Other"}
                </h3>
                <ul className="space-y-2">
                  {group.items.map((it) => (
                    <li key={it.id}>
                      <Card className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate font-medium ${
                              it.checked_at ? "text-muted-foreground line-through" : ""
                            }`}
                          >
                            {it.name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {(it.qty > 1 || it.notes) && (
                              <p className="truncate text-xs text-muted-foreground">
                                {it.qty > 1 ? `Qty ${it.qty}` : ""}
                                {it.qty > 1 && it.notes ? " · " : ""}
                                {it.notes ?? ""}
                              </p>
                            )}
                            {groupBy === "category" && it.tag && <TagPill tag={it.tag} size="xs" />}
                          </div>
                        </div>
                        {it.price_cents != null && (
                          <span className="shrink-0 text-sm font-semibold text-primary">
                            {formatMoney(it.price_cents)}
                          </span>
                        )}
                        <button
                          onClick={() => openEdit(it)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Edit item"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
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
            ))}

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label="Add item"
              className="flex h-14 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 text-muted-foreground transition hover:border-muted-foreground hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
            </button>
            <div ref={endRef} />
          </>
        )}
      </div>

      <footer className="border-t border-border bg-card px-4 pt-3 pb-3">
        <Button size="lg" className="h-14 w-full text-base" onClick={startRun}>
          <ShoppingBasket className="mr-2 h-5 w-5" /> Start grocery run
        </Button>
      </footer>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add item (e.g. milk)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                autoFocus
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
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v as CategorySlug);
                setAutoCat(false);
              }}
            >
              <SelectTrigger>
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
            <TagSelector value={tag} suggestions={tagSuggestions} onChange={setTag} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addItem} disabled={!name.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Duplicate item</DialogTitle>
            <DialogDescription className="text-center">
              Heads up — this item is already on your list. Add it anyway?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              variant="destructive"
              className="w-full rounded-xl"
              onClick={() => {
                setDupOpen(false);
                void performAdd();
              }}
            >
              Yes, add it
            </Button>
            <Button
              size="lg"
              className="w-full rounded-xl bg-success text-success-foreground hover:bg-success/90"
              onClick={() => setDupOpen(false)}
            >
              No
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
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
            <TagSelector value={editTag} suggestions={tagSuggestions} onChange={setEditTag} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename list</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            autoFocus
            maxLength={60}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void (async () => {
                  const next = renameValue.trim();
                  if (!next || !id || next === listName) return setRenameOpen(false);
                  setListName(next);
                  setRenameOpen(false);
                  const { error } = await supabase
                    .from("shopping_lists")
                    .update({ name: next })
                    .eq("id", id);
                  if (error) toast.error(error.message);
                })();
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const next = renameValue.trim();
                if (!next || !id) return;
                if (next === listName) return setRenameOpen(false);
                setListName(next);
                setRenameOpen(false);
                const { error } = await supabase
                  .from("shopping_lists")
                  .update({ name: next })
                  .eq("id", id);
                if (error) toast.error(error.message);
              }}
              disabled={!renameValue.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
