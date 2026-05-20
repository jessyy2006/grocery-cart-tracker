import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Scanner } from "@/components/Scanner";
import { ScanLine, Plus, MapPin, Trash2, Check, X, Search, Loader2 } from "lucide-react";
import { formatMoney, parsePriceToCents, useCurrency } from "@/lib/format";
import { lookupBarcode } from "@/lib/openFoodFacts";
import { findListMatch, getCategory, guessCategory, CATEGORY_ORDER, CategorySlug } from "@/lib/categories";
import {
  findNearbyStores,
  getCachedCoords,
  getCurrentPosition,
  searchStoresByName,
  NearbyStore,
} from "@/lib/device/geolocation";
import { TagPill } from "@/components/TagPill";
import { toast } from "sonner";

type TripItem = {
  id: string;
  store_id: string | null;
  store_name_snapshot: string | null;
  barcode: string | null;
  name_snapshot: string;
  price_cents: number;
  qty: number;
  substitutes_list_item_id?: string | null;
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
  tag: string | null;
};

export default function ActiveTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useCurrency();
  const [tripId, setTripId] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [listName, setListName] = useState<string>("");
  const [listHidden, setListHidden] = useState<boolean>(false);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
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
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [storeQuery, setStoreQuery] = useState("");
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[] | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<NearbyStore[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingErrors, setPendingErrors] = useState<{ name?: boolean; price?: boolean; qty?: boolean }>({});
  const [manualCheck, setManualCheck] = useState<{ item: ListItem; qty: string; price: string } | null>(null);
  const [manualErrors, setManualErrors] = useState<{ qty?: boolean; price?: boolean }>({});
  const [offList, setOffList] = useState<{ tripItem: TripItem; productName: string } | null>(null);
  const [subPickerOpen, setSubPickerOpen] = useState(false);
  const [subQuery, setSubQuery] = useState("");

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
      setListHidden(false);
      return;
    }
    (async () => {
      const { data: l } = await supabase
        .from("shopping_lists")
        .select("name, hidden")
        .eq("id", listId)
        .maybeSingle();
      if (l) {
        setListName(l.name);
        setListHidden(!!(l as any).hidden);
      }
      const { data } = await supabase
        .from("shopping_list_items")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: true });
      setListItems((data ?? []) as ListItem[]);
    })();
  }, [listId]);

  // Load items + restore stashed store
  useEffect(() => {
    if (!tripId || !user) return;
    (async () => {
      const { data: itemRows } = await supabase
        .from("trip_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("scanned_at", { ascending: true });
      setItems((itemRows ?? []) as TripItem[]);

      const stashedId = sessionStorage.getItem(`trip:${tripId}:store`);
      if (stashedId) {
        const { data: s } = await supabase
          .from("stores")
          .select("id, name")
          .eq("id", stashedId)
          .maybeSingle();
        if (s) setActiveStore(s as Store);
      }
    })();
  }, [tripId, user]);

  const total = useMemo(() => {
    const listSum = listItems.reduce(
      (a, i) => (i.checked_at && i.price_cents != null ? a + i.price_cents * (i.qty || 1) : a),
      0,
    );
    const extrasSum = extras.reduce((a, i) => a + i.price_cents * i.qty, 0);
    return listSum + extrasSum;
  }, [listItems, extras]);

  const uncheckListItem = async (it: ListItem) => {
    const sub = items.find((ti) => ti.substitutes_list_item_id === it.id);
    setListItems((c) =>
      c.map((i) => (i.id === it.id ? { ...i, checked_at: null, price_cents: null } : i)),
    );
    await supabase
      .from("shopping_list_items")
      .update({ checked_at: null, price_cents: null })
      .eq("id", it.id);
    if (sub) {
      setItems((c) => c.filter((i) => i.id !== sub.id));
      await supabase.from("trip_items").delete().eq("id", sub.id);
    }
  };

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

  const openManualCheck = (it: ListItem) => {
    setManualErrors({});
    setManualCheck({ item: it, qty: String(it.qty || 1), price: "" });
  };

  const confirmManualCheck = async () => {
    if (!manualCheck) return;
    const qtyNum = parseInt(manualCheck.qty, 10);
    const priceCents = parsePriceToCents(manualCheck.price);
    const errs: { qty?: boolean; price?: boolean } = {};
    if (!qtyNum || qtyNum < 1) errs.qty = true;
    if (priceCents == null) errs.price = true;
    if (errs.qty || errs.price) {
      setManualErrors(errs);
      return;
    }
    const it = manualCheck.item;
    const checked_at = new Date().toISOString();
    setListItems((c) =>
      c.map((i) => (i.id === it.id ? { ...i, checked_at, qty: qtyNum, price_cents: priceCents } : i))
    );
    await supabase
      .from("shopping_list_items")
      .update({ checked_at, qty: qtyNum, price_cents: priceCents })
      .eq("id", it.id);
    setManualCheck(null);
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
    } else if (listHidden && listId) {
      // Free-shop mode: silently add as a planned (pre-checked) list item,
      // categorized so it groups nicely. No extras prompt.
      const checked_at = new Date().toISOString();
      const slug = guessCategory(productName);
      const { data: row, error } = await supabase
        .from("shopping_list_items")
        .insert({
          list_id: listId,
          name: productName,
          qty: tripItem.qty,
          category: slug,
          barcode: code ?? null,
          price_cents: tripItem.price_cents,
          checked_at,
        })
        .select("*")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      setListItems((c) => [...c, row as ListItem]);
      // The trip_item created by confirmAdd is redundant in free mode
      // (cart total comes from listItems), so drop it to keep receipts clean.
      setItems((c) => c.filter((i) => i.id !== tripItem.id));
      await supabase.from("trip_items").delete().eq("id", tripItem.id);
      toast.success(`Added: ${productName}`);
    } else {
      // Not on list — ask the user: extra or substitute
      setOffList({ tripItem, productName });
    }
  };

  const confirmAsExtra = async () => {
    if (!offList) return;
    setExtras((c) => [...c, offList.tripItem]);
    toast("Added to Extras", { icon: "✨" });
    setOffList(null);
  };

  const openSubstitutePicker = () => {
    setSubQuery("");
    setSubPickerOpen(true);
  };

  const confirmAsSubstitute = async (planned: ListItem) => {
    if (!offList) return;
    const tripItemId = offList.tripItem.id;
    const checked_at = new Date().toISOString();
    // Persist on trip_item + check off planned item
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("trip_items").update({ substitutes_list_item_id: planned.id }).eq("id", tripItemId),
      supabase
        .from("shopping_list_items")
        .update({
          checked_at,
          price_cents: offList.tripItem.price_cents,
          qty: offList.tripItem.qty,
        })
        .eq("id", planned.id),
    ]);
    if (e1 || e2) {
      toast.error((e1 ?? e2)!.message);
      return;
    }
    setItems((c) =>
      c.map((i) => (i.id === tripItemId ? { ...i, substitutes_list_item_id: planned.id } : i))
    );
    setListItems((c) =>
      c.map((i) =>
        i.id === planned.id
          ? { ...i, checked_at, price_cents: offList.tripItem.price_cents, qty: offList.tripItem.qty }
          : i,
      ),
    );
    toast.success(`Substituted ${planned.name} → ${offList.productName}`);
    setSubPickerOpen(false);
    setOffList(null);
  };

  const onScanned = async (code: string) => {
    setScanning(false);
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
    if (!pending || !tripId) return;
    const price_cents = parsePriceToCents(pending.price);
    const errs: { name?: boolean; price?: boolean; qty?: boolean } = {};
    if (!pending.name.trim()) errs.name = true;
    if (price_cents == null) errs.price = true;
    if (!pending.qty || pending.qty < 1) errs.qty = true;
    if (errs.name || errs.price || errs.qty) {
      setPendingErrors(errs);
      return;
    }
    setPendingErrors({});
    const insert = {
      trip_id: tripId,
      store_id: activeStore?.id ?? null,
      store_name_snapshot: activeStore?.name ?? null,
      barcode: pending.barcode,
      name_snapshot: pending.name.trim(),
      price_cents: price_cents as number,
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

  const openStoreModal = async () => {
    setStoreModalOpen(true);
    if (nearbyStores !== null || loadingStores) return;
    setLoadingStores(true);
    setStoreError(null);
    try {
      const coords = getCachedCoords() ?? (await getCurrentPosition());
      const result = await findNearbyStores(coords, 5000);
      setNearbyStores(result);
    } catch (e: any) {
      setStoreError("Couldn't find nearby stores. Check your location permissions.");
    } finally {
      setLoadingStores(false);
    }
  };

  const pickStore = async (s: { name: string; address?: string | null; lat?: number; lng?: number }) => {
    if (!user) return;
    let storeId: string | undefined;
    const { data: existing } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", s.name)
      .limit(1);
    if (existing?.[0]) {
      storeId = existing[0].id;
    } else {
      const { data: created, error } = await supabase
        .from("stores")
        .insert({
          user_id: user.id,
          name: s.name,
          address: s.address ?? null,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
        })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      storeId = created!.id;
    }
    const next = { id: storeId!, name: s.name };
    setActiveStore(next);
    if (tripId) sessionStorage.setItem(`trip:${tripId}:store`, next.id);
    setStoreModalOpen(false);
    setStoreQuery("");
  };

  const exitTrip = async () => {
    if (!tripId) return;
    await supabase.from("trips").delete().eq("id", tripId);
    sessionStorage.removeItem(`trip:${tripId}:store`);
    navigate("/", { replace: true });
  };

  // Debounced global search when user types in store modal
  useEffect(() => {
    if (!storeModalOpen) return;
    const q = storeQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setSearchError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const handle = setTimeout(async () => {
      try {
        const res = await searchStoresByName(q);
        setSearchResults(res.slice(0, 5));
      } catch {
        setSearchError("Search failed. Try again.");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [storeQuery, storeModalOpen]);

  if (!tripId) return null;

  const isSearching = storeQuery.trim().length >= 2;
  const displayStores = isSearching ? (searchResults ?? []) : (nearbyStores ?? []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Shopping at</p>
          <button onClick={openStoreModal} className="flex items-center gap-1 text-left">
            {activeStore ? (
              <>
                <MapPin className="h-4 w-4 text-primary" />
                <span className="truncate font-semibold">{activeStore.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground underline-offset-2 hover:underline">
                Add store (optional)
              </span>
            )}
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
          <section className="rounded-2xl border border-red-500 bg-red-500/15 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-red-700">Extras</h3>
              <span className="text-xs font-medium text-red-700">{extras.length}</span>
            </div>
            <ul className="space-y-2">
              {extras.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between rounded-xl border border-red-500 bg-card p-2"
                >
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
                          onCheckedChange={() => (it.checked_at ? uncheckListItem(it) : openManualCheck(it))}
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(it.qty > 1 || it.notes) && (
                              <p className="truncate text-xs text-muted-foreground">
                                {it.qty > 1 ? `Qty ${it.qty}` : ""}
                                {it.qty > 1 && it.notes ? " · " : ""}
                                {it.notes ?? ""}
                              </p>
                            )}
                            {it.tag && <TagPill tag={it.tag} size="xs" />}
                            {(() => {
                              const sub = items.find((ti) => ti.substitutes_list_item_id === it.id);
                              return sub ? (
                                <span className="truncate text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                  ↔ {sub.name_snapshot}
                                </span>
                              ) : null;
                            })()}
                          </div>
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
              {listItems.length > 0 && (() => {
                const checked = listItems.filter((i) => i.checked_at).length;
                const denom = listItems.length;
                const numer = checked + extras.length;
                const cls =
                  numer > denom
                    ? "bg-red-500 text-white"
                    : numer === denom && denom > 0
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground";
                return (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
                    {numer}/{denom}
                  </span>
                );
              })()}
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
            setPending({ barcode: null, name: "", price: "", qty: 1 });
          }}
        />
      )}

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setPendingErrors({}); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to cart</DialogTitle>
          </DialogHeader>
          {pending && (
            <div className="space-y-4">
              {pending.image_url && (
                <img src={pending.image_url} alt="" className="mx-auto h-24 w-24 rounded-lg object-contain" />
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="iname">Name</Label>
                  {pendingErrors.name && <span className="text-xs font-medium text-red-500">Incomplete</span>}
                </div>
                <Input
                  id="iname"
                  value={pending.name}
                  onChange={(e) => { setPending({ ...pending, name: e.target.value }); if (pendingErrors.name) setPendingErrors({ ...pendingErrors, name: false }); }}
                  placeholder="Item name"
                  className={pendingErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="iprice">Price</Label>
                    {pendingErrors.price && <span className="text-xs font-medium text-red-500">Incomplete</span>}
                  </div>
                  <Input
                    id="iprice"
                    type="text"
                    inputMode="decimal"
                    value={pending.price}
                    onChange={(e) => { setPending({ ...pending, price: e.target.value }); if (pendingErrors.price) setPendingErrors({ ...pendingErrors, price: false }); }}
                    placeholder="0.00"
                    autoFocus={!pending.price}
                    className={pendingErrors.price ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="iqty">Qty</Label>
                    {pendingErrors.qty && <span className="text-xs font-medium text-red-500">Incomplete</span>}
                  </div>
                  <Input
                    id="iqty"
                    type="number"
                    min={1}
                    value={pending.qty || ""}
                    onChange={(e) => { const n = parseInt(e.target.value, 10); setPending({ ...pending, qty: isNaN(n) ? 0 : n }); if (pendingErrors.qty) setPendingErrors({ ...pendingErrors, qty: false }); }}
                    className={pendingErrors.qty ? "border-red-500 focus-visible:ring-red-500" : ""}
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

      <Dialog open={!!manualCheck} onOpenChange={(o) => { if (!o) { setManualCheck(null); setManualErrors({}); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check off {manualCheck?.item.name}</DialogTitle>
          </DialogHeader>
          {manualCheck && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mprice">Price</Label>
                    {manualErrors.price && <span className="text-xs font-medium text-red-500">Incomplete</span>}
                  </div>
                  <Input
                    id="mprice"
                    type="text"
                    inputMode="decimal"
                    value={manualCheck.price}
                    onChange={(e) => { setManualCheck({ ...manualCheck, price: e.target.value }); if (manualErrors.price) setManualErrors({ ...manualErrors, price: false }); }}
                    placeholder="0.00"
                    autoFocus
                    className={manualErrors.price ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mqty">Qty</Label>
                    {manualErrors.qty && <span className="text-xs font-medium text-red-500">Incomplete</span>}
                  </div>
                  <Input
                    id="mqty"
                    type="number"
                    min={1}
                    value={manualCheck.qty}
                    onChange={(e) => { setManualCheck({ ...manualCheck, qty: e.target.value.replace(/[^\d]/g, "") }); if (manualErrors.qty) setManualErrors({ ...manualErrors, qty: false }); }}
                    className={manualErrors.qty ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={confirmManualCheck}>
                <Check className="mr-1 h-4 w-4" /> Check off
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <Dialog open={!!offList && !subPickerOpen} onOpenChange={(o) => { if (!o) setOffList(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Not on your list</DialogTitle>
            <DialogDescription className="text-center">
              "{offList?.productName}" isn't on your shopping list. How should we count it?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full rounded-xl"
              variant="outline"
              onClick={confirmAsExtra}
            >
              Add as Extra
            </Button>
            <Button
              size="lg"
              className="w-full rounded-xl"
              onClick={openSubstitutePicker}
              disabled={!listItems.some((i) => !i.checked_at)}
            >
              Mark as Substitute
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={subPickerOpen} onOpenChange={(o) => { setSubPickerOpen(o); if (!o) setSubQuery(""); }}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Replace which item?</DialogTitle>
            <DialogDescription>
              Pick the planned item that "{offList?.productName}" substitutes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Search planned items"
              value={subQuery}
              onChange={(e) => setSubQuery(e.target.value)}
            />
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {listItems
                .filter((i) => !i.checked_at)
                .filter((i) => i.name.toLowerCase().includes(subQuery.trim().toLowerCase()))
                .map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={() => confirmAsSubstitute(i)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.name}</p>
                        {i.tag && <TagPill tag={i.tag} size="xs" className="mt-1" />}
                      </div>
                      <span className="text-xs text-muted-foreground">Qty {i.qty}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={storeModalOpen}
        onOpenChange={(o) => {
          setStoreModalOpen(o);
          if (!o) setStoreQuery("");
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{activeStore ? "Change store" : "Add store"}</DialogTitle>
            <DialogDescription>
              {isSearching
                ? "Top matches for your search."
                : "Grocery stores within 5 km of you."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={storeQuery}
                onChange={(e) => setStoreQuery(e.target.value)}
                placeholder="Search any store name or address"
                className="pl-9"
                autoFocus
              />
            </div>

            {activeStore && (
              <button
                onClick={() => {
                  setActiveStore(null);
                  if (tripId) sessionStorage.removeItem(`trip:${tripId}:store`);
                  setStoreModalOpen(false);
                  setStoreQuery("");
                }}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Remove current store
              </button>
            )}

            <div className="max-h-[50vh] overflow-y-auto">
              {isSearching ? (
                <>
                  {searching && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                    </div>
                  )}
                  {!searching && searchError && (
                    <p className="py-4 text-center text-sm text-muted-foreground">{searchError}</p>
                  )}
                  {!searching && !searchError && searchResults !== null && displayStores.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">No matches found.</p>
                  )}
                </>
              ) : (
                <>
                  {loadingStores && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Finding nearby stores…
                    </div>
                  )}
                  {!loadingStores && storeError && (
                    <p className="py-4 text-center text-sm text-muted-foreground">{storeError}</p>
                  )}
                  {!loadingStores && !storeError && nearbyStores !== null && displayStores.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No nearby grocery stores. Try searching by name.
                    </p>
                  )}
                </>
              )}
              {displayStores.length > 0 && (
                <ul className="space-y-2">
                  {displayStores.map((s, i) => (
                    <li key={`${s.lat},${s.lng}:${i}`}>
                      <button
                        onClick={() => pickStore(s)}
                        className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary"
                      >
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          {s.address && (
                            <p className="truncate text-xs text-muted-foreground">{s.address}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
