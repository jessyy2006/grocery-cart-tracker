import { supabase } from "@/integrations/supabase/client";

/**
 * Copy every item in a shopping list into trip_planned_items for a trip.
 * This is the per-trip mutable snapshot — the source list stays untouched.
 */
export async function snapshotListIntoTrip(tripId: string, listId: string | null) {
  if (!listId) return;
  const { data: rows, error } = await supabase
    .from("shopping_list_items")
    .select("id, name, qty, category, notes, tag, barcode")
    .eq("list_id", listId);
  if (error || !rows || rows.length === 0) return;
  const payload = rows.map((r) => ({
    trip_id: tripId,
    source_list_item_id: r.id,
    name: r.name,
    qty: r.qty,
    category: r.category,
    notes: r.notes,
    tag: r.tag,
    barcode: r.barcode,
  }));
  await supabase.from("trip_planned_items").insert(payload);
}
