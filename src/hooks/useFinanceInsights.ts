import { useEffect, useRef, useState } from "react";
import { invokeWithTimeout } from "@/lib/invoke";
import { useAuth } from "@/hooks/useAuth";

export type Insight = { title: string; body: string };

/** One fetch per session. The underlying data only moves when a trip is saved. */
let cache: { userId: string; insights: Insight[] } | null = null;

/** Lets Finance drop the cache after a save so the next visit re-reads. */
export const clearFinanceInsightsCache = () => {
  cache = null;
};

/**
 * AI insights for the Finance screen.
 *
 * Supplementary by design: any failure returns an empty list and the caller falls
 * back to the locally computed insight, so Finance never depends on the network or
 * on the AI budget to render. `enabled` keeps the call from firing before there is
 * enough data to say anything about.
 */
export function useFinanceInsights(enabled: boolean) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>(
    () => (cache && cache.userId === user?.id ? cache.insights : []),
  );
  const [loading, setLoading] = useState(false);
  // Survives StrictMode's double-mount, which would otherwise double the spend.
  const requested = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;
    if (cache && cache.userId === user.id) {
      setInsights(cache.insights);
      return;
    }
    if (requested.current === user.id) return;
    requested.current = user.id;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await invokeWithTimeout<{ insights?: Insight[] }>(
          "finance-insights",
          {},
          20_000,
        );
        const next = Array.isArray(data?.insights) ? data.insights : [];
        cache = { userId: user.id, insights: next };
        if (!cancelled) setInsights(next);
      } catch {
        // Rate limits, AI outages and offline all land here. The local insight
        // covers the screen, so this stays silent rather than showing an error
        // for something the user did not ask for.
        cache = { userId: user.id, insights: [] };
        if (!cancelled) setInsights([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, user]);

  return { insights, loading };
}
