import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, useCurrency } from "@/lib/format";
import { format } from "date-fns";
import { MarketLoader } from "@/components/MarketLoader";
import { JaggedEdge, Row, Divider, PAPER, INK } from "@/components/trip/ReceiptPaper";
import { guessCategory } from "@/lib/categories";

// Relative-time title for free trips (no attached shopping list).
function formatTripTitle(date: Date): string {
  const now = new Date();
  const startOfWeek = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay(); // 0 = Sun
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day);
    return x;
  };
  const thisWeek = startOfWeek(now).getTime();
  const tripWeek = startOfWeek(date).getTime();
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  if (tripWeek === thisWeek) return `This ${weekday}'s run`;
  if (tripWeek === thisWeek - 7 * 24 * 60 * 60 * 1000) return `Last ${weekday}'s run`;
  return `${format(date, "MMM d")} run`;
}

type Item = {
  id: string;
  name_snapshot: string;
  price_cents: number;
  qty: number;
  store_name_snapshot: string | null;
};

// Strip trailing quantity markers like "x2", "×2", "(2)", "2x" when a multiplier
// is already shown beneath the item name.
function stripQtyMarker(name: string, qty: number): string {
  if (qty <= 1) return name;
  return name
    .replace(/\s*[\(\[]\s*\d+\s*[\)\]]\s*$/i, "")
    .replace(/\s*[x×*]\s*\d+\s*$/i, "")
    .replace(/\s*\d+\s*[x×]\s*$/i, "")
    .trim();
}

