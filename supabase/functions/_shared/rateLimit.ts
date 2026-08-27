// Per-user rate limiting for the AI functions.
//
// Backed by public.consume_rate_limit (see migration 20260826200000). The counter
// lives in Postgres rather than in memory because edge functions are ephemeral and
// run many instances at once — a per-instance counter would reset constantly and
// enforce nothing.

import { AIError } from "./ai.ts";

/**
 * Buckets must match the CASE arms in consume_rate_limit; an unknown bucket is
 * rejected there rather than allowed through.
 *
 * The limits themselves deliberately live in SQL, not here. The function is
 * callable by any signed-in client over RPC, so a caller-supplied window would be
 * a complete bypass — passing 0 makes every window read as expired and resets the
 * counter forever. Changing a limit is a migration, which is the right amount of
 * friction for a spending control.
 */
export type RateBucket = "match" | "receipt" | "insights";

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
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket: bucket,
  });

  if (error) {
    // Fail closed. This guard is the only thing standing between an authenticated
    // caller and an unbounded bill, so a broken check must not silently disable it.
    console.error(`${label}: rate limit check failed`, error.message);
    throw new AIError(503, "Service temporarily unavailable. Try again shortly.");
  }

  if (data !== true) {
    console.warn(`${label}: rate limit hit for bucket "${bucket}"`);
    throw new AIError(429, "You've hit the limit for now. Try again later.");
  }
}
