import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShoppingBasket, Plus, MapPin, ListChecks, ShoppingCart } from "lucide-react";
import { formatMoney, useCurrency } from "@/lib/format";
import { format } from "date-fns";
import { toast } from "sonner";

type Trip = { id: string; started_at: string; total_cents: number; status: string };
type ShortList = { id: string; name: string };

export default function Home() {
  const { user } = useAuth();
  useCurrency();
  const navigate = useNavigate();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [recent, setRecent] = useState<(Trip & { stores: string[] })[]>([]);
  const [lifetime, setLifetime] = useState(0);
  const [startOpen, setStartOpen] = useState(false);
  const [lists, setLists] = useState<ShortList[]>([]);
  const [creating, setCreating] = useState(false);

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

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data: all } = await supabase
        .from("trips")
        .select("total_cents")
        .eq("status", "saved")
        .gte("started_at", monthStart.toISOString());
      setLifetime((all ?? []).reduce((a, t: any) => a + (t.total_cents ?? 0), 0));
    })();
  }, [user]);

  const openStart = async () => {
    const { data } = await supabase
      .from("shopping_lists")
      .select("id, name")
      .order("updated_at", { ascending: false });
    setLists(data ?? []);
    setStartOpen(true);
  };

  const startTripWith = async (listId: string | null) => {
    if (!user) return;
    setCreating(true);
    try {
      // End any lingering active trips so we always start fresh
      await supabase
        .from("trips")
        .delete()
        .eq("user_id", user.id)
        .eq("status", "active");

      // Reset the chosen list so nothing is pre-checked
      if (listId) {
        await supabase
          .from("shopping_list_items")
          .update({ checked_at: null, price_cents: null })
          .eq("list_id", listId);
      }

      sessionStorage.setItem("pendingTrip:listId", listId ?? "none");
      setStartOpen(false);
      navigate("/trip/new");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start trip");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 px-5 pb-6 pt-6">
      <header>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-3xl font-bold tracking-tight">Ready to shop?</h1>
      </header>

      <Card className="overflow-hidden p-0 shadow-elevated">
        <div className="gradient-hero p-6 text-primary-foreground">
          <p className="text-xs uppercase tracking-wider opacity-80">This month's spend</p>
          <p className="mt-1 text-3xl font-bold">{formatMoney(lifetime)}</p>
        </div>
        <div className="space-y-3 p-5">
          <Button className="w-full" size="lg" onClick={openStart}>
            <Plus className="mr-2 h-5 w-5" /> Start new trip
          </Button>
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

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new trip</DialogTitle>
            <DialogDescription>
              Pick a shopping list to shop for, or shop freely without a list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {lists.length > 0 && (
              <ul className="space-y-2">
                {lists.map((l) => (
                  <li key={l.id}>
                    <button
                      disabled={creating}
                      onClick={() => startTripWith(l.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary disabled:opacity-50"
                    >
                      <ListChecks className="h-5 w-5 text-primary" />
                      <span className="font-medium">{l.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="outline"
              className="w-full"
              disabled={creating}
              onClick={() => startTripWith(null)}
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Shop freely (no list)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
