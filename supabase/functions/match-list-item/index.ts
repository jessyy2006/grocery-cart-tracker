import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { AIError, chatCompletion, GEMINI_MODELS } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ matchId: null, error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ matchId: null, error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const scannedName = typeof body?.scannedName === "string" ? body.scannedName.slice(0, 200) : "";
    const rawItems = Array.isArray(body?.listItems) ? body.listItems.slice(0, 50) : [];
    const listItems = rawItems
      .filter((i: any) => i && typeof i.id === "string" && typeof i.name === "string")
      .map((i: any) => ({ id: i.id.slice(0, 100), name: i.name.slice(0, 100) }));

    if (!scannedName || listItems.length === 0) {
      return json({ matchId: null });
    }

    const ids = listItems.map((i) => i.id);

    const data = await chatCompletion(
      {
        model: GEMINI_MODELS.FLASH_PREVIEW,
        messages: [
          {
            role: "system",
            content:
              "You decide whether a scanned grocery product matches any item on a shopping list. A match means at least one meaningful word in the scanned product name corresponds to a word/concept in a list item (e.g. '2% Whole Milk' matches 'milk'; 'Boneless chicken thighs' matches 'chicken'). Pick the single best match or null if none.",
          },
          {
            role: "user",
            content: `Scanned: ${scannedName}\nList:\n${listItems
              .map((i) => `- ${i.id}: ${i.name}`)
              .join("\n")}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "pick_match",
              description: "Return the matching list item id, or null.",
              parameters: {
                type: "object",
                properties: {
                  match_id: { type: ["string", "null"], enum: [...ids, null] },
                },
                required: ["match_id"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "pick_match" } },
      },
      { label: "match-list-item" },
    );

    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let matchId: string | null = null;
    if (args) {
      try {
        const parsed = JSON.parse(args);
        if (parsed.match_id && ids.includes(parsed.match_id)) matchId = parsed.match_id;
      } catch (_) {}
    }

    return json({ matchId });
  } catch (e) {
    // A missing match must never break the scan flow, so an AI failure degrades
    // to "no match" rather than an error — except rate limiting, which the
    // client backs off on.
    if (e instanceof AIError) {
      if (e.status === 429) return json({ matchId: null, error: "Rate limited" }, 429);
      return json({ matchId: null });
    }
    console.error("match-list-item error", e);
    return json({ matchId: null, error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
