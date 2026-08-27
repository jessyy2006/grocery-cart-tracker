// Gemini access for the edge functions.
//
// Calls Google's OpenAI-compatible endpoint rather than the native
// generateContent API, so the request bodies the functions already build —
// chat `messages`, `tools` function-calling, `response_format`, and
// `image_url` vision parts — carry over unchanged from the Lovable gateway.
//
// Set GEMINI_API_KEY as a function secret:
//   supabase secrets set GEMINI_API_KEY=...
// Key: https://aistudio.google.com/apikey

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Model IDs, in one place so a bump is a single edit.
 *
 * NOTE: FLASH_PREVIEW is a *preview* model. Google can withdraw preview models
 * without notice, which would take receipt matching and finance insights down
 * in a shipped build. `gemini-3.7-flash` is the current stable Flash and
 * supersedes it. These are kept as-is here only so this migration changes the
 * provider without also changing model behaviour — moving both to
 * GEMINI_MODELS.FLASH is a one-line follow-up worth doing before wide release.
 */
export const GEMINI_MODELS = {
  /** Current stable Flash. */
  FLASH: "gemini-3.7-flash",
  /** Previous-generation stable Flash, used for receipt vision. */
  FLASH_2_5: "gemini-2.5-flash",
  /** Preview — see the note above. */
  FLASH_PREVIEW: "gemini-3-flash-preview",
} as const;

export class AIError extends Error {
  constructor(
    readonly status: number,
    /** Safe to show a user — never contains provider detail or the prompt. */
    readonly userMessage: string,
  ) {
    super(userMessage);
  }
}

/**
 * POSTs an OpenAI-shaped chat completion to Gemini and returns the parsed JSON.
 * Throws AIError with a user-safe message; callers map it to their own response.
 */
export async function chatCompletion(
  body: Record<string, unknown>,
  { label }: { label: string },
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error(`${label}: GEMINI_API_KEY not configured`);
    throw new AIError(500, "Service unavailable");
  }

  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // Network failure never reached the model — distinct from a model refusal.
    console.error(`${label}: request failed`, (e as Error).message);
    throw new AIError(502, "Could not reach the AI service.");
  }

  if (!resp.ok) {
    const detail = await resp.text();
    console.error(`${label}: Gemini error`, resp.status, detail);
    // Google signals both rate limit and exhausted quota as 429; the Lovable
    // gateway used 402 for the latter, which has no equivalent here.
    if (resp.status === 429) throw new AIError(429, "Rate limited, try again shortly.");
    if (resp.status === 401 || resp.status === 403) {
      throw new AIError(500, "Service unavailable");
    }
    throw new AIError(502, "The AI service could not complete that request.");
  }

  return await resp.json();
}
