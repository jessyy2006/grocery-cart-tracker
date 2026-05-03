import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Scanner } from "@/components/Scanner";
import { ScanLine, Plus, MapPin, Trash2, Check, X } from "lucide-react";
import { formatMoney, parsePriceToCents, useCurrency } from "@/lib/format";
import { lookupBarcode } from "@/lib/openFoodFacts";
import { findListMatch, getCategory, CATEGORY_ORDER, CategorySlug } from "@/lib/categories";
import { toast } from "sonner";

type TripItem = {
  id: string;
  store_id: string | null;
  store_name_snapshot: string | null;
  barcode: string | null;
  name_snapshot: string;
  price_cents: number;
  qty: number;
};
type Store = { id: string; name: string };

type ListItem = {
  id: string;
  name: string;
  qty: number;
  category: string;
  barcode: string | null;
  checked_at: string | null;
  price_cents: number | null;
  notes: string | null;
};

export default function ActiveTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useCurrency();
  const [tripId, setTripId] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [listName, setListName] = useState<string>("");
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<TripItem[]>([]);
  const [extras, setExtras] = useState<TripItem[]>([]);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; emoji: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pending, setPending] = useState<{
    barcode: string | null;
    name: string;
    price: string;
    qty: number;
    image_url?: string;
  } | null>(null);
  const [pickStoreOpen, setPickStoreOpen] = useState(false);

  // Load active trip
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("trips")
        .select("id, list_id")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1);
      if (!data?.[0]) {
        navigate("/trip/new", { replace: true });
        return;
      }
      setTripId(data[0].id);
      setListId((data[0] as any).list_id ?? null);
    })();
  }, [user, navigate]);

  // Load shopping list
  useEffect(() => {
    if (!listId) {
      setListItems([]);
      setListName("");
      return;
    }
    (async () => {
      const { data: l } = await supabase.from("shopping_lists").select("name").eq("id", listId).maybeSingle();
      if (l) setListName(l.name);
      const { data } = await supabase
        .from("shopping_list_items")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: true });
      setListItems((data ?? []) as ListItem[]);
    })();
  }, [listId]);

  // Load items + stores
  useEffect(() => {
    if (!tripId || !user) return;
    (async () => {
      const { data: itemRows } = await supabase
        .from("trip_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("scanned_at", { ascending: true });
      setItems((itemRows ?? []) as TripItem[]);

      const { data: storeRows } = await supabase.from("stores").select("id, name").order("name");
      setStores(storeRows ?? []);

      const stashedId = sessionStorage.getItem(`trip:${tripId}:store`);
      const last = (itemRows ?? []).at(-1)?.store_id;
      const startId = stashedId || last || storeRows?.[0]?.id;
      if (startId) {
        const s = (storeRows ?? []).find((x) => x.id === startId);
        if (s) setActiveStore(s);
      }
    })();
  }, [tripId, user]);

  const total = useMemo(() => items.reduce((a, i) => a + i.price_cents * i.qty, 0), [items]);

  const groupedList = useMemo(() => {
    const map = new Map<CategorySlug, ListItem[]>();
    for (const it of listItems) {
      const slug = (CATEGORY_ORDER.includes(it.category as CategorySlug)
        ? it.category
        : "other") as CategorySlug;
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug)!.push(it);
    }
    for (const arr of map.values())
      arr.sort((a, b) => Number(!!a.checked_at) - Number(!!b.checked_at));
    return CATEGORY_ORDER.filter((s) => map.has(s)).map((s) => ({ slug: s, items: map.get(s)! }));
  }, [listItems]);

  const toggleListItem = async (it: ListItem) => {
    const nowChecking = !it.checked_at;
    const checked_at = nowChecking ? new Date().toISOString() : null;
    const price_cents = nowChecking ? it.price_cents : null;
    setListItems((c) => c.map((i) => (i.id === it.id ? { ...i, checked_at, price_cents } : i)));
    await supabase
      .from("shopping_list_items")
      .update({ checked_at, price_cents })
      .eq("id", it.id);
  };

  const aiMatch = async (scannedName: string): Promise<string | null> => {
    const open = listItems.filter((i) => !i.checked_at);
    if (open.length === 0) return null;
    try {
      const { data, error } = await supabase.functions.invoke("match-list-item", {
        body: { scannedName, listItems: open.map((i) => ({ id: i.id, name: i.name })) },
      });
      if (error) throw error;
      if (data?.matchId) return data.matchId as string;
      // fall through to local fallback if AI returned null but we want to double-check
      return null;
    } catch (e) {
      const fallback = findListMatch(open, { barcode: "", name: scannedName });
      return fallback?.id ?? null;
    }
  };

  const handleMatchOrExtra = async (
    code: string | null,
    productName: string,
    tripItem: TripItem
  ) => {
    // Try barcode-first quick match
    const open = listItems.filter((i) => !i.checked_at);
    let matchId: string | null = null;
    if (code) {
      const byBarcode = open.find((i) => i.barcode && i.barcode === code);
      if (byBarcode) matchId = byBarcode.id;
    }
    if (!matchId) matchId = await aiMatch(productName);

    if (matchId) {
      const checked_at = new Date().toISOString();
      const newName = productName;
      const newPrice = tripItem.price_cents;
      setListItems((c) =>
        c.map((i) =>
          i.id === matchId
            ? { ...i, checked_at, barcode: i.barcode ?? code, name: newName, price_cents: newPrice }
            : i
        )
      );
      await supabase
        .from("shopping_list_items")
        .update({ checked_at, barcode: code ?? undefined, name: newName, price_cents: newPrice })
        .eq("id", matchId);
      toast.success(`Checked off: ${productName}`);
    } else {
      setExtras((c) => [...c, tripItem]);
      toast("Added to Extras", { icon: "✨" });
    }
  };

  const onScanned = async (code: string) => {
    setScanning(false);
    if (!activeStore) {
      toast.error("Pick a store first");
      setPickStoreOpen(true);
      return;
    }
    const { data: cached } = await supabase
      .from("products")
      .select("name, brand, image_url, default_price_cents")
      .eq("barcode", code)
      .maybeSingle();
    if (cached) {
      const fullName = cached.brand ? `${cached.brand} — ${cached.name}` : cached.name;
      setPending({
        barcode: code,
        name: fullName,
        price: cached.default_price_cents != null ? (cached.default_price_cents / 100).toFixed(2) : "",
        qty: 1,
        image_url: cached.image_url ?? undefined,
      });
      return;
    }
    const off = await lookupBarcode(code);
    const fullName = off ? (off.brand ? `${off.brand} — ${off.name}` : off.name) : "";
    setPending({
      barcode: code,
      name: fullName,
      price: "",
      qty: 1,
      image_url: off?.image_url,
    });
  };

  const confirmAdd = async () => {
    if (!pending || !tripId || !activeStore) return;
    const price_cents = parsePriceToCents(pending.price);
    if (price_cents == null) {
      toast.error("Enter a valid price");
      return;
    }
    if (!pending.name.trim()) {
      toast.error("Enter a name");
      return;
    }
    const insert = {
      trip_id: tripId,
      store_id: activeStore.id,
      store_name_snapshot: activeStore.name,
      barcode: pending.barcode,
      name_snapshot: pending.name.trim(),
      price_cents,
      qty: pending.qty,
    };
    const { data, error } = await supabase.from("trip_items").insert(insert).select("*").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const newItem = data as TripItem;
    setItems((c) => (c.some((i) => i.id === newItem.id) ? c : [...c, newItem]));
    if (pending.barcode) {
      await supabase.from("products").upsert({
        barcode: pending.barcode,
        name: pending.name.trim(),
        image_url: pending.image_url ?? null,
        default_price_cents: price_cents,
      });
    }
    const nameForMatch = pending.name.trim();
    const codeForMatch = pending.barcode;
    setPending(null);
    await handleMatchOrExtra(codeForMatch, nameForMatch, newItem);
  };

  const removeExtra = async (id: string) => {
    setExtras((c) => c.filter((i) => i.id !== id));
    setItems((c) => c.filter((i) => i.id !== id));
    await supabase.from("trip_items").delete().eq("id", id);
    setConfetti({ id: Date.now(), emoji: "🎉" });
    setTimeout(() => setConfetti(null), 2000);
  };

  const saveTrip = async () => {
    if (!tripId) return;
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    const { error } = await supabase
      .from("trips")
      .update({ status: "saved", ended_at: new Date().toISOString() })
      .eq("id", tripId);
    if (error) {
      toast.error(error.message);
      return;
    }
    sessionStorage.removeItem(`trip:${tripId}:store`);
    toast.success("Trip saved");
    navigate(`/trip/${tripId}`, { replace: true });
  };

  const pickStore = async (s: Store) => {
    setActiveStore(s);
    if (tripId) sessionStorage.setItem(`trip:${tripId}:store`, s.id);
    setPickStoreOpen(false);
  };

  const exitTrip = async () => {
    if (!tripId) return;
    await supabase.from("trips").delete().eq("id", tripId);
    sessionStorage.removeItem(`trip:${tripId}:store`);
    navigate("/", { replace: true });
  };

  if (!tripId) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Shopping at</p>
          <button onClick={() => setPickStoreOpen(true)} className="flex items-center gap-1 text-left">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-semibold">{activeStore?.name ?? "Pick a store"}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {extras.length > 0 && (
            <button
              onClick={() => setExtrasOpen((o) => !o)}
              aria-label="Show extras"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md"
            >
              {extras.length}
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={exitTrip}>
            <X className="mr-1 h-4 w-4" /> Exit
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {extrasOpen && extras.length > 0 && (
          <section className="rounded-2xl border border-accent bg-accent/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Extras</h3>
              <span className="text-xs text-muted-foreground">{extras.length}</span>
            </div>
            <ul className="space-y-2">
              {extras.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between rounded-xl bg-card p-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-sm font-medium">{ex.name_snapshot}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.qty} × {formatMoney(ex.price_cents)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeExtra(ex.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove extra"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {listItems.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No shopping list linked to this trip.
          </p>
        ) : (
          groupedList.map(({ slug, items: lis }) => {
            const meta = getCategory(slug);
            return (
              <section key={slug}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {meta.emoji} {meta.label}
                </h3>
                <ul className="space-y-2">
                  {lis.map((it) => (
                    <li key={it.id}>
                      <Card className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={!!it.checked_at}
                          onCheckedChange={() => toggleListItem(it)}
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
                          {(it.qty > 1 || it.notes) && (
                            <p className="truncate text-xs text-muted-foreground">
                              {it.qty > 1 ? `Qty ${it.qty}` : ""}
                              {it.qty > 1 && it.notes ? " · " : ""}
                              {it.notes ?? ""}
                            </p>
                          )}
                        </div>
                        {it.price_cents != null && (
                          <span className="shrink-0 text-right text-sm font-semibold text-primary">
                            {formatMoney(it.price_cents)}
                          </span>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>

      <footer className="border-t border-border bg-card p-4 safe-bottom">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Cart total</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{formatMoney(total)}</p>
              {listItems.length > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                  {listItems.filter((i) => i.checked_at).length}/{listItems.length}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={saveTrip} disabled={items.length === 0}>
            <Check className="mr-1 h-4 w-4" /> Save trip
          </Button>
        </div>
        <Button size="lg" className="h-14 w-full text-base" onClick={() => setScanning(true)}>
          <ScanLine className="mr-2 h-5 w-5" /> Scan barcode
        </Button>
      </footer>

      {confetti && (
        <div
          key={confetti.id}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
        >
          <span className="animate-confetti-bounce text-8xl">{confetti.emoji}</span>
        </div>
      )}

      {scanning && (
        <Scanner
          onCode={onScanned}
          onClose={() => setScanning(false)}
          onManualEntry={() => {
            setScanning(false);
            if (!activeStore) {
              toast.error("Pick a store first");
              setPickStoreOpen(true);
              return;
            }
            setPending({ barcode: null, name: "", price: "", qty: 1 });
          }}
        />
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to cart</DialogTitle>
          </DialogHeader>
          {pending && (
            <div className="space-y-4">
              {pending.image_url && (
                <img src={pending.image_url} alt="" className="mx-auto h-24 w-24 rounded-lg object-contain" />
              )}
              <div className="space-y-2">
                <Label htmlFor="iname">Name</Label>
                <Input
                  id="iname"
                  value={pending.name}
                  onChange={(e) => setPending({ ...pending, name: e.target.value })}
                  placeholder="Item name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="iprice">Price</Label>
                  <Input
                    id="iprice"
                    type="text"
                    inputMode="decimal"
                    value={pending.price}
                    onChange={(e) => setPending({ ...pending, price: e.target.value })}
                    placeholder="0.00"
                    autoFocus={!pending.price}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iqty">Qty</Label>
                  <Input
                    id="iqty"
                    type="number"
                    min={1}
                    value={pending.qty}
                    onChange={(e) => setPending({ ...pending, qty: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </div>
              </div>
              {pending.barcode && (
                <p className="text-xs text-muted-foreground">Barcode: {pending.barcode}</p>
              )}
              <Button className="w-full" onClick={confirmAdd}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={pickStoreOpen} onOpenChange={setPickStoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Choose store</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {stores.map((s) => (
              <Card
                key={s.id}
                onClick={() => pickStore(s)}
                className="flex cursor-pointer items-center gap-3 p-4 transition hover:border-primary"
              >
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">{s.name}</span>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate("/trip/new")}>
              <Plus className="mr-1 h-4 w-4" /> Add another store
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
