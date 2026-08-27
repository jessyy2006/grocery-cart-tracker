import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { AIError, chatCompletion, GEMINI_MODELS } from "../_shared/ai.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

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

    await enforceRateLimit(supabase, "insights", "finance-insights");

    const aiData = await chatCompletion(
      {
        model: GEMINI_MODELS.FLASH,
        messages: [
          {
            role: "system",
            content: [
              "You report facts about grocery spending. Nothing else.",
              "",
              "Return 1-2 observations from the data. Each has a title (max 5 words) and a body (one sentence, max 18 words).",
              "",
              "Rules:",
              "- State what the numbers show. Do not advise, suggest, encourage, warn, or reassure.",
              "- Every observation cites at least one concrete number from the data.",
              "- No opener phrases. Never begin with \"It looks like\", \"You might\", \"Consider\", \"Remember\", or \"Great job\".",
              "- No praise, no judgement, no exclamation marks.",
              "- Compare against last month or the budget where the data allows it. Comparisons are more useful than totals.",
              "- Prefer the two most surprising facts. Skip anything the user could read off the screen unaided.",
              "- Return fewer rather than padding. One sharp observation beats two weak ones, and an empty array is correct when the data supports nothing specific.",
              "",
              "Good: {\"title\":\"Produce up 34%\",\"body\":\"Produce spend rose $47 to $185 while total spend fell $12.\"}",
              "Bad: {\"title\":\"Great progress this month\",\"body\":\"It looks like you might want to consider watching your produce spending!\"}",
            ].join("\n"),
          },
          { role: "user", content: JSON.stringify(summary) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_insights",
              description:
                "Return 0-2 factual observations. Fewer is better than padded.",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    maxItems: 2,
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          maxLength: 32,
                          description: "Max 5 words. No punctuation at the end.",
                        },
                        body: {
                          type: "string",
                          maxLength: 110,
                          description:
                            "One sentence, max 18 words, citing a concrete number.",
                        },
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
      },
      { label: "finance-insights" },
    );

    const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return json({ insights: [] });
    let parsed: { insights?: { title: string; body: string }[] } = {};
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return json({ insights: [] });
    }

    // maxLength in the schema is a hint, not a guarantee. Clamp here so a verbose
    // reply cannot overflow the insight footnote, and drop anything that arrives
    // without both fields rather than rendering a half-empty card.
    const insights = (Array.isArray(parsed.insights) ? parsed.insights : [])
      .filter(
        (i) =>
          i &&
          typeof i.title === "string" &&
          typeof i.body === "string" &&
          i.title.trim() &&
          i.body.trim(),
      )
      .slice(0, 2)
      .map((i) => ({
        title: i.title.trim().replace(/[.!]+$/, "").slice(0, 32),
        body: i.body.trim().slice(0, 110),
      }));

    return json({ insights });
  } catch (e) {
    // Insights are supplementary to the Finance screen, so an AI failure returns
    // an empty list rather than an error — except rate limiting, which the
    // client backs off on.
    if (e instanceof AIError) {
      if (e.status === 429) return json({ error: "Rate limited" }, 429);
      return json({ insights: [] });
    }
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
