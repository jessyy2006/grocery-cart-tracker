import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Loader2, Plus, Image as ImageIcon, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, parsePriceToCents } from "@/lib/format";
import { guessCategory, tokens } from "@/lib/categories";
import { format, parseISO } from "date-fns";

type ParsedItem = {
  name: string;
  qty: number;
  unit_price_cents: number | null;
  line_total_cents: number;
};
type Parsed = {
  store_name: string | null;
  purchased_at: string | null;
  total_cents: number | null;
  currency: string | null;
  items: ParsedItem[];
};
type Store = { id: string; name: string };
type ListLite = { id: string; name: string; items: { id: string; name: string; checked_at: string | null }[] };

const REVEAL = 76;

function SwipeRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const x = useMotionValue(0);
  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const target = info.offset.x < -REVEAL / 2 || info.velocity.x < -300 ? -REVEAL : 0;
    animate(x, target, { type: "spring", stiffness: 500, damping: 40 });
  };
  const handleDelete = () => {
    animate(x, 0, { duration: 0.12 });
    onDelete();
  };
  return (
    <li className="relative overflow-hidden">
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Delete item"
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive text-destructive-foreground"
        style={{ width: REVEAL }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <motion.div
        drag="x"
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={0.05}
        style={{ x }}
        onDragEnd={onDragEnd}
        className="relative bg-card touch-pan-y"
      >
        {children}
      </motion.div>
    </li>
  );
}

