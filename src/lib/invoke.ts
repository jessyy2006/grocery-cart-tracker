// Edge-function invoke with a hard timeout.
// On cellular a hung upload otherwise leaves the UI spinning forever.
import { supabase } from "@/integrations/supabase/client";

export class InvokeTimeoutError extends Error {
  constructor(fn: string) {
    super(`"${fn}" took too long. Check your connection and try again.`);
    this.name = "InvokeTimeoutError";
  }
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
    if (error) throw error;
    return data as T;
  } catch (e) {
    if (controller.signal.aborted) throw new InvokeTimeoutError(fn);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
