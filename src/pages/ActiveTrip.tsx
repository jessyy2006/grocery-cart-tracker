import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Scanner } from "@/components/Scanner";
import { ScanLine, Plus, MapPin, Check, X, Search, Loader2, Camera } from "lucide-react";
import { formatMoney, parsePriceToCents, useCurrency, getCurrency } from "@/lib/format";
import { lookupBarcode } from "@/lib/openFoodFacts";
import { findListMatch, getCategory, guessCategory, CATEGORY_ORDER, CategorySlug } from "@/lib/categories";
import PrintedReceiptOverlay, { type TripReceiptPayload } from "@/components/trip/PrintedReceiptOverlay";
import {
  findNearbyStores,
  getCachedCoords,
  getCurrentPosition,
  searchStoresByName,
  NearbyStore,
} from "@/lib/device/geolocation";
import { TagPill } from "@/components/TagPill";
import { toast } from "sonner";
import { MarketLoader } from "@/components/MarketLoader";
import { LedgerRow } from "@/components/LedgerRow";

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
  const [listReady, setListReady] = useState(false);
  const [receipt, setReceipt] = useState<TripReceiptPayload | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

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

  // Load shopping list name/hidden + the per-trip planned snapshot
  useEffect(() => {
    if (!tripId) return;
    setListReady(false);
    let cancelled = false;
    (async () => {
      const listMetaPromise = listId
        ? supabase
            .from("shopping_lists")
            .select("name, hidden")
            .eq("id", listId)
            .maybeSingle()
        : Promise.resolve({ data: null });
      const [{ data: l }, { data: planned }] = await Promise.all([
        listMetaPromise,
        supabase
          .from("trip_planned_items")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (l) {
        setListName((l as any).name);
        setListHidden(!!(l as any).hidden);
      } else {
        setListName("");
        setListHidden(false);
      }
      setListItems((planned ?? []) as ListItem[]);
      setListReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [listId, tripId]);

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
      .from("trip_planned_items")
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
      .from("trip_planned_items")
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
        .from("trip_planned_items")
        .update({ checked_at, barcode: code ?? undefined, name: newName, price_cents: newPrice })
        .eq("id", matchId);
      toast.success(`Checked off: ${productName}`);
    } else if (listHidden && tripId) {
      // Free-shop mode: silently add as a planned (pre-checked) snapshot item,
      // categorized so it groups nicely. No extras prompt.
      const checked_at = new Date().toISOString();
      const slug = guessCategory(productName);
      const { data: row, error } = await supabase
        .from("trip_planned_items")
        .insert({
          trip_id: tripId,
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
      // Keep the trip_item: it backs trips.total_cents (via DB trigger) and
      // surfaces in receipts. UI cart total reads listItems, so no double count.
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
        .from("trip_planned_items")
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
    if (!tripId || !user) return;
    if (items.length === 0 && extras.length === 0 && listItems.every((i) => !i.checked_at)) {
      toast.error("Add at least one item");
      return;
    }
    const endedAt = new Date();
    const { error } = await supabase
      .from("trips")
      .update({ status: "saved", ended_at: endedAt.toISOString() })
      .eq("id", tripId);
    if (error) {
      toast.error(error.message);
      return;
    }
    sessionStorage.removeItem(`trip:${tripId}:store`);

    // Build receipt payload
    const checkedListItems = listItems.filter((i) => i.checked_at && i.price_cents != null);
    const receiptItems: { name: string; cents: number }[] = [
      ...checkedListItems.map((i) => ({
        name: i.name,
        cents: (i.price_cents ?? 0) * (i.qty || 1),
      })),
      ...extras.map((e) => ({
        name: e.name_snapshot,
        cents: e.price_cents * e.qty,
      })),
    ];

    // Biggest category in this trip
    const catTotals = new Map<string, number>();
    for (const i of checkedListItems) {
      const slug = (CATEGORY_ORDER.includes(i.category as CategorySlug)
        ? i.category
        : guessCategory(i.name)) as string;
      catTotals.set(slug, (catTotals.get(slug) ?? 0) + (i.price_cents ?? 0) * (i.qty || 1));
    }
    for (const e of extras) {
      const slug = guessCategory(e.name_snapshot);
      catTotals.set(slug, (catTotals.get(slug) ?? 0) + e.price_cents * e.qty);
    }
    let biggestCategory: string | null = null;
    if (catTotals.size > 0) {
      const top = [...catTotals.entries()].sort((a, b) => b[1] - a[1])[0];
      biggestCategory = getCategory(top[0]).label;
    }

    // Budget + streak from month trips
    let pctOfBudget: number | null = null;
    let streak = 0;
    try {
      const monthStart = new Date(endedAt.getFullYear(), endedAt.getMonth(), 1);
      const [{ data: budget }, { data: savedTrips }] = await Promise.all([
        supabase
          .from("user_budgets")
          .select("monthly_cents")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("trips")
          .select("id, total_cents, started_at")
          .eq("user_id", user.id)
          .eq("status", "saved")
          .order("started_at", { ascending: true }),
      ]);
      const budgetCents = budget?.monthly_cents ?? 0;
      const trips = (savedTrips ?? []) as { id: string; total_cents: number | null; started_at: string }[];
      const monthSpend = trips
        .filter((t) => new Date(t.started_at) >= monthStart)
        .reduce((a, t) => a + (t.total_cents ?? 0), 0);
      // Ensure current trip's value is reflected even if trigger hasn't run yet
      const currentReflected = trips.some((t) => t.id === tripId && (t.total_cents ?? 0) > 0);
      const adjustedMonthSpend = currentReflected ? monthSpend : monthSpend + total;
      if (budgetCents > 0) {
        pctOfBudget = Math.min(999, Math.round((adjustedMonthSpend / budgetCents) * 100));
        // Streak: walk most-recent saved trips, count those keeping running month total <= budget
        const monthRunning = new Map<string, number>();
        const cumByTrip = new Map<string, number>();
        const sorted = [...trips].sort(
          (a, b) => +new Date(a.started_at) - +new Date(b.started_at),
        );
        for (const t of sorted) {
          const d = new Date(t.started_at);
          const k = `${d.getFullYear()}-${d.getMonth()}`;
          const sum = (monthRunning.get(k) ?? 0) + (t.total_cents ?? 0);
          monthRunning.set(k, sum);
          cumByTrip.set(t.id, sum);
        }
        for (const t of [...sorted].reverse()) {
          if ((cumByTrip.get(t.id) ?? 0) <= budgetCents) streak++;
          else break;
        }
      }
    } catch {
      // best-effort — receipt still renders
    }

    setReceipt({
      storeName: activeStore?.name ?? "Unknown Store",
      date: endedAt,
      items: receiptItems,
      extraCount: extras.length,
      totalCents: total,
      pctOfBudget,
      biggestCategory,
      streak,
      currency: getCurrency(),
    });
    setReceiptOpen(true);
  };

  const dismissReceipt = () => {
    setReceiptOpen(false);
    toast.success("Trip saved");
    if (tripId) navigate(`/trip/${tripId}`, { replace: true });
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

  const checkedCount = listItems.filter((i) => i.checked_at).length + extras.length;
  const totalCount = listItems.length + extras.length;

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 pt-4 pb-3 safe-top">
        {/* LEFT — exit */}
        <div className="justify-self-start">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="font-mono text-[12px] lowercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕ exit
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
                <AlertDialogDescription>Your trip won't be saved.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90">
                  No, go back
                </AlertDialogCancel>
                <AlertDialogAction onClick={exitTrip} className="bg-transparent text-foreground hover:bg-muted">
                  Exit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* CENTER — list name (+ store) */}
        <button
          onClick={openStoreModal}
          className="min-w-0 justify-self-center text-center"
          aria-label={activeStore ? "Change store" : "Add store"}
        >
          {activeStore ? (
            <span className="block truncate text-[22px] leading-tight lowercase">
              <span className="font-display">{(listName || "untitled").toLowerCase()}</span>
              <span className="mx-1.5 text-muted-foreground">·</span>
              <span className="font-mono text-[14px] text-muted-foreground">
                {activeStore.name.toLowerCase()}
              </span>
            </span>
          ) : (
            <span className="block truncate font-display text-[24px] leading-tight lowercase">
              {(listName || "untitled").toLowerCase()}
            </span>
          )}
        </button>

        {/* RIGHT — progress counter */}
        <div className="justify-self-end font-mono text-[12px] tabular-nums text-muted-foreground">
          [ {checkedCount}/{totalCount} ]
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-8">
        {!listReady ? (
          <MarketLoader minHeight="40vh" />
        ) : (
          <>
            {listItems.length === 0 && extras.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {listHidden
                  ? "Scan or add items as you shop — we'll sort them by category."
                  : "No shopping list linked to this trip."}
              </p>
            ) : (
              <div className="space-y-6">
                {groupedList.map(({ slug, items: lis }) => {
                  const meta = getCategory(slug);
                  return (
                    <section key={slug}>
                      <h3 className="mb-1 px-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {meta.emoji} {meta.label.toLowerCase()}
                      </h3>
                      <ul className="border-t border-[hsl(20_40%_18%/0.3)]">
                        {lis.map((it) => {
                          const sub = items.find((ti) => ti.substitutes_list_item_id === it.id);
                          const noteParts: string[] = [];
                          if (it.notes) noteParts.push(it.notes);
                          if (sub) noteParts.push(`↔ ${sub.name_snapshot}`);
                          const note = noteParts.length ? noteParts.join(" · ") : null;
                          return (
                            <LedgerRow
                              key={it.id}
                              name={it.name}
                              qty={it.qty}
                              note={note}
                              tag={it.tag}
                              priceCents={it.price_cents}
                              showCheckbox
                              checked={!!it.checked_at}
                              onToggle={() =>
                                it.checked_at ? uncheckListItem(it) : openManualCheck(it)
                              }
                            />
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}

                {extras.length > 0 && (
                  <section>
                    <h3 className="mb-1 px-1 font-mono text-[11px] lowercase tracking-[0.14em] text-muted-foreground">
                      unplanned additions
                    </h3>
                    <ul className="divide-y divide-[hsl(20_40%_18%/0.3)] border-t border-[hsl(20_40%_18%/0.3)]">
                      {extras.map((ex) => (
                        <LedgerRow
                          key={ex.id}
                          name={ex.name_snapshot}
                          qty={ex.qty}
                          multiplierLine={`${ex.qty} × ${formatMoney(ex.price_cents)}`}
                          priceCents={ex.price_cents * ex.qty}
                          showCheckbox
                          checked
                          onToggle={() => removeExtra(ex.id)}
                          onDelete={() => removeExtra(ex.id)}
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Forest green hero footer */}
      <footer
        className="shrink-0 bg-forest text-forest-foreground px-5 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-forest-foreground/70">
            cart total
          </span>
          <button
            type="button"
            onClick={saveTrip}
            className="font-mono text-[12px] lowercase tracking-wide text-forest-foreground/80 hover:text-forest-foreground transition-colors"
          >
            [ save trip ]
          </button>
        </div>
        <p className="mt-2 flex items-baseline gap-2 leading-none">
          <span className="font-mono text-[28px] font-semibold tabular-nums text-forest-foreground">
            {formatMoney(total)}
          </span>
          {totalCount > 0 && (
            <span className="font-mono text-[12px] tabular-nums text-forest-foreground/70">
              ({checkedCount}/{totalCount} items)
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-background font-mono text-[14px] font-semibold lowercase tracking-wide text-forest hover:bg-background/95 transition-colors"
        >
          <Camera className="h-4 w-4" />
          scan barcode
        </button>
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

      <PrintedReceiptOverlay
        open={receiptOpen}
        payload={receipt}
        onDismiss={dismissReceipt}
      />
    </div>
  );
}
