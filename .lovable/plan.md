# Forest-green CTAs + Lists notebook overhaul

A focused presentation pass: introduce a deep forest-green primary CTA, rebuild the Lists page in the same editorial ledger style as Home/History, and confirm the typographic hierarchy is consistent everywhere.

## 1. Forest-green design token

Add a new semantic color in `src/index.css`:

- `--forest: 150 45% 18%` (deep, velvety — darker and slightly cooler than current `--primary` leaf green)
- `--forest-foreground: 38 40% 97%` (cream)

Register matching Tailwind colors `forest` / `forest-foreground` in `tailwind.config.ts` so we can write `bg-forest text-forest-foreground` without hardcoded hex.

Scope: only the two primary CTAs ("start a live trip", "+ create a new list") use this token. The existing `--primary` leaf green stays for incidental UI (links, focus rings, icon accents).

## 2. Home page (`src/pages/Home.tsx`)

- Replace the CTA classes on the hero "[ start a live trip ]" button:
  - From `bg-foreground text-background ... rounded-[4px]`
  - To `bg-forest text-forest-foreground rounded-[4px] h-12 w-full text-[14px] lowercase tracking-tight hover:opacity-90`
- Greeting (`Thursday market run?`) already lives outside the card via `PageHeader` — no change.
- Scan icon stays top-right of card — no change.
- Budget monospace line stays — no change.

## 3. Lists page (`src/pages/Lists.tsx`) — full overhaul

Rebuild to match the receipt-tape / editorial-ledger style used on Home & History.

- `PageHeader`: keep `eyebrow="Plan your run"` (renders lowercase mono via existing PageHeader styling — verify it matches History; otherwise pass a className override identical to History's `[&_h1]:text-display [&_h1]:lowercase`). Title becomes `"your lists"` (lowercase serif).
- Remove `Card` wrapper around each list row. Render as a flat `<ul className="divide-y divide-foreground/10">` (solid hairline, not dashed — notebook ruling).
- Each row: borderless `<button>` mirroring `TripTapeRow` structure:
  - Line 1: `text-[15px] lowercase text-foreground` — list name
  - Line 2: `font-mono text-[12px] lowercase text-muted-foreground` — `→ {n} items · updated {relative}`
  - Right side: small chevron/arrow in muted gray, OR omit for max cleanliness
  - Trash action stays on hover (absolute, top-right of row, smaller)
- Empty state: keep simple — strip the heavy Card; use a flat centered block with serif title + mono subtext + the new forest CTA below.
- Replace the floating `FloatingActionButton` with a full-width, in-flow CTA at the bottom of the canvas:
  - `bg-forest text-forest-foreground rounded-[4px] h-12 w-full text-[14px] lowercase tracking-tight`
  - Label: `[ + create a new list ]`
  - Remove `FloatingActionButton` import + usage.
- Keep the New-list `Dialog` flow exactly as is (functionality untouched).

## 4. History typographic check

Already conforms:
- Title `"history"` renders via `[&_h1]:text-display [&_h1]:lowercase` (serif).
- Month group headers use `font-mono text-[11px] lowercase tracking-[0.14em] text-muted-foreground`.

No changes needed unless something visually drifts after the token addition — will spot-check after build.

## Files touched

- `src/index.css` — add `--forest` + `--forest-foreground`
- `tailwind.config.ts` — register `forest` / `forest-foreground` color tokens
- `src/pages/Home.tsx` — swap CTA color classes
- `src/pages/Lists.tsx` — full rebuild of list rows + CTA, remove FAB

## Out of scope

- No backend/data changes
- No changes to `TripTapeRow`, `FloatingActionButton` component, dialogs, or History page
- `--primary` token unchanged (other surfaces still use leaf green)