export default function ScanReceipt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"capture" | "preview" | "parsing" | "review">("capture");
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);

  // Review state
  const [storeName, setStoreName] = useState("");
  const [saveAsNewStore, setSaveAsNewStore] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [tripDate, setTripDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState<ListLite[]>([]);
  const [matchListId, setMatchListId] = useState<string | null>(null);
  const [linkMatch, setLinkMatch] = useState(true);
  const [saveAsList, setSaveAsList] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Derive matched store from typed name
  const matchedStore = useMemo(() => {
    const t = storeName.toLowerCase().trim();
    if (!t) return null;
    return (
      stores.find((s) => s.name.toLowerCase() === t) ??
      stores.find(
        (s) => s.name.toLowerCase().includes(t) || t.includes(s.name.toLowerCase()),
      ) ??
      null
    );
  }, [storeName, stores]);

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStreamRef(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        // Silent — user can use the upload button instead
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stop the stream when leaving capture stage
  useEffect(() => {
    if (stage !== "capture" && streamRef) {
      streamRef.getTracks().forEach((t) => t.stop());
      setStreamRef(null);
    }
    return () => {
      if (stage === "capture") return;
      streamRef?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const close = () => {
    streamRef?.getTracks().forEach((t) => t.stop());
    navigate(-1);
  };

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) {
      toast.error("Camera not ready");
      return;
    }
    const maxW = 1600;
    const scale = Math.min(1, maxW / v.videoWidth);
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptured(dataUrl);
    setStage("preview");
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCaptured(String(reader.result));
      setStage("preview");
    };
    reader.readAsDataURL(f);
  };

  const retake = () => {
    setCaptured(null);
    setStage("capture");
  };

  const parse = async () => {
    if (!captured) return;
    setStage("parsing");
    try {
      const { data, error } = await supabase.functions.invoke("parse-receipt", {
        body: { image: captured },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const p: Parsed = data;
      setParsed(p);
      setStoreName(p.store_name ?? "");
      setItems(p.items ?? []);
      setTripDate(p.purchased_at || format(new Date(), "yyyy-MM-dd"));
      setNewListName(p.store_name ? `${p.store_name} Essentials` : "Receipt Essentials");
      await loadStoresAndLists(p);
      setStage("review");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't read receipt");
      setStage("preview");
    }
  };

  const loadStoresAndLists = async (p: Parsed) => {
    if (!user) return;
    const [{ data: storeRows }, { data: listRows }] = await Promise.all([
      supabase.from("stores").select("id, name").eq("user_id", user.id).order("name"),
      supabase
        .from("shopping_lists")
        .select("id, name, shopping_list_items(id, name, checked_at)")
        .eq("user_id", user.id)
        .eq("hidden", false),
    ]);
    const allStores = (storeRows ?? []) as Store[];
    setStores(allStores);

    // Default: if no exact/partial match found, suggest saving as new store
    const target = (p.store_name ?? "").toLowerCase().trim();
    let isMatch = false;
    if (target) {
      isMatch = allStores.some(
        (s) =>
          s.name.toLowerCase() === target ||
          s.name.toLowerCase().includes(target) ||
          target.includes(s.name.toLowerCase()),
      );
    }
    setSaveAsNewStore(Boolean(target) && !isMatch);

    // List match: ≥85% overlap with uncompleted items
    const candidates: ListLite[] = (listRows ?? []).map((l: any) => ({
      id: l.id,
      name: l.name,
      items: (l.shopping_list_items ?? []).map((i: any) => ({
        id: i.id,
        name: i.name,
        checked_at: i.checked_at,
      })),
    }));
    setLists(candidates);
    const scannedTokens = p.items.map((i) => new Set(tokens(i.name)));
    let best: { list: ListLite; score: number } | null = null;
    for (const list of candidates) {
      const open = list.items.filter((i) => !i.checked_at);
      if (open.length === 0) continue;
      let hits = 0;
      for (const li of open) {
        const lt = tokens(li.name);
        if (lt.length === 0) continue;
        const matched = scannedTokens.some((st) => lt.some((w) => st.has(w)));
        if (matched) hits++;
      }
      const score = hits / open.length;
      if (!best || score > best.score) best = { list, score };
    }
    if (best && best.score >= 0.85) {
      setMatchListId(best.list.id);
      setLinkMatch(true);
    } else {
      setMatchListId(null);
    }
  };

  const totalCents = items.reduce((a, i) => a + i.line_total_cents, 0);

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const addItem = () =>
    setItems((arr) => [...arr, { name: "", qty: 1, unit_price_cents: null, line_total_cents: 0 }]);

  const save = async () => {
    if (!user) return;
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);
    try {
      // Resolve store
      let storeId: string | null = null;
      let storeNameSnap: string | null = null;
      if (matchedStore) {
        storeId = matchedStore.id;
        storeNameSnap = matchedStore.name;
      } else if (saveAsNewStore && storeName.trim()) {
        const { data, error } = await supabase
          .from("stores")
          .insert({ user_id: user.id, name: storeName.trim() })
          .select("id, name")
          .single();
        if (error) throw error;
        storeId = data.id;
        storeNameSnap = data.name;
      } else if (storeName.trim()) {
        storeNameSnap = storeName.trim();
      }

      // Create trip
      const startedAt = new Date(`${tripDate}T12:00:00`).toISOString();
      const linkedListId = linkMatch && matchListId ? matchListId : null;
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          status: "saved",
          started_at: startedAt,
          ended_at: startedAt,
          list_id: linkedListId,
          total_cents: totalCents,
        })
        .select("id")
        .single();
      if (tripErr) throw tripErr;

      // Insert items
      const payload = items
        .filter((i) => i.name.trim())
        .map((i) => ({
          trip_id: trip.id,
          store_id: storeId,
          store_name_snapshot: storeNameSnap,
          name_snapshot: i.name.trim(),
          price_cents: i.qty > 0 ? Math.round(i.line_total_cents / i.qty) : i.line_total_cents,
          qty: i.qty,
        }));
      if (payload.length > 0) {
        const { error: itemsErr } = await supabase.from("trip_items").insert(payload);
        if (itemsErr) throw itemsErr;
      }

      // Mark matched list as complete
      if (linkedListId) {
        await supabase
          .from("shopping_list_items")
          .update({ checked_at: new Date().toISOString() })
          .eq("list_id", linkedListId)
          .is("checked_at", null);
      }

      // Save as new reusable list
      if (saveAsList && newListName.trim()) {
        const { data: list, error: listErr } = await supabase
          .from("shopping_lists")
          .insert({ user_id: user.id, name: newListName.trim() })
          .select("id")
          .single();
        if (listErr) throw listErr;
        const listItemsPayload = items
          .filter((i) => i.name.trim())
          .map((i, idx) => ({
            list_id: list.id,
            name: i.name.trim(),
            qty: i.qty,
            category: guessCategory(i.name),
            position: idx,
          }));
        if (listItemsPayload.length > 0) {
          await supabase.from("shopping_list_items").insert(listItemsPayload);
        }
      }

      toast.success("Receipt saved");
      navigate(`/trip/${trip.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't save trip");
      setSaving(false);
    }
  };

  // ----- Capture stage -----
  if (stage === "capture" || stage === "preview" || stage === "parsing") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
        {stage === "capture" && (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        )}
        {(stage === "preview" || stage === "parsing") && captured && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={captured} alt="Receipt" className="h-full w-full object-contain bg-black" />
        )}

        {/* Frame overlay (only during capture) */}
        {stage === "capture" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
            <p className="rounded-full bg-black/55 px-4 py-1.5 text-center text-sm">
              Scan your receipt within the frame
            </p>
            <div
              className="rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{ width: "min(78vw, 380px)", height: "min(70vh, 560px)" }}
            />
          </div>
        )}

        {/* Top close */}
        <button
          onClick={close}
          className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-6 pb-10 pt-6 safe-bottom">
          {stage === "capture" && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur"
                aria-label="Upload photo"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <button
                onClick={shoot}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl"
                aria-label="Capture"
              >
                <span className="h-16 w-16 rounded-full border-4 border-black" />
              </button>
              <div className="h-12 w-12" />
            </>
          )}
          {stage === "preview" && (
            <>
              <Button variant="secondary" size="lg" onClick={retake} className="flex-1 mr-2">
                <RefreshCw className="h-4 w-4" /> Retake
              </Button>
              <Button size="lg" onClick={parse} className="flex-1 ml-2">
                Use photo
              </Button>
            </>
          )}
          {stage === "parsing" && (
            <div className="flex w-full flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm">Reading your receipt…</p>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
      </div>
    );
  }

  // ----- Review stage -----
  const parsedTotal = parsed?.total_cents ?? null;
  const matchList = lists.find((l) => l.id === matchListId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground/55 backdrop-blur-sm">
      <div className="flex-1 overflow-y-auto px-4 py-6 safe-top">
        <div className="mx-auto w-full max-w-md">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-eyebrow">Review scanned receipt</p>
                <h1 className="text-h2 mt-1">Confirm details</h1>
              </div>
              <button
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Store */}
            <div className="mt-5 space-y-2">
              <Label className="text-small">Store</Label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Store name"
              />
              {storeName.trim() && !matchedStore && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline p-3">
                  <Checkbox
                    checked={saveAsNewStore}
                    onCheckedChange={(v) => setSaveAsNewStore(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-small">
                    Save <strong>"{storeName.trim()}"</strong> as a new store
                  </span>
                </label>
              )}
            </div>

            {/* Date */}
            <div className="mt-4 space-y-2">
              <Label className="text-small">Date</Label>
              <Input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} />
            </div>

            {/* Items */}
            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <Label className="text-small">Items</Label>
                <button onClick={addItem} className="text-small text-primary inline-flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <ul className="mt-2 divide-y divide-hairline rounded-lg border border-hairline">
                {items.length === 0 && (
                  <li className="p-4 text-center text-small text-muted-foreground">No items detected</li>
                )}
                {items.map((it, idx) => (
                  <SwipeRow key={idx} onDelete={() => removeItem(idx)}>
                    <div className="grid grid-cols-[1fr_44px_72px] items-center gap-2 bg-card p-2.5">
                      <Input
                        value={it.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                        placeholder="Item"
                        className="h-10"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={it.qty}
                        onChange={(e) =>
                          updateItem(idx, { qty: Math.max(1, parseInt(e.target.value || "1", 10)) })
                        }
                        className="h-10 px-1 text-center"
                      />
                      <Input
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        value={priceDrafts[idx] ?? (it.line_total_cents / 100).toFixed(2)}
                        onChange={(e) =>
                          setPriceDrafts((d) => ({ ...d, [idx]: e.target.value }))
                        }
                        onBlur={(e) => {
                          const c = parsePriceToCents(e.target.value) ?? 0;
                          updateItem(idx, { line_total_cents: c });
                          setPriceDrafts((d) => {
                            const { [idx]: _, ...rest } = d;
                            return rest;
                          });
                        }}
                        className="h-10 px-2 text-right"
                      />
                    </div>
                  </SwipeRow>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-small text-muted-foreground">Total</span>
                <span className="text-h3">{formatMoney(totalCents)}</span>
              </div>
              {parsedTotal !== null && Math.abs(parsedTotal - totalCents) > 1 && (
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  Receipt total: {formatMoney(parsedTotal)}
                </p>
              )}
            </div>

            {/* List match */}
            {matchList && (
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-hairline p-3">
                <Checkbox
                  checked={linkMatch}
                  onCheckedChange={(v) => setLinkMatch(v === true)}
                  className="mt-0.5"
                />
                <span className="text-small">
                  Match this trip to your <strong>"{matchList.name}"</strong> list
                </span>
              </label>
            )}

            {/* Save as new list */}
            <div className="mt-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline p-3">
                <Checkbox
                  checked={saveAsList}
                  onCheckedChange={(v) => setSaveAsList(v === true)}
                  disabled={linkMatch && !!matchListId}
                  className="mt-0.5"
                />
                <span className="text-small">Save these items as a reusable shopping list</span>
              </label>
              {saveAsList && !(linkMatch && matchListId) && (
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name"
                  className="mt-2"
                />
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save trip"}
              </Button>
            </div>
          </Card>
          {parsed && parsed.purchased_at && (
            <p className="mt-3 text-center text-xs text-white/80">
              Receipt date detected: {format(parseISO(parsed.purchased_at), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
