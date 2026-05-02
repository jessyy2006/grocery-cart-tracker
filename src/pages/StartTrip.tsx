import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2, ArrowLeft } from "lucide-react";
import { findNearbyStores, getCurrentPosition, NearbyStore } from "@/lib/device/geolocation";
import { toast } from "sonner";

export default function StartTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nearby, setNearby] = useState<NearbyStore[]>([]);
  const [savedStores, setSavedStores] = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [custom, setCustom] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("stores").select("id, name, address").order("name");
      setSavedStores(data ?? []);
      try {
        const coords = await getCurrentPosition();
        const result = await findNearbyStores(coords);
        setNearby(result.slice(0, 8));
      } catch {
        // silent — user can type a name
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const startWith = async (store: { name: string; address?: string | null; lat?: number; lng?: number; id?: string }) => {
    if (!user) return;
    setCreating(true);
    try {
      let storeId = store.id;
      if (!storeId) {
        const { data: existing } = await supabase
          .from("stores")
          .select("id")
          .eq("user_id", user.id)
          .ilike("name", store.name)
          .limit(1);
        if (existing?.[0]) {
          storeId = existing[0].id;
        } else {
          const { data: created, error } = await supabase
            .from("stores")
            .insert({
              user_id: user.id,
              name: store.name,
              address: store.address ?? null,
              lat: store.lat ?? null,
              lng: store.lng ?? null,
            })
            .select("id")
            .single();
          if (error) throw error;
          storeId = created!.id;
        }
      }
      const { data: trip, error: tErr } = await supabase
        .from("trips")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (tErr) throw tErr;
      sessionStorage.setItem(`trip:${trip!.id}:store`, storeId!);
      navigate("/trip", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start trip");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 px-5 pb-6 pt-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <header>
        <h1 className="text-2xl font-bold">Where are you shopping?</h1>
        <p className="text-sm text-muted-foreground">Pick a store to start your trip. You can switch or add more later.</p>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding stores near you…
        </div>
      )}

      {nearby.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Near you</h2>
          <ul className="space-y-2">
            {nearby.map((s, i) => (
              <li key={i}>
                <Card
                  onClick={() => !creating && startWith(s)}
                  className="flex cursor-pointer items-start gap-3 p-4 transition hover:border-primary"
                >
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {savedStores.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your stores</h2>
          <ul className="space-y-2">
            {savedStores.map((s) => (
              <li key={s.id}>
                <Card
                  onClick={() => !creating && startWith(s)}
                  className="flex cursor-pointer items-start gap-3 p-4 transition hover:border-primary"
                >
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Or type a name</h2>
        <div className="flex gap-2">
          <Input placeholder="e.g. Trader Joe's" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <Button disabled={!custom.trim() || creating} onClick={() => startWith({ name: custom.trim() })}>
            Start
          </Button>
        </div>
      </section>
    </div>
  );
}
