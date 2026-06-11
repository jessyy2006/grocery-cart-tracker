import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin } from "lucide-react";
import { formatMoney, useCurrency } from "@/lib/format";
import { format } from "date-fns";
import { MarketLoader } from "@/components/MarketLoader";

type Item = { id: string; name_snapshot: string; price_cents: number; qty: number; store_name_snapshot: string | null };

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  useCurrency();
  const [trip, setTrip] = useState<{ started_at: string; total_cents: number; title: string } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [{ data: t }, { data: i }] = await Promise.all([
        supabase
          .from("trips")
          .select("started_at, total_cents, shopping_lists:list_id(name, hidden)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("trip_items")
          .select("id, name_snapshot, price_cents, qty, store_name_snapshot")
          .eq("trip_id", id)
          .order("scanned_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (t) {
        const list: any = (t as any).shopping_lists;
        const title =
          list && !list.hidden && list.name
            ? list.name
            : format(new Date(t.started_at), "EEEE · MMM d, yyyy");
        setTrip({ started_at: t.started_at, total_cents: t.total_cents, title });
      } else {
        setTrip(null);
      }
      setItems(i ?? []);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; items: Item[]; subtotal: number }>();
    for (const i of items) {
      const name = i.store_name_snapshot ?? "Unspecified";
      if (!m.has(name)) m.set(name, { name, items: [], subtotal: 0 });
      const g = m.get(name)!;
      g.items.push(i);
      g.subtotal += i.price_cents * i.qty;
    }
    return Array.from(m.values());
  }, [items]);

  return (
    <div className="space-y-6 px-5 pb-6 pt-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-small text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      {!ready ? (
        <MarketLoader minHeight="55vh" />
      ) : (
        <>
          {trip && (
            <header>
              <p className="text-eyebrow">{format(new Date(trip.started_at), "EEEE · MMM d, yyyy")}</p>
              <h1 className="mt-1 text-h1">{trip.title}</h1>
              <p className="mt-2 text-money text-[2.25rem] font-medium leading-none">{formatMoney(trip.total_cents)}</p>
            </header>
          )}

          {grouped.map((g) => (
            <section key={g.name}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-primary" /> {g.name}
                </h2>
                <span className="text-sm font-medium">{formatMoney(g.subtotal)}</span>
              </div>
              <ul className="space-y-2">
                {g.items.map((it) => (
                  <li key={it.id}>
                    <Card className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium">{it.name_snapshot}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.qty} × {formatMoney(it.price_cents)}
                        </p>
                      </div>
                      <span className="font-semibold">{formatMoney(it.price_cents * it.qty)}</span>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
