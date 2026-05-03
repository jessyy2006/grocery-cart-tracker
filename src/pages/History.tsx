import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { format } from "date-fns";

type Row = { id: string; started_at: string; total_cents: number; stores: string[]; itemCount: number };

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("trips")
        .select("id, started_at, total_cents, trip_items(store_name_snapshot)")
        .eq("status", "saved")
        .order("started_at", { ascending: false });
      setRows(
        (data ?? []).map((t: any) => ({
          id: t.id,
          started_at: t.started_at,
          total_cents: t.total_cents,
          itemCount: (t.trip_items ?? []).length,
          stores: Array.from(
            new Set((t.trip_items ?? []).map((i: any) => i.store_name_snapshot).filter(Boolean))
          ) as string[],
        }))
      );
    })();
  }, [user]);

  return (
    <div className="space-y-4 px-5 pb-3 pt-4">
      <h1 className="text-3xl font-bold tracking-tight">History</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved trips yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => navigate(`/trip/${t.id}`)}
                className="w-full text-left"
              >
                <Card className="flex items-center justify-between p-4 shadow-soft transition hover:border-primary">
                  <div>
                    <p className="font-semibold">{format(new Date(t.started_at), "EEE, MMM d, yyyy")}</p>
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
