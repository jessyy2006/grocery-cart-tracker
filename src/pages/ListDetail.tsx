import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  
} from "@/components/ui/select";

import { ArrowLeft, Plus, ShoppingBasket, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CATEGORIES, CATEGORY_ORDER, CategorySlug, getCategory, guessCategory } from "@/lib/categories";
import { getDuplicateAlerts, normalizeItemName } from "@/lib/prefs";
import { TagSelector } from "@/components/TagSelector";
import { MarketLoader } from "@/components/MarketLoader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { LedgerRow } from "@/components/LedgerRow";
import { toast } from "sonner";
import { snapshotListIntoTrip } from "@/lib/snapshotList";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";

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
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editQtyText, setEditQtyText] = useState("1");
  const [editNotes, setEditNotes] = useState("");
  const [editTag, setEditTag] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameWrapRef = useRef<HTMLDivElement>(null);
  const [groupBy, setGroupBy] = useState<"category" | "tag">("category");
  const [dragId, setDragId] = useState<string | null>(null);
  const [tagEditing, setTagEditing] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const onDragStart = (e: DragStartEvent) => setDragId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setDragId(null);
    if (groupBy !== "category") return;
    const itemId = String(e.active.id);
    const targetCat = e.over?.id as CategorySlug | undefined;
    if (!targetCat || !CATEGORY_ORDER.includes(targetCat)) return;
    const item = items.find((i) => i.id === itemId);
    if (!item || item.category === targetCat) return;
    // Move to end of items array so it lands at the bottom of the target category group.
    setItems((c) => {
      const rest = c.filter((i) => i.id !== itemId);
      return [...rest, { ...item, category: targetCat }];
    });
    const { error } = await supabase
      .from("shopping_list_items")
      .update({ category: targetCat })
      .eq("id", itemId);
    if (error) toast.error(error.message);
  };


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

  // Cancel inline rename on outside click (revert draft).
  useEffect(() => {
    if (!nameEditing) return;
    const onDoc = (e: MouseEvent) => {
      if (nameWrapRef.current && !nameWrapRef.current.contains(e.target as Node)) {
        setNameEditing(false);
        setNameDraft(listName);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [nameEditing, listName]);

  // Close add pad on outside tap (ignore the +ADD trigger button).
  useEffect(() => {
    if (!addOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (padRef.current?.contains(t)) return;
      if (addBtnRef.current?.contains(t)) return;
      if (footerRef.current?.contains(t)) return;
      // Ignore clicks inside Radix portals (Select dropdown, dialogs, etc.)
      if (
        t.closest(
          '[data-radix-popper-content-wrapper],[role="listbox"],[role="dialog"],[role="menu"]'
        )
      )
        return;
      setAddOpen(false);
      setTagEditing(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [addOpen]);

  const commitTag = () => {
    const v = tagDraft.trim();
    if (v) setTag(v);
    setTagDraft("");
    setTagEditing(false);
  };

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

  const saveListName = async () => {
    const next = nameDraft.trim();
    if (!next || !id) {
      setNameEditing(false);
      setNameDraft(listName);
      return;
    }
    if (next === listName) {
      setNameEditing(false);
      return;
    }
    setListName(next);
    setNameEditing(false);
    const { error } = await supabase.from("shopping_lists").update({ name: next }).eq("id", id);
    if (error) toast.error(error.message);
  };

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
    const prev = items;
    setItems((c) => c.filter((i) => i.id !== itId));
    const { error } = await supabase.from("shopping_list_items").delete().eq("id", itId);
    if (error) {
      setItems(prev);
      toast.error("Couldn't remove the item");
    }
  };

  const startRun = async () => {
    if (!user || !id) return;
    if (items.length === 0) return toast.error("Add some items first");
    const { data: active } = await supabase
      .from("trips")
      .select("id")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1);
    if (active?.[0]) {
      await supabase.from("trips").update({ list_id: id }).eq("id", active[0].id);
      await snapshotListIntoTrip(active[0].id, id);
      navigate("/trip");
      return;
    }
    const { data, error } = await supabase
      .from("trips")
      .insert({ user_id: user.id, list_id: id, status: "active" })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    await snapshotListIntoTrip(data!.id, id);
    navigate("/trip");
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pt-3 safe-top">
        {/* Back arrow */}
        <button
          onClick={() => navigate("/lists")}
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Title row */}
        <div className="mt-3 flex items-start justify-between gap-3">
          <div ref={nameWrapRef} className="min-w-0 flex-1">
            {nameEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  autoFocus
                  maxLength={60}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveListName();
                    } else if (e.key === "Escape") {
                      setNameEditing(false);
                      setNameDraft(listName);
                    }
                  }}
                  className="h-auto border-0 border-b border-foreground/30 bg-transparent px-0 py-0 font-display text-h1 focus-visible:ring-0"
                />
                <button
                  type="button"
                  onClick={saveListName}
                  aria-label="Save name"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <Check className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(listName);
                  setNameEditing(true);
                }}
                className="block min-w-0 max-w-full truncate text-left font-display text-h1"
                aria-label="Rename list"
              >
                {listName}
              </button>
            )}
            <p className="mt-1 text-small text-muted-foreground">{total} items</p>
          </div>

          <button
            ref={addBtnRef}
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-card border border-border bg-background px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground hover:border-foreground/60"
            aria-label="Add item"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {!ready ? (
          <div className="mt-8">
            <MarketLoader minHeight="40vh" />
          </div>
        ) : (
          <>
            {items.length > 0 && (
              <div className="mt-6 flex items-center gap-2 text-[12px] lowercase">
                <span className="text-muted-foreground">group by:</span>
                <button
                  onClick={() => setGroupBy("category")}
                  className={
                    groupBy === "category"
                      ? "font-mono text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {groupBy === "category" ? "[ category ]" : "category"}
                </button>
                <button
                  onClick={() => setGroupBy("tag")}
                  className={
                    groupBy === "tag"
                      ? "font-mono text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {groupBy === "tag" ? "[ tag ]" : "tag"}
                </button>
              </div>
            )}

            {items.length === 0 && (
              <EmptyState title="no items yet" description='Tap "+ Add" to add your first one.' />
            )}

            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <div className="mt-6 space-y-6">
                {(groupBy === "category" ? groupedByCategory : groupedByTag).map((group) => {
                  const isCategoryGroup = groupBy === "category";
                  return (
                    <DroppableSection key={group.key} id={group.key} enabled={isCategoryGroup}>
                      <h3 className="mb-1 px-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {groupBy === "category"
                          ? `${(group as any).emoji} ${String(group.label).toLowerCase()}`
                          : (group as any).isTag
                          ? String(group.label).toLowerCase()
                          : "other"}
                      </h3>
                      <ul className="border-t border-[hsl(20_40%_18%/0.3)]">
                        {group.items.map((it) => (
                          <DraggableRow key={it.id} id={it.id} enabled={isCategoryGroup}>
                            <LedgerRow
                              name={it.name}
                              qty={it.qty}
                              note={it.notes}
                              tag={groupBy === "category" ? it.tag : null}
                              onQtyChange={async (next) => {
                                setItems((c) => c.map((i) => (i.id === it.id ? { ...i, qty: next } : i)));
                                await supabase.from("shopping_list_items").update({ qty: next }).eq("id", it.id);
                              }}
                              onEdit={() => openEdit(it)}
                              onDelete={() => setPendingDelete(it)}
                            />
                          </DraggableRow>
                        ))}
                      </ul>
                    </DroppableSection>
                  );
                })}
              </div>
              <DragOverlay dropAnimation={null}>
                {dragId ? (
                  <div className="rounded-card border border-foreground/20 bg-card px-3 py-2 text-[15px] lowercase shadow-lg">
                    {items.find((i) => i.id === dragId)?.name}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>


            <div ref={endRef} className="h-4" />
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
        {addOpen && (
          <motion.div
            ref={padRef}
            key="add-pad"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-hairline bg-background"
          >
            <div className="px-4 pt-2 pb-3">
              {/* Drag handle / collapse */}
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label="Collapse"
                className="mx-auto mb-3 flex h-3 w-full items-center justify-center"
              >
                <span className="block h-1 w-10 rounded-full bg-hairline" />
              </button>

              {/* ITEM NAME */}
              <div className="rounded-card border border-hairline px-3 py-2">
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  Item name*
                </div>
                <Input
                  placeholder="e.g. Greek Yogurt"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                  autoFocus
                  enterKeyHint="done"
                  className="mt-0.5 h-7 border-0 bg-transparent px-0 py-0 text-[15px] italic placeholder:italic placeholder:text-muted-foreground/70 focus-visible:ring-0"
                />
              </div>

              {/* QTY + NOTE */}
              <div className="mt-2 flex gap-2">
                <div className="w-[80px] shrink-0 rounded-card border border-hairline bg-muted/40 px-3 py-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    Qty
                  </div>
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={qtyText}
                    onChange={(e) => setQtyText(e.target.value.replace(/[^\d]/g, ""))}
                    onBlur={() => setQtyText((v) => String(Math.max(1, parseInt(v, 10) || 1)))}
                    aria-label="Quantity"
                    className="mt-0.5 h-7 border-0 bg-transparent px-0 py-0 text-[15px] focus-visible:ring-0"
                  />
                </div>
                <div className="flex-1 rounded-card border border-hairline px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      Note (optional)
                    </span>
                    {/* Inline category override chip */}
                    <Select
                      value={category}
                      onValueChange={(v) => {
                        setCategory(v as CategorySlug);
                        setAutoCat(false);
                      }}
                    >
                      <SelectTrigger
                        aria-label="Category"
                        className="h-5 w-auto gap-1 border border-hairline bg-background px-1.5 py-0 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground [&>svg]:h-3 [&>svg]:w-3"
                      >
                        <span>
                          {getCategory(category).emoji}{" "}
                          {getCategory(category).label.toLowerCase()}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.slug} value={c.slug}>
                            {c.emoji} {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Add details..."
                    value={notes}
                    maxLength={25}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-0.5 h-7 border-0 bg-transparent px-0 py-0 text-[15px] italic placeholder:italic placeholder:text-muted-foreground/70 focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* TAGS row — morphing */}
              <div className="mt-3 flex h-6 items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Tags:
                </span>
                {tagEditing ? (
                  <input
                    autoFocus
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        commitTag();
                      } else if (e.key === "Escape") {
                        setTagDraft("");
                        setTagEditing(false);
                      }
                    }}
                    onBlur={commitTag}
                    placeholder="type to add tag..."
                    className="h-6 flex-1 border-0 bg-transparent p-0 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0"
                  />
                ) : (
                  <>
                    {tag ? (
                      <span className="inline-flex items-center gap-1 rounded-control border border-[hsl(155_56%_15%)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[hsl(155_56%_15%)]">
                        {tag}
                        <button
                          type="button"
                          aria-label="Remove tag"
                          onClick={() => setTag(null)}
                          className="opacity-70 hover:opacity-100"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTagEditing(true)}
                        className="flex-1 text-left font-mono text-[9px] text-muted-foreground"
                      >
                        Type to add tag...
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setTagDraft("");
                        setTagEditing(true);
                      }}
                      aria-label="Add tag"
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer ref={footerRef} className="px-4 pt-3 pb-3">
        <Button
          variant="primaryLight"
          size="lg"
          className="w-full"
          onClick={addOpen ? addItem : startRun}
          disabled={addOpen && !name.trim()}
        >
          {addOpen ? (
            <>
              <Plus className="mr-2 h-5 w-5" /> add to list
            </>
          ) : (
            <>
              <ShoppingBasket className="mr-2 h-5 w-5" /> start grocery run
            </>
          )}
        </Button>
      </footer>


      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this item?"
        description={
          pendingDelete
            ? `"${pendingDelete.name.toLowerCase()}" will be removed from this list.`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingDelete) void remove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Duplicate item</DialogTitle>
          </DialogHeader>
          <p className="text-center text-body text-muted-foreground">
            Heads up — this item is already on your list. Add it anyway?
          </p>
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              variant="primaryLight"
              className="w-full"
              onClick={() => {
                setDupOpen(false);
                void performAdd();
              }}
            >
              add it anyway
            </Button>
            <Button
              size="lg"
              variant="secondaryLight"
              className="w-full"
              onClick={() => setDupOpen(false)}
            >
              cancel
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
          <DialogFooter className="flex-row gap-2 sm:justify-stretch sm:space-x-0">
            <Button variant="primaryLight" size="lg" className="flex-1" onClick={saveEdit}>Save</Button>
            <Button variant="secondaryLight" size="lg" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DraggableRow({
  id,
  enabled,
  children,
}: {
  id: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: enabled ? "manipulation" : undefined }}
    >
      {children}
    </div>
  );
}

function DroppableSection({
  id,
  enabled,
  children,
}: {
  id: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !enabled });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "rounded-card transition-colors",
        isOver && "bg-foreground/5 ring-1 ring-foreground/20",
      )}
    >
      {children}
    </section>
  );
}

