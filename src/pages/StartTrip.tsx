import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2, ArrowLeft, AlertCircle, Search } from "lucide-react";
import {
  findNearbyStores,
  getCachedCoords,
  getCurrentPosition,
  GeoPermissionError,
  GeoTimeoutError,
  NearbyStore,
  searchStoresByName,
  StoreSearchError,
} from "@/lib/device/geolocation";
import { toast } from "sonner";

type NearbyState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; stores: NearbyStore[] }
  | { kind: "denied" }
  | { kind: "timeout" }
  | { kind: "error"; message: string };

export default function StartTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedStores, setSavedStores] = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [nearby, setNearby] = useState<NearbyState>({ kind: "idle" });
  const [custom, setCustom] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<NearbyStore[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<
    | { kind: "saved"; id: string; name: string; address: string | null }
    | { kind: "found"; key: string; name: string; address?: string | null; lat: number; lng: number }
    | { kind: "custom"; name: string }
    | null
  >(null);

  const isSelected = (key: string) => selected !== null && (
    (selected.kind === "saved" && `saved:${selected.id}` === key) ||
    (selected.kind === "found" && `found:${selected.key}` === key) ||
    (selected.kind === "custom" && `custom:${selected.name}` === key)
  );

  const loadNearby = useCallback(async () => {
    setNearby({ kind: "loading" });
    try {
      const coords = getCachedCoords() ?? (await getCurrentPosition());
      const result = await findNearbyStores(coords);
      setNearby({ kind: "ok", stores: result.slice(0, 8) });
    } catch (e) {
      if (e instanceof GeoPermissionError) setNearby({ kind: "denied" });
      else if (e instanceof GeoTimeoutError) setNearby({ kind: "timeout" });
      else if (e instanceof StoreSearchError)
        setNearby({ kind: "error", message: "Couldn't reach the store directory." });
      else {
        console.error("nearby stores failed", e);
        setNearby({ kind: "error", message: "Something went wrong finding stores." });
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("stores").select("id, name, address").order("name");
      setSavedStores(data ?? []);
    })();
    loadNearby();
  }, [user, loadNearby]);

  const runManualSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const results = await searchStoresByName(searchQ);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
      toast.error("Search failed. Try a different query.");
    } finally {
      setSearching(false);
    }
  };

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
      const pendingList = sessionStorage.getItem("pendingTrip:listId");
      const listId = pendingList && pendingList !== "none" ? pendingList : null;
      const { data: trip, error: tErr } = await supabase
        .from("trips")
        .insert({ user_id: user.id, list_id: listId })
        .select("id")
        .single();
      if (tErr) throw tErr;
      sessionStorage.removeItem("pendingTrip:listId");
      sessionStorage.removeItem("trip:cameFromOnboarding");
      sessionStorage.setItem(`trip:${trip!.id}:store`, storeId!);
      navigate("/trip", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start trip");
    } finally {
      setCreating(false);
    }
  };

  const StoreCard = ({
    s,
    selectedKey,
    onSelect,
    dim,
  }: {
    s: { name: string; address?: string | null };
    selectedKey: string;
    onSelect: () => void;
    dim?: boolean;
  }) => {
    const active = isSelected(selectedKey);
    return (
      <Card
        onClick={onSelect}
        className={`flex cursor-pointer items-start gap-3 p-4 transition ${
          active ? "border-primary bg-primary/5" : "hover:border-primary"
        }`}
      >
        <MapPin
          className={`mt-0.5 h-5 w-5 shrink-0 ${
            active ? "text-primary" : dim ? "text-muted-foreground" : "text-primary"
          }`}
        />
        <div>
          <p className="font-medium">{s.name}</p>
          {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
        </div>
      </Card>
    );
  };

  const handleStartTrip = async () => {
    if (!selected) return;
    if (selected.kind === "saved") {
      await startWith({ id: selected.id, name: selected.name, address: selected.address });
    } else if (selected.kind === "found") {
      await startWith({ name: selected.name, address: selected.address, lat: selected.lat, lng: selected.lng });
    } else {
      await startWith({ name: selected.name });
    }
  };

  return (
    <div className="space-y-6 px-5 pb-32 pt-6">
      <button
        onClick={() => {
          if (sessionStorage.getItem("trip:cameFromOnboarding") === "1") {
            sessionStorage.removeItem("trip:cameFromOnboarding");
            navigate("/", { replace: true });
            return;
          }
          navigate(-1);
        }}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <header>
        <h1 className="text-2xl font-bold">Where are you shopping?</h1>
        <p className="text-sm text-muted-foreground">Pick a store to start your trip. You can switch or add more later.</p>
      </header>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Near you</h2>
          {(nearby.kind === "error" || nearby.kind === "timeout" || nearby.kind === "denied") && (
            <Button variant="ghost" size="sm" onClick={loadNearby}>
              Retry
            </Button>
          )}
        </div>

        {nearby.kind === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Finding stores near you…
          </div>
        )}

        {nearby.kind === "denied" && (
          <Card className="flex items-start gap-3 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Location is blocked. Search by name below, or pick a saved store.
            </p>
          </Card>
        )}

        {nearby.kind === "timeout" && (
          <Card className="flex items-start gap-3 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">Location took too long. Tap retry, or search by name.</p>
          </Card>
        )}

        {nearby.kind === "error" && (
          <Card className="flex items-start gap-3 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">{nearby.message}</p>
          </Card>
        )}

        {nearby.kind === "ok" && nearby.stores.length === 0 && (
          <p className="text-sm text-muted-foreground">No stores within walking distance. Try search below.</p>
        )}

        {nearby.kind === "ok" && nearby.stores.length > 0 && (
          <ul className="space-y-2">
            {nearby.stores.map((s, i) => {
              const key = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}:${s.name}`;
              return (
                <li key={i}>
                  <StoreCard
                    s={s}
                    selectedKey={`found:${key}`}
                    onSelect={() =>
                      setSelected({ kind: "found", key, name: s.name, address: s.address, lat: s.lat, lng: s.lng })
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {savedStores.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your stores</h2>
          <ul className="space-y-2">
            {savedStores.map((s) => (
              <li key={s.id}>
                <StoreCard
                  s={s}
                  dim
                  selectedKey={`saved:${s.id}`}
                  onSelect={() => setSelected({ kind: "saved", id: s.id, name: s.name, address: s.address })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Search by name or address
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Whole Foods Brooklyn"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runManualSearch()}
          />
          <Button variant="secondary" disabled={!searchQ.trim() || searching} onClick={runManualSearch}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {searchResults && searchResults.length > 0 && (
          <ul className="mt-2 space-y-2">
            {searchResults.map((s, i) => {
              const key = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}:${s.name}`;
              return (
                <li key={i}>
                  <StoreCard
                    s={s}
                    dim
                    selectedKey={`found:${key}`}
                    onSelect={() =>
                      setSelected({ kind: "found", key, name: s.name, address: s.address, lat: s.lat, lng: s.lng })
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        {searchResults && searchResults.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No matches. Try a different query.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Or type a name</h2>
        <Input
          placeholder="e.g. Trader Joe's"
          value={custom}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v);
            if (v.trim()) setSelected({ kind: "custom", name: v.trim() });
            else if (selected?.kind === "custom") setSelected(null);
          }}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur">
        <Button
          className="w-full"
          size="lg"
          disabled={!selected || creating}
          onClick={handleStartTrip}
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : selected ? `Start trip at ${selected.name}` : "Select a store to start"}
        </Button>
      </div>
    </div>
  );
}
