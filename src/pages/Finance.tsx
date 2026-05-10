import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Pencil, ArrowDown, ArrowUp, Sparkles, LayoutGrid, Receipt as ReceiptIcon, Flame } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ReceiptView from "@/components/finance/ReceiptView";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
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
};
type ListItem = { list_id: string; name: string; barcode: string | null };
type Insight = { title: string; body: string };

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const monthLabel = (d: Date) => d.toLocaleString(undefined, { month: "short" });

export default function Finance() {
  const { user } = useAuth();
  // currency hook called below
  const [loading, setLoading] = useState(true);
  const [budgetCents, setBudgetCents] = useState<number | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [items, setItems] = useState<TripItem[]>([]);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [view, setView] = useState<"card" | "receipt">(() => {
    if (typeof window === "undefined") return "card";
    return (localStorage.getItem("finance:view") as "card" | "receipt") || "card";
  });
  const setViewPersist = (v: "card" | "receipt") => {
    setView(v);
    try { localStorage.setItem("finance:view", v); } catch { /* noop */ }
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

      const [budgetRes, tripsRes] = await Promise.all([
        supabase.from("user_budgets").select("monthly_cents").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("trips")
          .select("id, started_at, total_cents, list_id")
          .eq("status", "saved")
          .gte("started_at", sixMonthsAgo.toISOString())
          .order("started_at", { ascending: false }),
      ]);

      setBudgetCents(budgetRes.data?.monthly_cents ?? null);
      const tripRows = (tripsRes.data ?? []) as Trip[];
      setTrips(tripRows);

      if (tripRows.length) {
        const ids = tripRows.map((t) => t.id);
        const { data: itemsData } = await supabase
          .from("trip_items")
          .select("trip_id, name_snapshot, price_cents, qty, store_name_snapshot, barcode")
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

  // Load AI insights once main data is ready
  useEffect(() => {
    if (loading || !trips.length) return;
    setInsightsLoading(true);
    supabase.functions
      .invoke("finance-insights")
      .then(({ data, error }) => {
        if (error) {
          setInsights(null);
        } else if (data?.insights) {
          setInsights(data.insights as Insight[]);
        }
      })
      .finally(() => setInsightsLoading(false));
  }, [loading, trips.length]);

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
    setBudgetCents(cents);
    setEditOpen(false);
    toast.success("Budget updated");
  };

  const extrasPctOfSpend = derived.extrasNow.totalForListTrips
    ? Math.round((derived.extrasNow.cents / derived.extrasNow.totalForListTrips) * 100)
    : 0;
  const extrasDelta = derived.extrasNow.cents - derived.extrasPrev.cents;
  const maxBar = Math.max(...derived.series.map((s) => s.cents), budgetCents ?? 0, 1);

  return (
    <div className="space-y-5 px-5 pb-24 pt-2">
      <header className="flex items-end justify-between">
        <div>
          <p className="invisible select-none text-sm text-muted-foreground" aria-hidden>.</p>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
        </div>
        <div className="flex items-center gap-1">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setViewPersist(v as "card" | "receipt")}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="card" aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="receipt" aria-label="Receipt view">
              <ReceiptIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button size="icon" variant="ghost" onClick={openEditBudget} aria-label="Edit budget">
            <Pencil className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      ) : view === "receipt" ? (
        <ReceiptView
          budgetCents={budgetCents ?? 0}
          monthSpend={derived.monthSpend}
          tripCount={derived.monthTrips}
          avgTripCents={derived.avgTrip}
          extrasCents={derived.extrasNow.cents}
          extrasCount={derived.extrasNow.count}
          extrasPctOfSpend={extrasPctOfSpend}
          momDelta={derived.prevSpend > 0 ? derived.momDelta : null}
          prevSpend={derived.prevSpend}
          monthStart={new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
          monthEnd={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)}
          currency={currency}
        />
      ) : (
        <FinanceCardView
          hasBudget={hasBudget}
          budgetCents={budgetCents}
          derived={derived}
          remaining={remaining}
          over={over}
          pctUsed={pctUsed}
          openEditBudget={openEditBudget}
          extrasPctOfSpend={extrasPctOfSpend}
          extrasDelta={extrasDelta}
          maxBar={maxBar}
          insights={insights}
          insightsLoading={insightsLoading}
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveBudget}>Save</Button>
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
    extrasPctOfSpend,
    extrasDelta,
    maxBar,
    insights,
    insightsLoading,
  } = props;
  return (
    <>

      {/* Budget card */}
      <Card className="p-5">
        {!hasBudget ? (
          <div className="flex flex-col items-start gap-3">
            <div>
              <div className="text-lg font-semibold">Set your monthly budget</div>
              <div className="text-sm text-muted-foreground">
                Track how much you have left to spend on groceries.
              </div>
            </div>
            <Button onClick={openEditBudget}>Set budget</Button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-bold tracking-tight">
                  {formatMoney(Math.abs(remaining))}{" "}
                  <span className={over ? "text-destructive" : "text-muted-foreground"}>
                    {over ? "over" : "left"}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  of {formatMoney(budgetCents!)} monthly budget
                </div>
              </div>
              <div
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  over ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                }`}
              >
                {pctUsed}% used
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${over ? "bg-destructive" : "bg-accent"}`}
                style={{ width: `${Math.min(100, pctUsed)}%` }}
              />
            </div>
          </>
        )}
      </Card>

      {/* Behavior signals */}
      <div className="grid grid-cols-3 gap-2">
        <SignalCard
          label="Unplanned"
          value={formatMoney(derived.extrasNow.cents)}
          sub={`${derived.extrasNow.count} items · ${extrasPctOfSpend}%`}
          delta={extrasDelta}
          invert
        />
        <SignalCard
          label="Avg trip"
          value={formatMoney(derived.avgTrip)}
          sub={`${derived.monthTrips} trip${derived.monthTrips === 1 ? "" : "s"}`}
        />
        <SignalCard
          label="vs last month"
          value={`${derived.momDelta < 0 ? "↓" : derived.momDelta > 0 ? "↑" : ""} ${formatMoney(
            Math.abs(derived.momDelta)
          )}`}
          sub={derived.momDelta === 0 ? "no change" : derived.momDelta < 0 ? "less spent" : "more spent"}
        />
      </div>

      {/* Monthly chart */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Last 6 months</div>
          {hasBudget && (
            <div className="text-xs text-muted-foreground">
              Budget {formatMoney(budgetCents!)}
            </div>
          )}
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={derived.series.map((s) => ({ ...s, value: s.cents / 100 }))}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                formatter={(v: number) => formatMoney(Math.round(v * 100))}
                labelClassName="text-xs"
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {hasBudget && (
                <ReferenceLine
                  y={(budgetCents ?? 0) / 100}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                />
              )}
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {derived.series.map((s, i) => (
                  <Cell
                    key={i}
                    fill={
                      hasBudget && s.cents > (budgetCents ?? 0)
                        ? "hsl(var(--destructive))"
                        : "hsl(var(--accent))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Breakdown */}
      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">This month's breakdown</div>
        {derived.monthSpend === 0 ? (
          <EmptyMonth />
        ) : (
          <Tabs defaultValue="categories">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="stores">Stores</TabsTrigger>
            </TabsList>
            <TabsContent value="categories" className="mt-3 space-y-2">
              {derived.byCategory.map(([slug, cents]) => {
                const cat = getCategory(slug);
                const pct = Math.round((cents / derived.monthSpend) * 100);
                return (
                  <div key={slug} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        <span className="mr-2">{cat.emoji}</span>
                        {cat.label}
                      </div>
                      <div className="text-sm font-semibold">{formatMoney(cents)}</div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </TabsContent>
            <TabsContent value="stores" className="mt-3 space-y-2">
              {derived.byStore.map(([store, cents]) => (
                <div
                  key={store}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <div className="text-sm font-medium">{store}</div>
                  <div className="text-sm font-semibold">{formatMoney(cents)}</div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </Card>

      {/* Insights */}
      {(insightsLoading || (insights && insights.length > 0)) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" /> Insights
          </div>
          {insightsLoading ? (
            <Skeleton className="h-20 rounded-2xl" />
          ) : (
            insights!.slice(0, 2).map((ins, i) => (
              <Card key={i} className="p-4">
                <div className="text-sm font-semibold">{ins.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{ins.body}</div>
              </Card>
            ))
          )}
        </div>
      )}

      {!derived.series.some((s: { cents: number }) => s.cents > 0) && (
        <Card className="p-6 text-center">
          <div className="text-sm font-medium">No trips yet</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Start tracking trips to see your spending insights.
          </div>
          <Button asChild className="mt-3">
            <Link to="/">Start a trip</Link>
          </Button>
        </Card>
      )}
    </>
  );
}

function SignalCard({
  label,
  value,
  sub,
  delta,
  invert,
}: {
  label: string;
  value: string;
  sub: string;
  delta?: number;
  invert?: boolean;
}) {
  // For "invert" (extras): up is bad → red, down is good → green.
  const showDelta = typeof delta === "number" && delta !== 0;
  const isUp = (delta ?? 0) > 0;
  const good = invert ? !isUp : isUp;
  return (
    <Card className="p-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-base font-bold leading-tight">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        {showDelta &&
          (isUp ? (
            <ArrowUp className={`h-3 w-3 ${good ? "text-success" : "text-destructive"}`} />
          ) : (
            <ArrowDown className={`h-3 w-3 ${good ? "text-success" : "text-destructive"}`} />
          ))}
        <span>{sub}</span>
      </div>
    </Card>
  );
}

function EmptyMonth() {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      No spending recorded this month yet.
    </div>
  );
}
