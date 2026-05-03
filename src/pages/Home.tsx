import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBasket, Plus, MapPin, ListChecks } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { format } from "date-fns";

type Trip = { id: string; started_at: string; total_cents: number; status: string };

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [recent, setRecent] = useState<(Trip & { stores: string[] })[]>([]);
  const [lifetime, setLifetime] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: active } = await supabase
        .from("trips")
        .select("id, started_at, total_cents, status")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1);
      setActiveTrip(active?.[0] ?? null);

      const { data: saved } = await supabase
        .from("trips")
        .select("id, started_at, total_cents, status, trip_items(store_name_snapshot)")
        .eq("status", "saved")
        .order("started_at", { ascending: false })
        .limit(5);

      setRecent(
        (saved ?? []).map((t: any) => ({
          ...t,
          stores: Array.from(
            new Set((t.trip_items ?? []).map((i: any) => i.store_name_snapshot).filter(Boolean))
          ) as string[],
        }))
      );

      const { data: all } = await supabase.from("trips").select("total_cents").eq("status", "saved");
      setLifetime((all ?? []).reduce((a, t: any) => a + (t.total_cents ?? 0), 0));
    })();
  }, [user]);

  const startTrip = () => navigate("/trip/new");

  return (
    <div className="space-y-6 px-5 pb-3 pt-4">
      <header>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-3xl font-bold tracking-tight">Ready to shop?</h1>
      </header>

      <Card className="overflow-hidden p-0 shadow-elevated">
        <div className="gradient-hero p-6 text-primary-foreground">
          <p className="text-xs uppercase tracking-wider opacity-80">Lifetime spend</p>
          <p className="mt-1 text-3xl font-bold">{formatMoney(lifetime)}</p>
        </div>
        <div className="space-y-3 p-5">
          {activeTrip ? (
            <Button className="w-full" size="lg" onClick={() => navigate("/trip")}>
              <ShoppingBasket className="mr-2 h-5 w-5" /> Resume current trip · {formatMoney(activeTrip.total_cents)}
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={startTrip}>
              <Plus className="mr-2 h-5 w-5" /> Start new trip
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => navigate("/lists")}>
            <ListChecks className="mr-2 h-5 w-5" /> My shopping lists
          </Button>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent trips</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved trips yet — your history will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => navigate(`/trip/${t.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left shadow-soft transition hover:bg-secondary"
                >
                  <div>
                    <p className="font-medium">{format(new Date(t.started_at), "EEE, MMM d")}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {t.stores.join(" · ") || "No store"}
                    </p>
                  </div>
                  <span className="font-semibold">{formatMoney(t.total_cents)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
