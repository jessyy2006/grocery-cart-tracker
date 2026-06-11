import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return json({ matchId: null, error: "Service unavailable" }, 500);
    }

    const ids = listItems.map((i) => i.id);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (!resp.ok) {
      const status = resp.status;
      const text = await resp.text();
      console.error("AI gateway error", status, text);
      if (status === 429 || status === 402) {
        return json({ matchId: null, error: status === 429 ? "Rate limited" : "Out of credits" }, status);
      }
      return json({ matchId: null });
    }

    const data = await resp.json();
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
