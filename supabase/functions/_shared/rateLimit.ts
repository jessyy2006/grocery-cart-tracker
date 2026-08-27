// Per-user rate limiting for the AI functions.
//
// Backed by public.consume_rate_limit (see migration 20260826200000). The counter
// lives in Postgres rather than in memory because edge functions are ephemeral and
// run many instances at once — a per-instance counter would reset constantly and
// enforce nothing.

import { AIError } from "./ai.ts";

/**
 * Limits per bucket, as [calls, window seconds].
 *
 * Sized against how the app actually calls each one, not a uniform number:
 *
 * - MATCH is called once per scanned barcode during a live trip, so a large shop
 *   legitimately makes a lot of calls. It is also the cheapest of the three.
 * - RECEIPT sends a full image and is by far the most expensive per call. A user
 *   scans a receipt or two per shop; 30/hour is well clear of real use.
 * - INSIGHTS fires on the Finance screen, so the ceiling mostly catches a render
 *   loop rather than deliberate abuse.
 *
 * Each can be raised without a migration via the matching env var, so a tester
 * hitting a wall is a config change and not a deploy.
 */
const LIMITS = {
  match: envLimit("RATE_LIMIT_MATCH", 300, 3600),
  receipt: envLimit("RATE_LIMIT_RECEIPT", 30, 3600),
  insights: envLimit("RATE_LIMIT_INSIGHTS", 60, 3600),
} as const;

export type RateBucket = keyof typeof LIMITS;

function envLimit(name: string, fallback: number, windowSeconds: number) {
  const raw = Deno.env.get(name);
  const parsed = raw ? Number(raw) : NaN;
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  return { limit, windowSeconds };
}

type MinimalClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Records one call for the current user and throws AIError(429) if the limit is
 * spent. Must be called with the *user-scoped* client — the SQL function reads
 * auth.uid(), so a service-role client would have no identity and be rejected.
 *
 * Call this before doing any billable work.
 */
export async function enforceRateLimit(
  supabase: MinimalClient,
  bucket: RateBucket,
  label: string,
): Promise<void> {
  const { limit, windowSeconds } = LIMITS[bucket];

  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail closed. This guard is the only thing standing between an authenticated
    // caller and an unbounded bill, so a broken check must not silently disable it.
    console.error(`${label}: rate limit check failed`, error.message);
    throw new AIError(503, "Service temporarily unavailable. Try again shortly.");
  }

  if (data !== true) {
    console.warn(`${label}: rate limit hit (${limit}/${windowSeconds}s)`);
    throw new AIError(429, "You've hit the limit for now. Try again later.");
  }
}