const fmtDateTime = (d: Date) =>
  `${d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  useCurrency();

  const [trip, setTrip] = useState<{
    started_at: string;
    total_cents: number;
    title: string;
    user_id: string;
  } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [budgetCents, setBudgetCents] = useState<number | null>(null);
  const [monthAvgCents, setMonthAvgCents] = useState<number | null>(null);
  const [monthTripCount, setMonthTripCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [revisiting, setRevisiting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [{ data: t }, { data: i }] = await Promise.all([
        supabase
          .from("trips")
          .select("started_at, total_cents, user_id, shopping_lists:list_id(name, hidden)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("trip_items")
          .select("id, name_snapshot, price_cents, qty, store_name_snapshot")
          .eq("trip_id", id)
          .order("scanned_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (!t) {
        setTrip(null);
        setReady(true);
        return;
      }
      const list: any = (t as any).shopping_lists;
      const title =
        list && !list.hidden && list.name
          ? list.name
          : format(new Date(t.started_at), "EEEE · MMM d, yyyy");
      setTrip({ started_at: t.started_at, total_cents: t.total_cents, title, user_id: t.user_id });
      setItems(i ?? []);

      // Month context: budget + sibling trips
      const tripDate = new Date(t.started_at);
      const monthStart = new Date(tripDate.getFullYear(), tripDate.getMonth(), 1).toISOString();
      const monthEnd = new Date(tripDate.getFullYear(), tripDate.getMonth() + 1, 1).toISOString();

      const [{ data: budget }, { data: monthTrips }] = await Promise.all([
        supabase.from("user_budgets").select("monthly_cents").eq("user_id", t.user_id).maybeSingle(),
        supabase
          .from("trips")
          .select("total_cents")
          .eq("user_id", t.user_id)
          .gte("started_at", monthStart)
          .lt("started_at", monthEnd),
      ]);
      if (cancelled) return;
      setBudgetCents(budget?.monthly_cents ?? null);
      const totals = (monthTrips ?? []).map((x: any) => x.total_cents ?? 0);
      setMonthTripCount(totals.length);
      setMonthAvgCents(totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null);

      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const storeName = useMemo(() => {
    const first = items.find((it) => it.store_name_snapshot)?.store_name_snapshot;
    return first ?? "Grocery Run";
  }, [items]);

  const highestItem = useMemo(() => {
    if (items.length === 0) return null;
    return items.reduce((acc, it) =>
      it.price_cents * it.qty > acc.price_cents * acc.qty ? it : acc
    );
  }, [items]);

  const pctOfBudget = useMemo(() => {
    if (!trip || !budgetCents || budgetCents <= 0) return null;
    return Math.round((trip.total_cents / budgetCents) * 100);
  }, [trip, budgetCents]);

  const avgDeltaPct = useMemo(() => {
    if (!trip || !monthAvgCents || monthAvgCents <= 0 || monthTripCount < 2) return null;
    return Math.round(((trip.total_cents - monthAvgCents) / monthAvgCents) * 100);
  }, [trip, monthAvgCents, monthTripCount]);

  const budgetSentence = useMemo(() => {
    if (!trip) return null;
    if (pctOfBudget !== null) {
      const monthName = format(new Date(trip.started_at), "LLLL").toLowerCase();
      return `this run was ${pctOfBudget}% of your ${monthName} budget.`;
    }
    if (avgDeltaPct !== null && avgDeltaPct !== 0) {
      const dir = avgDeltaPct > 0 ? "above" : "below";
      return `${Math.abs(avgDeltaPct)}% ${dir} your average trip this month.`;
    }
    return null;
  }, [trip, pctOfBudget, avgDeltaPct]);

  const handleRevisit = async () => {
    if (!trip || revisiting) return;
    setRevisiting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data: list, error: listErr } = await supabase
        .from("shopping_lists")
        .insert({ user_id: user.id, name: trip.title })
        .select("id")
        .single();
      if (listErr) throw listErr;
      const payload = items
        .filter((i) => i.name_snapshot.trim())
        .map((i, idx) => ({
          list_id: list.id,
          name: stripQtyMarker(i.name_snapshot, i.qty).trim() || i.name_snapshot,
          qty: i.qty,
          position: idx,
        }));
      if (payload.length > 0) {
        const { error: itemsErr } = await supabase.from("shopping_list_items").insert(payload);
        if (itemsErr) throw itemsErr;
      }
      toast.success("List created");
      navigate(`/lists/${list.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create list");
      setRevisiting(false);
    }
  };

  if (!ready) {
    return (
      <div className="px-5 pb-6 pt-4">
        <MarketLoader minHeight="55vh" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="px-5 pb-6 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-small text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="mt-8 text-center text-muted-foreground">Trip not found.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-12 pt-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-small text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mx-auto mt-8 flex w-full max-w-sm flex-col items-stretch">
        {/* Receipt sheet */}
        <div style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.18))" }}>
          <JaggedEdge position="top" />
          <div
            className="font-mono text-[13px] leading-snug"
            style={{ backgroundColor: PAPER, color: INK }}
          >
            <div className="px-6 pb-6 pt-5">
              {/* Header */}
              <div className="text-center">
                <div className="text-base font-bold uppercase tracking-widest">{storeName}</div>
                <div className="mt-1 text-xs text-neutral-600">
                  {fmtDateTime(new Date(trip.started_at))}
                </div>
              </div>

              <Divider />
              <Row label="Items" value={String(items.length)} />
              <Divider />

              {/* Items */}
              <ul className="space-y-2">
                {items.map((it) => {
                  const lineTotal = it.price_cents * it.qty;
                  const showMultiplier = it.qty > 1;
                  const displayName = showMultiplier
                    ? stripQtyMarker(it.name_snapshot, it.qty)
                    : it.name_snapshot;
                  return (
                    <li key={it.id}>
                      <div className="flex justify-between gap-4">
                        <span className="pr-2">{displayName}</span>
                        <span className="tabular-nums text-right">{formatMoney(lineTotal)}</span>
                      </div>
                      {showMultiplier && (
                        <div className="text-[11px] text-neutral-500">
                          {it.qty} × {formatMoney(it.price_cents)}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <Divider />
              <Row label="Total Spent" value={formatMoney(trip.total_cents)} strong />
              <Row
                label="% of Budget Spent"
                value={pctOfBudget === null ? "—" : `${pctOfBudget}%`}
              />

              {/* Centered insights fine print */}
              {(highestItem || budgetSentence) && (
                <>
                  <Divider />
                  <div className="space-y-1 px-2 py-1 text-center font-mono text-[11px] lowercase leading-relaxed text-neutral-500">
                    {highestItem && (
                      <p>
                        your most expensive item was the{" "}
                        {stripQtyMarker(highestItem.name_snapshot, highestItem.qty).toLowerCase()} at{" "}
                        {formatMoney(highestItem.price_cents * highestItem.qty)}.
                      </p>
                    )}
                    {budgetSentence && <p>{budgetSentence}</p>}
                  </div>
                </>
              )}
            </div>
          </div>
          <JaggedEdge position="bottom" />
        </div>

        {/* Bag-handle tab */}
        <div className="relative mx-auto mt-3 flex flex-col items-center">
          <button
            type="button"
            onClick={handleRevisit}
            disabled={revisiting}
            className="relative rounded-full px-7 py-3 text-xs font-medium uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: INK, color: PAPER }}
          >
            {/* Bag-handle arch — two stacked pills create the cut-out illusion */}
            <span
              aria-hidden
              className="absolute left-1/2 top-0 h-3 w-16 -translate-x-1/2 -translate-y-full rounded-t-full border-2 border-b-0"
              style={{ borderColor: INK }}
            />
            {revisiting ? "Creating list…" : "Shop from this list"}
          </button>
        </div>
      </div>
    </div>
  );
}
