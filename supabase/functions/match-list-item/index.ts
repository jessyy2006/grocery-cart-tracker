const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scannedName, listItems } = await req.json();
    if (!scannedName || !Array.isArray(listItems) || listItems.length === 0) {
      return new Response(JSON.stringify({ matchId: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const ids = listItems.map((i: any) => i.id);

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
              .map((i: any) => `- ${i.id}: ${i.name}`)
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
      return new Response(JSON.stringify({ matchId: null, error: `gateway ${status}` }), {
        status: status === 429 || status === 402 ? status : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ matchId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-list-item error", e);
    return new Response(
      JSON.stringify({ matchId: null, error: e instanceof Error ? e.message : "unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
