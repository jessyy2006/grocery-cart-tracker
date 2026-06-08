import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const { data: trips } = await supabase
      .from("trips")
      .select("id, started_at, total_cents, list_id")
      .eq("status", "saved")
      .gte("started_at", prevStart.toISOString());

    if (!trips || !trips.length) return json({ insights: [] });

    const tripIds = trips.map((t) => t.id);
    const { data: items } = await supabase
      .from("trip_items")
      .select("trip_id, name_snapshot, price_cents, qty, store_name_snapshot")
      .in("trip_id", tripIds);

    // Aggregate: spend per month, store, top item names
    const bucket = (d: Date) => (d >= monthStart ? "current" : "previous");
    const monthSpend = { current: 0, previous: 0 };
    const storeSpend: Record<string, { current: number; previous: number }> = {};
    const itemSpend: Record<string, { current: number; previous: number }> = {};

    for (const t of trips) {
      const key = bucket(new Date(t.started_at));
      monthSpend[key] += t.total_cents ?? 0;
    }
    for (const it of items ?? []) {
      const trip = trips.find((t) => t.id === it.trip_id);
      if (!trip) continue;
      const key = bucket(new Date(trip.started_at));
      const cents = (it.price_cents ?? 0) * (it.qty ?? 1);
      const store = it.store_name_snapshot || "Unknown";
      if (!storeSpend[store]) storeSpend[store] = { current: 0, previous: 0 };
      storeSpend[store][key] += cents;
      const name = (it.name_snapshot || "").toLowerCase();
      if (!itemSpend[name]) itemSpend[name] = { current: 0, previous: 0 };
      itemSpend[name][key] += cents;
    }

    const summary = {
      monthSpend,
      stores: Object.entries(storeSpend)
        .sort((a, b) => b[1].current - a[1].current)
        .slice(0, 5)
        .map(([name, v]) => ({ name, ...v })),
      topItems: Object.entries(itemSpend)
        .sort((a, b) => b[1].current - a[1].current)
        .slice(0, 8)
        .map(([name, v]) => ({ name, ...v })),
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a personal finance coach focused on grocery spending. Generate 1-2 short, specific, data-driven insights from the user's last two months of grocery data. Each insight: a punchy title (<=8 words) and a single-sentence body (<=24 words) referencing concrete numbers from the data. No generic advice. If data is insufficient, return an empty array.",
          },
          { role: "user", content: JSON.stringify(summary) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_insights",
              description: "Return up to 2 insights",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    maxItems: 2,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        body: { type: "string" },
                      },
                      required: ["title", "body"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_insights" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limited" }, 429);
    if (aiResp.status === 402) return json({ error: "Out of credits" }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ insights: [] });
    }

    const aiData = await aiResp.json();
    const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return json({ insights: [] });
    let parsed: { insights?: { title: string; body: string }[] } = {};
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return json({ insights: [] });
    }
    return json({ insights: parsed.insights ?? [] });
  } catch (e) {
    console.error("finance-insights error", e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
