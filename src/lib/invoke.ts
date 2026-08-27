// Edge-function invoke with a hard timeout.
// On cellular a hung upload otherwise leaves the UI spinning forever.
import { supabase } from "@/integrations/supabase/client";

export class InvokeTimeoutError extends Error {
  constructor(fn: string) {
    super(`"${fn}" took too long. Check your connection and try again.`);
    this.name = "InvokeTimeoutError";
  }
}

/** A non-2xx from an edge function, carrying the message the function actually sent. */
export class InvokeHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "InvokeHttpError";
  }
  /** True when the caller should back off rather than retry immediately. */
  get isRateLimited() {
    return this.status === 429;
  }
}

/**
 * supabase-js reports every non-2xx as "Edge Function returned a non-2xx status
 * code" and leaves the response body on `error.context`. That message is useless
 * to a user, so unwrap the body and surface what the function actually said —
 * without it, a rate-limit reply reads as a generic failure.
 */
async function unwrap(error: unknown, fn: string): Promise<Error> {
  const ctx = (error as { context?: unknown })?.context;
  if (!(ctx instanceof Response)) return error as Error;

  const status = ctx.status;
  try {
    // clone() so a caller inspecting the original response still can.
    const body = await ctx.clone().json();
    const message = typeof body?.error === "string" ? body.error : null;
    if (message) return new InvokeHttpError(message, status);
  } catch {
    /* not JSON, or already consumed — fall through to the generic message */
  }
  return new InvokeHttpError(`"${fn}" failed (${status}).`, status);
}

export async function invokeWithTimeout<T = unknown>(
  fn: string,
  body: unknown,
  timeoutMs = 60_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data, error } = await supabase.functions.invoke(fn, {
      body,
      // supabase-js forwards this to fetch
      ...({ signal: controller.signal } as Record<string, unknown>),
    });
    if (error) throw await unwrap(error, fn);
    return data as T;
  } catch (e) {
    if (controller.signal.aborted) throw new InvokeTimeoutError(fn);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
