import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ActiveTrip = {
  id: string;
  listId: string | null;
  listName: string | null;
  listHidden: boolean;
  itemCount: number;
  totalCents: number;
};

/**
 * Returns the user's current active trip (status = active), if any.
 * Includes enough context for copy and guards.
 */
export function useActiveTrip() {
  const { user } = useAuth();
  const [active, setActive] = useState<ActiveTrip | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActive = useCallback(async () => {
    if (!user) {
      setActive(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("trips")
        .select(
          "id, list_id, shopping_lists:list_id(name, hidden), trip_planned_items(id), trip_items(price_cents, qty)"
        )
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        setActive(null);
        return;
      }
      const list = (data as any).shopping_lists as {
        name: string | null;
        hidden: boolean | null;
      } | null;
      const planned = ((data as any).trip_planned_items ?? []) as { id: string }[];
      const tripItems = ((data as any).trip_items ?? []) as { price_cents: number | null; qty: number | null }[];
      const totalCents = tripItems.reduce(
        (a, i) => a + (i.price_cents ?? 0) * (i.qty ?? 1),
        0
      );
      setActive({
        id: data.id,
        listId: (data as any).list_id ?? null,
        listName: list?.name ?? null,
        listHidden: !!list?.hidden,
        itemCount: planned.length,
        totalCents,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  return { active, loading, refetch: fetchActive };
}

/**
 * App-level guard: if the user has an active live trip, any normal tab route
 * automatically redirects to /trip. This keeps a user who backgrounds the app
 * or refreshes the page from accidentally landing on Home/Lists/etc while a
 * run is in progress.
 *
 * Excludes /trip, /trip/new, /trip/:id (historical receipt), /scan-receipt,
 * and onboarding/auth routes.
 */
export function useActiveTripRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { active, loading } = useActiveTrip();

  useEffect(() => {
    if (loading) return;
    if (!active) return;
    if (pathname === "/trip") return;
    if (pathname === "/trip/new") return;
    if (pathname.startsWith("/trip/")) return;
    if (pathname.startsWith("/scan-receipt")) return;
    if (pathname.startsWith("/onboarding")) return;
    navigate("/trip", { replace: true });
  }, [active, loading, pathname, navigate]);
}
