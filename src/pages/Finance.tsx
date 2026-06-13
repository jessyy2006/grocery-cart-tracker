import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketLoader } from "@/components/MarketLoader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatMoney, parsePriceToCents, useCurrency } from "@/lib/format";
import { guessCategory, getCategory, tokens } from "@/lib/categories";
import { Pencil, LayoutGrid, Receipt as ReceiptIcon, ChevronDown } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReceiptView from "@/components/finance/ReceiptView";
import YearlyReceiptView from "@/components/finance/YearlyReceiptView";
import { toast } from "sonner";


type Trip = {
  id: string;
  started_at: string;
  total_cents: number;
  list_id: string | null;
};
type TripItem = {
  trip_id: string;
  name_snapshot: string;
  price_cents: number;
  qty: number;
  store_name_snapshot: string | null;
  barcode: string | null;
  substitutes_list_item_id: string | null;
};
type ListItem = { list_id: string; name: string; barcode: string | null };


const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const monthLabel = (d: Date) => d.toLocaleString(undefined, { month: "short" });

export default function Finance() {
  const { user } = useAuth();
  // currency hook called below
  const [loading, setLoading] = useState(true);
  const [budgetCents, setBudgetCents] = useState<number | null>(null);
  const [budgetHistory, setBudgetHistory] = useState<Map<string, number>>(new Map());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [items, setItems] = useState<TripItem[]>([]);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [view, setView] = useState<"card" | "receipt">(() => {
    if (typeof window === "undefined") return "receipt";
    return (localStorage.getItem("finance:view") as "card" | "receipt") || "receipt";
  });
  const setViewPersist = (v: "card" | "receipt") => {
    setView(v);
    try { localStorage.setItem("finance:view", v); } catch { /* noop */ }
  };
  const [period, setPeriod] = useState<"month" | "year">(() => {
    if (typeof window === "undefined") return "month";
    return (localStorage.getItem("finance:period") as "month" | "year") || "month";
  });
  const setPeriodPersist = (p: "month" | "year") => {
    setPeriod(p);
    try { localStorage.setItem("finance:period", p); } catch { /* noop */ }
  };
  const currency = useCurrency();

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);
      // Extend window to start of this year so yearly receipt has full coverage.
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const fetchSince = sixMonthsAgo < yearStart ? sixMonthsAgo : yearStart;

      const [budgetRes, tripsRes, historyRes] = await Promise.all([
        supabase.from("user_budgets").select("monthly_cents").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("trips")
          .select("id, started_at, total_cents, list_id")
          .eq("status", "saved")
          .gte("started_at", fetchSince.toISOString())
          .order("started_at", { ascending: false }),
        supabase
          .from("user_budget_history")
          .select("month_start, monthly_cents")
          .eq("user_id", user.id)
          .gte("month_start", fetchSince.toISOString().slice(0, 10)),
      ]);

      const currentBudget = budgetRes.data?.monthly_cents ?? null;
      setBudgetCents(currentBudget);
      const tripRows = (tripsRes.data ?? []) as Trip[];
      setTrips(tripRows);

      const hist = new Map<string, number>();
      for (const row of (historyRes.data ?? []) as { month_start: string; monthly_cents: number }[]) {
        const d = new Date(row.month_start);
        hist.set(monthKey(d), row.monthly_cents);
      }
      // Backfill current month from current budget if missing
      const nowD = new Date();
      const curKey = monthKey(nowD);
      if (currentBudget && !hist.has(curKey)) {
        const monthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1);
        hist.set(curKey, currentBudget);
        await supabase
          .from("user_budget_history")
          .upsert(
            { user_id: user.id, month_start: monthStart.toISOString().slice(0, 10), monthly_cents: currentBudget },
            { onConflict: "user_id,month_start" },
          );
      }
      setBudgetHistory(hist);

      if (tripRows.length) {
        const ids = tripRows.map((t) => t.id);
        const { data: itemsData } = await supabase
          .from("trip_items")
          .select("trip_id, name_snapshot, price_cents, qty, store_name_snapshot, barcode, substitutes_list_item_id")
          .in("trip_id", ids);
        setItems((itemsData ?? []) as TripItem[]);

        const listIds = Array.from(
          new Set(tripRows.map((t) => t.list_id).filter(Boolean) as string[])
        );
        if (listIds.length) {
          const { data: liData } = await supabase
            .from("shopping_list_items")
            .select("list_id, name, barcode")
            .in("list_id", listIds);
          setListItems((liData ?? []) as ListItem[]);
        }
      } else {
        setItems([]);
        setListItems([]);
      }
      setLoading(false);
    })();
  }, [user]);

  const derived = useMemo(() => {
    const now = new Date();
    const currentKey = monthKey(now);
    const prev = new Date(now);
    prev.setMonth(prev.getMonth() - 1);
    const prevKey = monthKey(prev);

    const tripsByMonth = new Map<string, Trip[]>();
    for (const t of trips) {
      const k = monthKey(new Date(t.started_at));
      const arr = tripsByMonth.get(k) ?? [];
      arr.push(t);
      tripsByMonth.set(k, arr);
    }

    const sumCents = (arr: Trip[]) => arr.reduce((a, t) => a + (t.total_cents ?? 0), 0);
    const monthSpend = sumCents(tripsByMonth.get(currentKey) ?? []);
    const prevSpend = sumCents(tripsByMonth.get(prevKey) ?? []);
    const monthTrips = (tripsByMonth.get(currentKey) ?? []).length;

    // Items grouped by trip
    const itemsByTrip = new Map<string, TripItem[]>();
    for (const it of items) {
      const arr = itemsByTrip.get(it.trip_id) ?? [];
      arr.push(it);
      itemsByTrip.set(it.trip_id, arr);
    }
    const listsByList = new Map<string, ListItem[]>();
    for (const li of listItems) {
      const arr = listsByList.get(li.list_id) ?? [];
      arr.push(li);
      listsByList.set(li.list_id, arr);
    }

    const isExtra = (it: TripItem, list: ListItem[] | undefined) => {
      if (it.substitutes_list_item_id) return false;
      if (!list || !list.length) return false;
      if (it.barcode && list.some((l) => l.barcode && l.barcode === it.barcode)) return false;
      const t = new Set(tokens(it.name_snapshot));
      if (!t.size) return true;
      return !list.some((l) => tokens(l.name).some((w) => t.has(w)));
    };

    const extrasFor = (key: string) => {
      const ts = tripsByMonth.get(key) ?? [];
      let cents = 0;
      let count = 0;
      let totalForListTrips = 0;
      for (const t of ts) {
        if (!t.list_id) continue;
        const list = listsByList.get(t.list_id);
        const its = itemsByTrip.get(t.id) ?? [];
        totalForListTrips += t.total_cents ?? 0;
        for (const it of its) {
          if (isExtra(it, list)) {
            cents += it.price_cents * it.qty;
            count += 1;
          }
        }
      }
      return { cents, count, totalForListTrips };
    };

    const extrasNow = extrasFor(currentKey);
    const extrasPrev = extrasFor(prevKey);

    // 6-month series
    const series: { key: string; label: string; cents: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const k = monthKey(d);
      series.push({
        key: k,
        label: monthLabel(d),
        cents: sumCents(tripsByMonth.get(k) ?? []),
      });
    }

    // Categories + stores for current month
    const monthItems: TripItem[] = (tripsByMonth.get(currentKey) ?? []).flatMap(
      (t) => itemsByTrip.get(t.id) ?? []
    );
    const byCategory = new Map<string, number>();
    const byStore = new Map<string, number>();
    for (const it of monthItems) {
      const cents = it.price_cents * it.qty;
      const cat = guessCategory(it.name_snapshot);
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + cents);
      const store = it.store_name_snapshot || "Unknown store";
      byStore.set(store, (byStore.get(store) ?? 0) + cents);
    }

    // Previous month categories (for deltas)
    const prevItems: TripItem[] = (tripsByMonth.get(prevKey) ?? []).flatMap(
      (t) => itemsByTrip.get(t.id) ?? []
    );
    const byCategoryPrev = new Map<string, number>();
    for (const it of prevItems) {
      const cents = it.price_cents * it.qty;
      const cat = guessCategory(it.name_snapshot);
      byCategoryPrev.set(cat, (byCategoryPrev.get(cat) ?? 0) + cents);
    }

    // Total item count for impulse rate
    const monthItemCount = monthItems.reduce((a, it) => a + (it.qty ?? 1), 0);

    // Biggest category change vs last month (only if prev month has data)
    let biggestCategoryChange: { slug: string; delta: number } | null = null;
    if (prevItems.length > 0) {
      const allCats = new Set<string>([...byCategory.keys(), ...byCategoryPrev.keys()]);
      for (const slug of allCats) {
        const delta = (byCategory.get(slug) ?? 0) - (byCategoryPrev.get(slug) ?? 0);
        if (!biggestCategoryChange || Math.abs(delta) > Math.abs(biggestCategoryChange.delta)) {
          biggestCategoryChange = { slug, delta };
        }
      }
    }

    // Streak: consecutive most-recent saved trips where running monthly total ≤ budget
    let streak = 0;
    if ((budgetCents ?? 0) > 0) {
      const sorted = [...trips].sort(
        (a, b) => +new Date(a.started_at) - +new Date(b.started_at)
      );
      const cumByTrip = new Map<string, number>();
      const monthRunning = new Map<string, number>();
      for (const t of sorted) {
        const k = monthKey(new Date(t.started_at));
        const sum = (monthRunning.get(k) ?? 0) + (t.total_cents ?? 0);
        monthRunning.set(k, sum);
        cumByTrip.set(t.id, sum);
      }
      for (const t of [...sorted].reverse()) {
        if ((cumByTrip.get(t.id) ?? 0) <= (budgetCents ?? 0)) streak++;
        else break;
      }
    }

    return {
      monthSpend,
      prevSpend,
      monthTrips,
      avgTrip: monthTrips ? Math.round(monthSpend / monthTrips) : 0,
      momDelta: monthSpend - prevSpend,
      extrasNow,
      extrasPrev,
      monthItemCount,
      series,
      byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
      byCategoryPrev,
      biggestCategoryChange,
      streak,
      byStore: Array.from(byStore.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [trips, items, listItems, budgetCents]);

  // Yearly aggregations (Jan 1 – Dec 31, current year)
  const yearly = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const yearTrips = trips.filter((t) => {
      const d = new Date(t.started_at);
      return d >= yearStart && d <= new Date(year, 11, 31, 23, 59, 59);
    });
    const yearTripIds = new Set(yearTrips.map((t) => t.id));
    const yearItems = items.filter((it) => yearTripIds.has(it.trip_id));

    const totalOutlayCents = yearTrips.reduce((a, t) => a + (t.total_cents ?? 0), 0);
    const itemCount = yearItems.reduce((a, it) => a + (it.qty ?? 1), 0);
    const tripCount = yearTrips.length;
    const avgBasket = tripCount ? itemCount / tripCount : 0;

    const monthlySeries: number[] = Array.from({ length: 12 }, () => 0);
    for (const t of yearTrips) {
      const m = new Date(t.started_at).getMonth();
      monthlySeries[m] += t.total_cents ?? 0;
    }

    // Most loyal store — by total spend
    const storeMap = new Map<string, number>();
    for (const it of yearItems) {
      const s = it.store_name_snapshot?.trim();
      if (!s) continue;
      storeMap.set(s, (storeMap.get(s) ?? 0) + it.price_cents * it.qty);
    }
    const mostLoyalStore =
      [...storeMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Staple of the year — by total qty (case-insensitive name)
    const stapleMap = new Map<string, number>();
    for (const it of yearItems) {
      const key = it.name_snapshot.trim().toUpperCase();
      if (!key) continue;
      stapleMap.set(key, (stapleMap.get(key) ?? 0) + (it.qty ?? 1));
    }
    const stapleEntry = [...stapleMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const staple = stapleEntry ? { name: stapleEntry[0], qty: stapleEntry[1] } : null;

    // Largest haul — highest single trip total
    const largestTrip = [...yearTrips].sort(
      (a, b) => (b.total_cents ?? 0) - (a.total_cents ?? 0),
    )[0];
    const largestHaul = largestTrip
      ? { date: new Date(largestTrip.started_at), cents: largestTrip.total_cents ?? 0 }
      : null;

    // Quarters
    const itemsByTrip = new Map<string, TripItem[]>();
    for (const it of yearItems) {
      const arr = itemsByTrip.get(it.trip_id) ?? [];
      arr.push(it);
      itemsByTrip.set(it.trip_id, arr);
    }
    const quarters = ([0, 1, 2, 3] as const).map((q) => {
      const qTrips = yearTrips.filter(
        (t) => Math.floor(new Date(t.started_at).getMonth() / 3) === q,
      );
      const totalCents = qTrips.reduce((a, t) => a + (t.total_cents ?? 0), 0);
      const qItems = qTrips.flatMap((t) => itemsByTrip.get(t.id) ?? []);
      const cats = new Map<string, number>();
      for (const it of qItems) {
        const slug = guessCategory(it.name_snapshot);
        cats.set(slug, (cats.get(slug) ?? 0) + it.price_cents * it.qty);
      }
      const topSlug = [...cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const topCategoryLabel = topSlug ? getCategory(topSlug).label : null;
      return { q, totalCents, tripCount: qTrips.length, topCategoryLabel };
    });

    return {
      year, yearStart, yearEnd,
      totalOutlayCents, itemCount, avgBasket, tripCount,
      monthlySeries, mostLoyalStore, staple, largestHaul, quarters,
    };
  }, [trips, items]);

  const hasBudget = budgetCents !== null && budgetCents > 0;
  const remaining = (budgetCents ?? 0) - derived.monthSpend;
  const over = remaining < 0;
  const pctUsed = hasBudget ? Math.min(999, Math.round((derived.monthSpend / (budgetCents || 1)) * 100)) : 0;

  const openEditBudget = () => {
    setBudgetInput(budgetCents ? (budgetCents / 100).toString() : "");
    setEditOpen(true);
  };

  const saveBudget = async () => {
    if (!user) return;
    const cents = parsePriceToCents(budgetInput);
    if (cents === null) {
      toast.error("Enter a valid amount");
      return;
    }
    const { error } = await supabase
      .from("user_budgets")
      .upsert({ user_id: user.id, monthly_cents: cents }, { onConflict: "user_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    const nowD = new Date();
    const monthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1);
    await supabase
      .from("user_budget_history")
      .upsert(
        { user_id: user.id, month_start: monthStart.toISOString().slice(0, 10), monthly_cents: cents },
        { onConflict: "user_id,month_start" },
      );
    setBudgetCents(cents);
    setBudgetHistory((prev) => {
      const next = new Map(prev);
      next.set(monthKey(nowD), cents);
      return next;
    });
    setEditOpen(false);
    toast.success("Budget updated");
  };

  const extrasPctOfSpend = derived.extrasNow.totalForListTrips
    ? Math.round((derived.extrasNow.cents / derived.extrasNow.totalForListTrips) * 100)
    : 0;
  const extrasDelta = derived.extrasNow.cents - derived.extrasPrev.cents;
  const maxBar = Math.max(...derived.series.map((s) => s.cents), budgetCents ?? 0, 1);

  // Impulse rate = impulse items / total items
  const impulseRate = derived.monthItemCount
    ? Math.round((derived.extrasNow.count / derived.monthItemCount) * 100)
    : 0;
  const impulseClass =
    impulseRate <= 10 ? "Disciplined" : impulseRate <= 25 ? "Moderate" : "High impulse";

  // Biggest category change for receipt summary
  const biggestCat = derived.biggestCategoryChange
    ? {
        label: getCategory(derived.biggestCategoryChange.slug).label,
        delta: derived.biggestCategoryChange.delta,
      }
    : null;

  // Personality line (receipt) — strict priority
  const nearLimit = hasBudget && !over && pctUsed >= 85;
  const personality = (() => {
    if (over) return "You've gone over budget.";
    if (nearLimit) return "Getting close to your limit.";
    if (impulseRate >= 26) return "Impulse spending is creeping up.";
    if (biggestCat && biggestCat.delta > 0)
      return `${biggestCat.label} are doing damage this month.`;
    if (derived.streak >= 2) return "You're building a strong habit.";
    return "You're staying under control.";
  })();

  // Single rotating insight (standard view) — same priority, richer copy
  const rotatingInsight: { title: string; body: string } | null = (() => {
    if (over) {
      return {
        title: "Over budget",
        body: `You're ${formatMoney(Math.abs(remaining))} over your monthly budget.`,
      };
    }
    if (nearLimit) {
      return {
        title: "Approaching your limit",
        body: `You've used ${pctUsed}% of your monthly budget.`,
      };
    }
    if (biggestCat && biggestCat.delta > 0) {
      return {
        title: `${biggestCat.label} are up`,
        body: `${biggestCat.label} spend rose ${formatMoney(biggestCat.delta)} vs last month.`,
      };
    }
    if (impulseRate >= 26) {
      return {
        title: "High impulse spending",
        body: `${impulseRate}% of items this month weren't on your list.`,
      };
    }
    if (derived.prevSpend > 0 && Math.abs(derived.momDelta) > 0) {
      const dir = derived.momDelta > 0 ? "up" : "down";
      return {
        title: `Average trip trending ${dir}`,
        body: `You've spent ${formatMoney(Math.abs(derived.momDelta))} ${dir === "up" ? "more" : "less"} than last month.`,
      };
    }
    return null;
  })();

  return (
    <div className="space-y-7 px-5 pt-3">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-h1">Finance</h1>
        </div>
        <div className="flex items-center gap-1">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setViewPersist(v as "card" | "receipt")}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="receipt" aria-label="Receipt view">
              <ReceiptIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="card" aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button size="icon" variant="ghost" onClick={openEditBudget} aria-label="Edit budget">
            <Pencil className="h-5 w-5" />
          </Button>
        </div>
      </header>


      {loading ? (
        <MarketLoader minHeight="55vh" />
      ) : view === "receipt" ? (
        <div className="space-y-5">
          <div className="flex">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-1 rounded-sm text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Change period"
              >
                <span>{period === "year" ? "THIS YEAR" : "THIS MONTH"}</span>
                <ChevronDown className="h-3 w-3" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[10rem]">
                <DropdownMenuItem onSelect={() => setPeriodPersist("month")}>
                  <span className="text-[11px] font-semibold tracking-[0.15em]">THIS MONTH</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPeriodPersist("year")}>
                  <span className="text-[11px] font-semibold tracking-[0.15em]">THIS YEAR</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {period === "month" ? (
            <ReceiptView
              budgetCents={budgetCents ?? 0}
              monthSpend={derived.monthSpend}
              tripCount={derived.monthTrips}
              avgTripCents={derived.avgTrip}
              impulseCents={derived.extrasNow.cents}
              impulseCount={derived.extrasNow.count}
              impulseRate={impulseRate}
              biggestCategory={biggestCat}
              streak={derived.streak}
              personality={personality}
              momDelta={derived.prevSpend > 0 ? derived.momDelta : null}
              prevSpend={derived.prevSpend}
              monthStart={new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
              monthEnd={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)}
              currency={currency}
            />
          ) : (
            <YearlyReceiptView
              year={yearly.year}
              yearStart={yearly.yearStart}
              yearEnd={yearly.yearEnd}
              totalOutlayCents={yearly.totalOutlayCents}
              itemCount={yearly.itemCount}
              avgBasket={yearly.avgBasket}
              tripCount={yearly.tripCount}
              monthlySeries={yearly.monthlySeries}
              mostLoyalStore={yearly.mostLoyalStore}
              staple={yearly.staple}
              largestHaul={yearly.largestHaul}
              quarters={yearly.quarters}
              currency={currency}
            />
          )}
        </div>
      ) : (
        <FinanceCardView
          hasBudget={hasBudget}
          budgetCents={budgetCents}
          derived={derived}
          remaining={remaining}
          over={over}
          pctUsed={pctUsed}
          openEditBudget={openEditBudget}
          impulseRate={impulseRate}
          impulseClass={impulseClass}
          extrasDelta={extrasDelta}
          maxBar={maxBar}
          budgetHistory={budgetHistory}
          rotatingInsight={rotatingInsight}
        />
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Monthly budget</DialogTitle>
            <DialogDescription>Set how much you want to spend on groceries each month.</DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            autoFocus
          />
          <DialogFooter className="flex-row gap-2 sm:justify-stretch sm:space-x-0">
            <Button variant="primaryLight" size="lg" className="flex-1" onClick={saveBudget}>Save</Button>
            <Button variant="secondaryLight" size="lg" className="flex-1" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function FinanceCardView(props: any) {
  const {
    hasBudget,
    budgetCents,
    derived,
    remaining,
    over,
    pctUsed,
    openEditBudget,
    impulseRate,
    impulseClass,
    extrasDelta,
    maxBar,
    budgetHistory,
    rotatingInsight,
  } = props;
  const budgetHistMap: Map<string, number> = budgetHistory ?? new Map();
  const currentMonthKey = derived.series[derived.series.length - 1]?.key as string | undefined;
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(currentMonthKey ?? null);
  if (!hasBudget) {
    return (
      <div className="space-y-3">
        <div className="text-lg font-semibold">Set your monthly budget</div>
        <div className="text-sm text-muted-foreground">
          Track how much you have left to spend on groceries.
        </div>
        <Button variant="primaryLight" size="lg" onClick={openEditBudget}>Set budget</Button>
      </div>
    );
  }

  const sectionAnchor = "text-eyebrow";
  const monoTiny = "text-[11px] lowercase tracking-wide text-muted-foreground";
  const maxHistBudget = Math.max(0, ...Array.from(budgetHistMap.values()));
  const maxBarVal = Math.max(maxHistBudget, budgetCents ?? 0, 1);
  const hasAnyTrips = derived.series.some((s: { cents: number }) => s.cents > 0);
  const dottedLeader = ". . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .";

  // Nice axis max: round up to a clean step
  const niceMax = (() => {
    const v = maxBarVal;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const steps = [1, 2, 2.5, 5, 10];
    for (const s of steps) {
      const candidate = s * pow;
      if (candidate >= v) return candidate;
    }
    return v;
  })();
  const yTicks = [niceMax, niceMax / 2, 0];
  

  return (
    <div className="space-y-10">
      {/* A — SUMMARY HERO */}
      <section className="space-y-3">
        <div className={sectionAnchor}>{new Date().toLocaleString(undefined, { month: "long" })}'s Budget</div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-money text-[44px] leading-[1.02] tracking-tight text-foreground">
              {formatMoney(Math.abs(remaining))}{" "}
              <span className={over ? "text-destructive" : "text-muted-foreground"}>
                {over ? "over" : "left"}
              </span>
            </div>
          </div>
          <div className="shrink-0 pt-2 text-[11px] font-semibold tracking-wide text-foreground">
            [ {pctUsed}% used ]
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(40_26%_86%)]">
          <div
            className={`h-full ${over ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${Math.min(100, pctUsed)}%` }}
          />
        </div>
        <div className={monoTiny}>
          of {formatMoney(budgetCents!)} budget
        </div>
      </section>

      {/* B — STATS GRID */}
      <section className="grid grid-cols-3">
        <StatColumn
          label="impulse"
          value={formatMoney(derived.extrasNow.cents)}
          meta={`${derived.extrasNow.count} item${derived.extrasNow.count === 1 ? "" : "s"} · ${impulseRate}%`}
        />
        <StatColumn
          label="avg/trip"
          value={formatMoney(derived.avgTrip)}
          meta={`${derived.monthTrips} trip${derived.monthTrips === 1 ? "" : "s"} total`}
          bordered
        />
        <StatColumn
          label="vs last"
          value={
            <span className={derived.momDelta < 0 ? "text-[hsl(163_94%_24%)]" : derived.momDelta > 0 ? "text-destructive" : ""}>
              {derived.momDelta < 0 ? "↓ " : derived.momDelta > 0 ? "↑ " : ""}
              {formatMoney(Math.abs(derived.momDelta))}
            </span>
          }
          meta={
            derived.momDelta === 0 ? (
              <span>no change</span>
            ) : derived.momDelta < 0 ? (
              <span className="font-bold text-[hsl(163_94%_24%)]">SAVED</span>
            ) : (
              <span className="font-bold text-destructive">OVER</span>
            )
          }
          bordered
        />
      </section>

      {/* C — BAR CHART */}
      <section className="space-y-3">
        <div className={sectionAnchor}>6-month overview</div>

        <div className="flex">
          {/* Y axis */}
          <div className="flex h-40 w-8 flex-col justify-between py-0.5 text-left text-[10px] tabular-nums text-muted-foreground">
            {yTicks.map((t) => (
              <div key={t} className="leading-none">{formatMoney(t, undefined, 0)}</div>
            ))}
          </div>
          {/* Bars + gridlines */}
          <div className="relative flex h-40 flex-1 items-stretch gap-3">
            {yTicks.slice(0, -1).map((t, i) => (
              <div
                key={i}
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[hsl(40_26%_86%)]"
                style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }}
              />
            ))}
            {derived.series.map((s: { key: string; cents: number }) => {
              const h = Math.max(s.cents > 0 ? 4 : 0, Math.round((s.cents / niceMax) * 100));
              const isCurrent = s.key === currentMonthKey;
              const isPast = !isCurrent && s.cents > 0;
              const isSelected = s.key === selectedMonthKey;
              const monthBudget = budgetHistMap.get(s.key) ?? (isCurrent ? budgetCents : null);
              const goalPct = monthBudget ? Math.min(100, (monthBudget / niceMax) * 100) : 0;
              const labelOverlapsDot = isSelected && monthBudget && goalPct >= h && (goalPct - h) < 14;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedMonthKey(s.key)}
                  className="relative z-10 flex flex-1 flex-col justify-end focus:outline-none"
                  aria-label={`${s.key} total ${formatMoney(s.cents)}`}
                >
                  {isSelected && (
                    <div
                      className="text-money pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] tabular-nums text-foreground"
                      style={{ bottom: `calc(${h}% + 6px)` }}
                    >
                      {formatMoney(s.cents)}
                    </div>
                  )}
                  {monthBudget && !labelOverlapsDot ? (
                    <div
                      className="pointer-events-none absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground"
                      style={{ bottom: `${goalPct}%` }}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={`w-full rounded-t-[4px] transition-all ${
                      isCurrent
                        ? "bg-primary"
                        : isPast
                        ? "bg-[hsl(145_25%_70%)]"
                        : "bg-[hsl(145_20%_85%)] opacity-60"
                    } ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                    style={{ height: `${h}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>
        <div className="-mt-3 flex gap-2">

          <div className="w-10" />
          <div className="flex flex-1 gap-3 border-t border-[hsl(40_26%_86%)] px-1 pt-1.5">

            {derived.series.map((s: { key: string; label: string }) => (
              <div
                key={s.key}
                className={`flex-1 text-center ${monoTiny} ${s.key === selectedMonthKey ? "text-foreground" : ""}`}
              >
                {s.label.toLowerCase()}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* D — BREAKDOWN MANIFEST */}
      {derived.monthSpend > 0 && (
        <BreakdownSection derived={derived} dottedLeader={dottedLeader} />
      )}

      {/* E — INSIGHT FOOTNOTE */}
      {rotatingInsight && (
        <section className="space-y-2 border-t border-[hsl(40_26%_86%)] pt-5">
          <div className="text-eyebrow">insights</div>
          <p className="font-display text-[15px] italic leading-snug text-foreground">
            {rotatingInsight.body}
          </p>
        </section>
      )}

      {!hasAnyTrips && (
        <div className="border-t border-[hsl(40_26%_86%)] pt-6 text-center">
          <div className="text-sm font-medium">No trips yet</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Start tracking trips to see your spending insights.
          </div>
          <Button variant="primaryLight" size="lg" asChild className="mt-3">
            <Link to="/">Start a trip</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function StatColumn({
  label,
  value,
  meta,
  bordered,
}: {
  label: string;
  value: ReactNode;
  meta: ReactNode;
  bordered?: boolean;
}) {
  return (
    <div className={`flex flex-col items-start gap-1 px-3 ${bordered ? "border-l border-[hsl(40_26%_86%)]" : ""}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-foreground">
        {label}
      </div>
      <div className="text-money text-[18px] leading-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[11px] lowercase tracking-wide text-muted-foreground">
        {meta}
      </div>
    </div>
  );
}

function BreakdownSection({
  derived,
  dottedLeader,
}: {
  derived: any;
  dottedLeader: string;
}) {
  const [mode, setMode] = useState<"category" | "store">("category");
  const sectionAnchor = "text-eyebrow";
  const monoTiny = "text-[11px] lowercase tracking-wide text-muted-foreground";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={sectionAnchor}>breakdown</div>
          {mode === "category" && (
            <div className={`mt-0.5 ${monoTiny}`}>compared to last month</div>
          )}
        </div>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as "category" | "store")}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="category" aria-label="Category view">
            <span className="text-[11px] font-semibold">category</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="store" aria-label="Store view">
            <span className="text-[11px] font-semibold">store</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {mode === "category" && (
        <div className="space-y-3">
          {derived.byCategory.map(([slug, cents]: [string, number]) => {
            const cat = getCategory(slug);
            const prevCents = derived.byCategoryPrev.get(slug) ?? 0;
            const hasPrevData = derived.byCategoryPrev.size > 0;
            const delta = cents - prevCents;
            const showDelta = hasPrevData && delta !== 0;
            const isUp = delta > 0;
            return (
              <div key={slug} className="flex items-baseline gap-2">
                <div className="flex shrink-0 items-baseline gap-1.5 text-sm text-foreground">
                  <span>{cat.emoji}</span>
                  <span className="lowercase">{cat.label}</span>
                </div>
                <div className="min-w-0 flex-1 select-none overflow-hidden whitespace-nowrap text-muted-foreground/50">
                  {dottedLeader}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-money text-sm tabular-nums text-foreground">
                    {formatMoney(cents)}
                  </div>
                  {showDelta && (
                    <div
                      className={`text-money text-[11px] tabular-nums ${
                        isUp ? "text-destructive" : "text-[hsl(163_94%_24%)]"
                      }`}
                    >
                      {isUp ? "↑ +" : "↓ -"}
                      {formatMoney(Math.abs(delta))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "store" && derived.byStore.length > 0 && (
        <div className="space-y-3">
          {derived.byStore.map(([store, cents]: [string, number]) => (
            <div key={store} className="flex items-baseline gap-2">
              <div className="shrink-0 text-sm lowercase text-foreground">{store}</div>
              <div className="min-w-0 flex-1 select-none overflow-hidden whitespace-nowrap text-muted-foreground/50">
                {dottedLeader}
              </div>
              <div className="text-money shrink-0 text-sm tabular-nums text-foreground">
                {formatMoney(cents)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

