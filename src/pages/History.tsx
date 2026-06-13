import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { ScanLine } from "lucide-react";
import { useCurrency } from "@/lib/format";
import { format } from "date-fns";
import { TripTapeRow } from "@/components/trip/TripTapeRow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";

import { MarketLoader } from "@/components/MarketLoader";

type Row = {
  id: string;
  started_at: string;
  total_cents: number;
  stores: string[];
  itemCount: number;
  title: string;
};


const ALL = "all";
const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM yyyy");
};

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useCurrency();
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState<string>(ALL);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      await supabase.from("trips").delete().lt("started_at", cutoff.toISOString());
      const { data } = await supabase
        .from("trips")
        .select("id, started_at, total_cents, trip_items(store_name_snapshot), shopping_lists:list_id(name, hidden)")
        .eq("status", "saved")
        .gte("started_at", cutoff.toISOString())
        .order("started_at", { ascending: false });
      if (cancelled) return;
      setRows(
        (data ?? []).map((t: any) => {
          const list = t.shopping_lists;
          const title =
            list && !list.hidden && list.name
              ? list.name
              : format(new Date(t.started_at), "EEE, MMM d");
          return {
            id: t.id,
            started_at: t.started_at,
            total_cents: t.total_cents,
            itemCount: (t.trip_items ?? []).length,
            stores: Array.from(
              new Set((t.trip_items ?? []).map((i: any) => i.store_name_snapshot).filter(Boolean)),
            ) as string[],
            title,
          };
        }),
      );

      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const monthOptions = useMemo(() => {
    const keys = Array.from(new Set(rows.map((r) => monthKey(r.started_at))));
    keys.sort((a, b) => (a < b ? 1 : -1));
    return keys;
  }, [rows]);

  const filtered = useMemo(
    () => (month === ALL ? rows : rows.filter((r) => monthKey(r.started_at) === month)),
    [rows, month],
  );

  // Group by month for section headers
  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const k = monthKey(r.started_at);
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-7 px-5 pt-3">
      <PageHeader
        title="history"
        className="items-center [&_h1]:text-display [&_h1]:lowercase [&_h1]:leading-[1.25] [&_h1]:pb-1 [&_h1]:overflow-visible"
        action={
          <div className="flex items-center gap-2">
            {monthOptions.length > 0 && (
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-9 w-[140px] rounded-card bg-surface border-hairline text-small">
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent className="rounded-card">
                  <SelectItem value={ALL}>All months</SelectItem>
                  {monthOptions.map((k) => (
                    <SelectItem key={k} value={k}>{monthLabel(k)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              onClick={() => navigate("/scan-receipt")}
              aria-label="Scan past receipt"
              className="flex h-9 w-9 items-center justify-center rounded-control border border-hairline bg-surface text-foreground hover:border-foreground/40 transition-colors"
            >
              <ScanLine className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        }
      />


      {!ready ? (
        <MarketLoader minHeight="55vh" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "no saved trips yet" : "no trips this month"}
          description={rows.length === 0 ? "Your completed trips will live here." : undefined}
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([k, items]) => (
            <section key={k}>
              <div className="sticky top-0 z-10 bg-background py-2">
                <p className="font-mono text-[11px] lowercase tracking-[0.14em] text-muted-foreground">{monthLabel(k).toLowerCase()}</p>
              </div>
              <ul className="mt-1 divide-y divide-dashed divide-foreground/10">
                {items.map((t) => (
                  <li key={t.id}>
                    <TripTapeRow
                      title={t.title}
                      date={t.started_at}
                      itemCount={t.itemCount}
                      totalCents={t.total_cents}
                      onClick={() => navigate(`/trip/${t.id}`)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
