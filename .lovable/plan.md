## Scan Past Receipt — feature plan

A new secondary flow to log a past grocery trip by photographing a paper receipt. Lovable AI (Gemini vision) parses it; the user reviews and edits; the trip is saved like any other trip and flows into History/Finance. Optionally matches an existing list (≥85% overlap) or creates a new reusable list.

### 1. Entry points

- **Home tab** — under the "Start a trip" hero card, add a quiet monochrome outline card-button: icon (Receipt/Scan), label "Scan past receipt", subtitle "Log a trip from a paper receipt". Visually clearly secondary vs the green hero CTA.
- **History tab** — in the `PageHeader` action slot (next to the month dropdown), add a small icon button (camera/receipt icon) that opens the same flow.

Both route to `/scan-receipt`.

### 2. Capture screen (`/scan-receipt`)

- Full-screen camera using the existing `getUserMedia` pattern from `Scanner.tsx` (rear camera).
- Centered rounded rectangular framing overlay sized for a tall receipt (≈ 70% width, 75% height).
- Caption above frame: "Scan your receipt within the frame".
- Bottom bar: large round shutter button + small "Upload photo" fallback (file input, `accept="image/*"` with camera capture).
- "X" close button top-left, returns to previous page.
- After capture: show captured image with "Retake" / "Use photo" actions; "Use photo" sends to OCR.

### 3. OCR & parsing

- New Supabase Edge Function `parse-receipt` (verify_jwt validated in code).
- Client sends the photo as base64 to the function.
- Function calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with the image + a structured-output schema (zod via AI SDK `Output.object`):
  - `store_name: string | null`
  - `purchased_at: string | null` (ISO date)
  - `total_cents: number | null`
  - `currency: string | null` (3-letter, best-effort)
  - `items: { name: string; qty: number; unit_price_cents: number | null; line_total_cents: number }[]`
- Prompt explicitly instructs: extract qty when shown as "x2", "2 @", "Qty 2", or repeated lines; if only line total is shown, leave unit price null; ignore tax/subtotal lines; normalize prices to cents.
- Returns the parsed JSON or a `{ error }` payload on failure. Client shows a friendly retry toast on parse failure.

### 4. Review overlay

Centered card on a dimmed backdrop (matches existing review/overlay aesthetic). Sections:

- **Store** — text input prefilled with parsed name. Below it, a small store picker prompt: "Link to a saved store?" with a search/select listing the user's existing stores from `stores` (fuzzy-matched suggestion on top), plus a "Use as new store" option that creates a new `stores` row on save.
- **Date** — date picker, prefilled with parsed date, falling back to today.
- **Items** — list of editable rows: name, qty (number stepper), price (money input). Each row deletable; "Add item" button at the bottom.
- **Total** — auto-computed from items, with the parsed total shown beside it as a secondary "Receipt total: $X.XX" so the user can spot discrepancies.

Below the items:

- **List match** (only if a ≥85%-overlap uncompleted list is found): checkbox "Match this trip to your '[List Name]' list". Checked by default when match ≥85%.
- **Save as new list** checkbox: "Save these items as a reusable shopping list". When checked, reveals a text input prefilled with `[Store Name] Essentials` (editable). Disabled if the list-match checkbox above is checked.

Primary action: "Save trip" (dark green). Secondary: "Cancel".

### 5. Save flow

On confirm:

1. Resolve store: if user picked existing → use its id/name; if new → insert into `stores`; if none → leave null.
2. Insert a `trips` row: `status='saved'`, `started_at = chosen date`, `total_cents = sum(items)`, `list_id = matched list id if checkbox on, else null`, `source = 'scanned'` (new column, see Technical).
3. Insert all parsed items into `trip_items` with `store_name_snapshot`, `name_snapshot`, `qty`, `price_cents`.
4. If list-match checked: mark every `shopping_list_items` row in that list as `checked_at = now()` (treated as completed by the rest of the app).
5. If "save as new list" checked: insert a new `shopping_lists` row with the user-entered name, then insert each parsed item into `shopping_list_items` carrying over name and qty (category guessed via existing `guessCategory`).
6. Show the existing `PrintedReceiptOverlay` for parity with live trips, then navigate to `/trip/:id`.

### 6. List-match logic

- Pull all uncompleted lists (`hidden=false`, has items where `checked_at is null`).
- For each list, compute overlap = (# list items whose normalized name fuzzy-matches a scanned item) / (# list items). Use the existing `findListMatch` helper from `src/lib/categories.ts` as the matcher per item.
- Pick the highest-overlap list. Surface it only if overlap ≥ 0.85.

### Technical section

- **New route**: `/scan-receipt` (lazy page `src/pages/ScanReceipt.tsx`). Add to `App.tsx` routes under the authenticated/onboarded layout.
- **New components**:
  - `src/components/scan/ReceiptCamera.tsx` — capture UI with frame overlay.
  - `src/components/scan/ReceiptReview.tsx` — the review card (modal).
  - `src/components/scan/ScanPastReceiptCard.tsx` — Home entry button.
- **Home edit**: add the entry card to `src/pages/Home.tsx` under the HeroCard block.
- **History edit**: add icon button to `PageHeader` action in `src/pages/History.tsx` (alongside the month select).
- **Edge function**: `supabase/functions/parse-receipt/index.ts` using shared `_shared/ai-gateway.ts` provider + `generateText` with `Output.object` schema. Validates body with zod. Returns CORS headers.
- **DB migration** (single migration):
  - `ALTER TABLE public.trips ADD COLUMN source text NOT NULL DEFAULT 'live'` (values: `'live' | 'scanned'`). Pure additive; no GRANT changes needed because grants already cover the table.
  - No new tables.
- **List matching helper**: new `src/lib/matchListToReceipt.ts` that wraps `findListMatch` row-by-row and returns `{ list, score }`.
- **Money/qty inputs**: reuse existing `Input` + `parsePriceToCents` from `src/lib/format.ts`.
- **Store search**: reuse `searchStoresByName` from `src/lib/device/geolocation.ts` if a near-match by name is desired; otherwise query `stores` directly for the user's saved stores.
- **Existing behavior unchanged**: live trip flow, History grouping, receipt overlay styling, exit-confirm dialog — all untouched.

### Out of scope (call out for confirmation, not building)

- Multi-receipt batch scanning.
- Server-side image storage (photo is parsed transiently and discarded).
- Editing the store after the trip is saved (use existing TripDetail behavior).
