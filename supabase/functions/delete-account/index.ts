// Permanently deletes the calling user's account and data.
// Required by App Store Review Guideline 5.1.1(v).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify the caller from their JWT.
    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Delete owned rows first. Child rows cascade from their parents.
    const ownedTables = [
      "trip_items",
      "trips",
      "shopping_list_items",
      "shopping_lists",
      "stores",
      "user_onboarding",
      "profiles",
    ];
    for (const table of ownedTables) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      // Tables without a user_id column (child rows cascading) are skipped silently.
      if (error && !/column .*user_id.* does not exist/i.test(error.message)) {
        console.error(`delete-account: failed clearing ${table}`, error.message);
      }
    }

    // If the auth user is already gone, treat deletion as satisfied.
    const { data: existing, error: lookupErr } = await admin.auth.admin.getUserById(userId);
    if (lookupErr) {
      console.error("delete-account: lookup failed", lookupErr.message);
      return json({ error: lookupErr.message }, 500);
    }
    if (!existing.user) {
      return json({ ok: true, deleted: false, reason: "user_already_removed" });
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true, deleted: true });
  } catch (e) {
    console.error("delete-account error", e);
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
