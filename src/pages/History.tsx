import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useCurrency } from "@/lib/format";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { Money } from "@/components/Money";

type Row = {
  id: string;
  started_at: string;
  total_cents: number;
  stores: string[];
  itemCount: number;
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
  const [month, setMonth] = useState<string>(ALL);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      await supabase.from("trips").delete().lt("started_at", cutoff.toISOString());
      const { data } = await supabase
        .from("trips")
        .select("id, started_at, total_cents, trip_items(store_name_snapshot)")
        .eq("status", "saved")
        .gte("started_at", cutoff.toISOString())
        .order("started_at", { ascending: false });
      setRows(
        (data ?? []).map((t: any) => ({
          id: t.id,
          started_at: t.started_at,
          total_cents: t.total_cents,
          itemCount: (t.trip_items ?? []).length,
          stores: Array.from(
            new Set((t.trip_items ?? []).map((i: any) => i.store_name_snapshot).filter(Boolean)),
          ) as string[],
        })),
      );
    })();
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
        eyebrow="Past runs"
        title="History"
        action={
          monthOptions.length > 0 ? (
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-10 w-[150px] rounded-md bg-surface border-hairline text-small">
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All months</SelectItem>
                {monthOptions.map((k) => (
                  <SelectItem key={k} value={k}>{monthLabel(k)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-small text-muted-foreground">
            {rows.length === 0 ? "No saved trips yet." : "No trips for this month."}
          </p>
        </Card>
      ) : (
        <div className="space-y-7">
          {grouped.map(([k, items]) => (
            <section key={k}>
              <div className="sticky top-0 z-10 -mx-5 px-5 py-2 glass">
                <p className="text-eyebrow">{monthLabel(k)}</p>
              </div>
              <ul className="mt-3 space-y-3">
                {items.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => navigate(`/trip/${t.id}`)} className="w-full text-left">
                      <Card className="flex items-center justify-between p-4 transition hover:border-primary">
                        <div>
                          <p className="text-h3">{format(new Date(t.started_at), "EEE, MMM d")}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-small text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {t.stores.join(" · ") || "No store"} · {t.itemCount} items
                          </p>
                        </div>
                        <Money cents={t.total_cents} size="lg" />
                      </Card>
                    </button>
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
