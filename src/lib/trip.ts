import { supabase } from "@/integrations/supabase/client";

/**
 * Single entry point for starting a shopping trip. Resumes an in-progress trip
 * if one exists (non-destructive); otherwise creates a fresh one. When no list
 * is chosen, spins up a hidden backing list so items flow through the normal
 * planned/category UX instead of being flagged as extras.
 *
 * Returns the trip id to navigate to.
 */
export async function beginTrip(userId: string, listId: string | null): Promise<string> {
  // Resume an in-progress trip rather than clobbering it.
  const { data: active } = await supabase
    .from("trips")
    .select("id, list_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1);
  if (active?.[0]) {
    if (listId && active[0].list_id !== listId) {
      await supabase.from("trips").update({ list_id: listId }).eq("id", active[0].id);
    }
    return active[0].id;
  }

  let resolvedListId = listId;
  if (!resolvedListId) {
    const stamp = new Date().toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const { data: hidden, error: hiddenErr } = await supabase
      .from("shopping_lists")
      .insert({ user_id: userId, name: `Free trip · ${stamp}`, hidden: true })
      .select("id")
      .single();
    if (hiddenErr) throw hiddenErr;
    resolvedListId = hidden.id;
  } else {
    // Fresh trip on an existing list — clear stale checked state from prior runs.
    await supabase
      .from("shopping_list_items")
      .update({ checked_at: null, price_cents: null })
      .eq("list_id", resolvedListId);
  }

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({ user_id: userId, list_id: resolvedListId, status: "active" })
    .select("id")
    .single();
  if (error) throw error;
  return trip.id;
}
