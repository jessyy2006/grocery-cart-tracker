import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Scanner } from "@/components/Scanner";
import { ScanLine, Plus, MapPin, Trash2, Check, ListChecks } from "lucide-react";
import { formatMoney, parsePriceToCents } from "@/lib/format";
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
};

export default function ActiveTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tripId, setTripId] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [listName, setListName] = useState<string>("");
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<TripItem[]>([]);
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

  // Load shopping list (if linked)
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

  // Realtime
  useEffect(() => {
    if (!tripId) return;
    const ch = supabase
      .channel(`trip-items-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_items", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          setItems((curr) => {
            if (payload.eventType === "INSERT") {
              if (curr.some((i) => i.id === (payload.new as any).id)) return curr;
              return [...curr, payload.new as TripItem];
            }
            if (payload.eventType === "DELETE") return curr.filter((i) => i.id !== (payload.old as any).id);
            if (payload.eventType === "UPDATE")
              return curr.map((i) => (i.id === (payload.new as any).id ? (payload.new as TripItem) : i));
            return curr;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tripId]);

  const total = useMemo(() => items.reduce((a, i) => a + i.price_cents * i.qty, 0), [items]);
  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; items: TripItem[]; subtotal: number }>();
    for (const i of items) {
      const key = i.store_id ?? "unknown";
      const name = i.store_name_snapshot ?? "Unspecified store";
      if (!m.has(key)) m.set(key, { name, items: [], subtotal: 0 });
      const g = m.get(key)!;
      g.items.push(i);
      g.subtotal += i.price_cents * i.qty;
    }
    return Array.from(m.values());
  }, [items]);

  const onScanned = async (code: string) => {
    setScanning(false);
    if (!activeStore) {
      toast.error("Pick a store first");
      setPickStoreOpen(true);
      return;
    }
    // Check cached product
    const { data: cached } = await supabase
      .from("products")
      .select("name, brand, image_url, default_price_cents")
      .eq("barcode", code)
      .maybeSingle();
    if (cached) {
      setPending({
        barcode: code,
        name: cached.brand ? `${cached.brand} — ${cached.name}` : cached.name,
        price: cached.default_price_cents != null ? (cached.default_price_cents / 100).toFixed(2) : "",
        qty: 1,
        image_url: cached.image_url ?? undefined,
      });
      return;
    }
    const off = await lookupBarcode(code);
    setPending({
      barcode: code,
      name: off ? (off.brand ? `${off.brand} — ${off.name}` : off.name) : "",
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
    setItems((c) => (c.some((i) => i.id === data!.id) ? c : [...c, data as TripItem]));
    // Update product cache
    if (pending.barcode) {
      await supabase.from("products").upsert({
        barcode: pending.barcode,
        name: pending.name.trim(),
        image_url: pending.image_url ?? null,
        default_price_cents: price_cents,
      });
    }
    setPending(null);
  };

  const removeItem = async (id: string) => {
    setItems((c) => c.filter((i) => i.id !== id));
    await supabase.from("trip_items").delete().eq("id", id);
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
        <Button variant="ghost" size="sm" onClick={() => setPickStoreOpen(true)}>
          Switch
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <ScanLine className="mb-3 h-10 w-10 text-primary" />
            <p className="font-medium text-foreground">Cart is empty</p>
            <p className="mt-1 text-sm">Tap Scan to add your first item</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((g) => (
              <section key={g.name}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.name}
                  </h3>
                  <span className="text-xs font-medium">{formatMoney(g.subtotal)}</span>
                </div>
                <ul className="space-y-2">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <Card className="flex items-center justify-between p-3">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate font-medium">{it.name_snapshot}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.qty} × {formatMoney(it.price_cents)}
                          </p>
                        </div>
                        <span className="mr-2 font-semibold">{formatMoney(it.price_cents * it.qty)}</span>
                        <button
                          onClick={() => removeItem(it.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-border bg-card p-4 safe-bottom">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Cart total</p>
            <p className="text-3xl font-bold">{formatMoney(total)}</p>
          </div>
          <Button variant="outline" onClick={saveTrip} disabled={items.length === 0}>
            <Check className="mr-1 h-4 w-4" /> Save trip
          </Button>
        </div>
        <Button size="lg" className="h-14 w-full text-base" onClick={() => setScanning(true)}>
          <ScanLine className="mr-2 h-5 w-5" /> Scan barcode
        </Button>
      </footer>

      {scanning && <Scanner onCode={onScanned} onClose={() => setScanning(false)} />}

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
