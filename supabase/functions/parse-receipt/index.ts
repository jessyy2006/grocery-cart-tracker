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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const imageDataUrl: string | undefined = body?.image;
    if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      return json({ error: "Missing or invalid image" }, 400);
    }
    // Soft size cap (~8MB base64)
    if (imageDataUrl.length > 12_000_000) return json({ error: "Image too large" }, 413);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Service unavailable" }, 500);

    const systemPrompt = `You are an OCR parser for grocery store paper receipts. Extract structured JSON.

Return ONLY a JSON object with this shape (no prose):
{
  "store_name": string | null,
  "purchased_at": string | null,   // ISO date YYYY-MM-DD if visible
  "total_cents": number | null,    // grand total in cents
  "currency": string | null,       // ISO 4217 e.g. "USD", "CAD", "EUR"; null if unknown
  "items": [
    { "name": string, "qty": number, "unit_price_cents": number | null, "line_total_cents": number }
  ]
}

Rules:
- Items only — skip subtotal, tax, tip, total, savings, change, balance, loyalty/points lines.
- Quantity: read from "x2", "2 @", "Qty 2", "2 EA", or repeated identical lines (merge & sum). Default qty 1.
- If only line total is shown, set unit_price_cents to null and line_total_cents to the visible amount.
- All money values are integer cents (e.g. $3.49 -> 349). Strip currency symbols.
- Clean item names: remove SKU codes, leading/trailing dashes, weight prefixes like "0.42kg".
- If a field is unreadable, use null (or empty array for items). Do not guess.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Parse this receipt." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      if (resp.status === 429) return json({ error: "Rate limited, try again shortly." }, 429);
      if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "Could not read receipt." }, 502);
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return json({ error: "Couldn't read the receipt clearly. Try again." }, 422);
    }

    const safeItems = Array.isArray(parsed?.items)
      ? parsed.items
          .filter((i: any) => i && typeof i.name === "string" && typeof i.line_total_cents === "number")
          .slice(0, 200)
          .map((i: any) => ({
            name: String(i.name).trim().slice(0, 120),
            qty: Math.max(1, Math.min(99, Number.isFinite(i.qty) ? Math.round(i.qty) : 1)),
            unit_price_cents:
              typeof i.unit_price_cents === "number" && Number.isFinite(i.unit_price_cents)
                ? Math.max(0, Math.round(i.unit_price_cents))
                : null,
            line_total_cents: Math.max(0, Math.round(i.line_total_cents)),
          }))
      : [];

    return json({
      store_name: typeof parsed?.store_name === "string" ? parsed.store_name.trim().slice(0, 120) : null,
      purchased_at: typeof parsed?.purchased_at === "string" ? parsed.purchased_at.slice(0, 10) : null,
      total_cents:
        typeof parsed?.total_cents === "number" && Number.isFinite(parsed.total_cents)
          ? Math.max(0, Math.round(parsed.total_cents))
          : null,
      currency: typeof parsed?.currency === "string" ? parsed.currency.toUpperCase().slice(0, 3) : null,
      items: safeItems,
    });
  } catch (e: any) {
    console.error("parse-receipt error", e);
    return json({ error: "Server error" }, 500);
  }
});
