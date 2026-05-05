import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { formatMoney, useCurrency } from "@/lib/format";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      // Auto-purge trips older than 1 year (RLS scopes this to the current user)
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      await supabase
        .from("trips")
        .delete()
        .lt("started_at", cutoff.toISOString());

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
            new Set(
              (t.trip_items ?? [])
                .map((i: any) => i.store_name_snapshot)
                .filter(Boolean),
            ),
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

  return (
    <div className="space-y-4 px-5 pb-6 pt-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        {monthOptions.length > 0 && (
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All months</SelectItem>
              {monthOptions.map((k) => (
                <SelectItem key={k} value={k}>
                  {monthLabel(k)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {rows.length === 0 ? "No saved trips yet." : "No trips for this month."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => navigate(`/trip/${t.id}`)}
                className="w-full text-left"
              >
                <Card className="flex items-center justify-between p-4 shadow-soft transition hover:border-primary">
                  <div>
                    <p className="font-semibold">
                      {format(new Date(t.started_at), "EEE, MMM d, yyyy")}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {t.stores.join(" · ") || "No store"} · {t.itemCount} items
                    </p>
                  </div>
                  <span className="text-lg font-bold">{formatMoney(t.total_cents)}</span>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
