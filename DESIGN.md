# Design System — Grocery Cart Tracker

> The canonical source of truth for how this app looks and behaves.
> If a screen disagrees with this doc, the screen is wrong. When you add UI,
> reuse a primitive here — don't hand-roll. Tokens live in `src/index.css`
> (`:root`) and `tailwind.config.ts`.

**Voice:** "Farmers-market receipt meets Swiss-brutalist ledger." Cream paper
surfaces, forest-green actions, serif display headings, monospace for anything
numeric or label-like. Calm, tactile, precise. The benchmark is Flighty: one
component renders each concept *everywhere*, so the app feels seamless.

---

## 1. Principles

1. **One component per concept.** A list row, a CTA, a money value, a "pick one"
   sheet — each has exactly one implementation. No local re-rolls.
2. **Tokens, never literals.** No raw hex, no `text-red-500`, no `rounded-[6px]`
   in app code. The only exception is the receipt PNG-export components
   (`ReceiptView`, `YearlyReceiptView`, `ReceiptPaper`, `PrintedReceiptOverlay`,
   `useReceiptShare`) — `html-to-image` can't resolve CSS variables, so literal
   hex is required there and **only** there.
3. **Lowercase, mono, tabular.** Entity names render lowercase; labels and money
   render in JetBrains Mono with tabular figures.
4. **Confirm the irreversible.** Every destructive action goes through
   `ConfirmDialog`. Never delete on a single tap.

---

## 2. Tokens

### Color (semantic — use the token, not the value)
| Token | Use |
|---|---|
| `background` | page canvas (cream) |
| `surface` / `surface-sunk` / `surface-raised` | card & input surfaces by elevation |
| `foreground` | primary text/ink |
| `muted-foreground` | secondary text, metadata, inactive |
| `primary` / `primary-foreground` | the forest-green CTA + nav (the **only** brand green) |
| `forest` | alias of `primary`; prefer `primary` in new code |
| `hairline` / `border` | 1px dividers and borders |
| `destructive` | error/destructive **color** — icons, indicators, over-budget (replaces all `red-500`). Not a button style. |
| `success` | positive confirmation only |
| `accent-*` (honey/tomato/butter/sky/plum/clay/mint/blush) | tag colors via `lib/tagColor.ts` |

> ⚠️ Never hardcode the brand green. `#143F2D` (formerly in BottomNav) did **not**
> match `primary` and made the nav off-brand. Use `bg-primary`.

### Type scale (utility classes, not raw sizes)
| Class | Role |
|---|---|
| `.text-display` / `.font-display-xl` | hero numerals & splash |
| `.text-h1` | page titles (Fraunces serif) |
| `.text-h2` | dialog / section titles |
| `.text-h3` | card titles |
| `.text-body` | body copy |
| `.text-small` | secondary copy |
| `.text-eyebrow` | the uppercase mono section label — use `<Eyebrow>` |
| `.text-money` | all currency — use `<Money>` |

Do **not** write `text-[15px]`, `text-xl`, `font-bold` in pages. If a size is
missing from the scale, add it to the scale.

### Radius — brand tokens (tight, brutalist corners)
| Token / class | Px | Use |
|---|---|---|
| `rounded-control` | 4 | buttons, inputs, chips, steppers, nav tabs |
| `rounded-card` | 6 | **cards, rows, dialogs** (the default surface radius) |
| `rounded-t-sheet` | 28 | bottom-drawer top edge only |
| `rounded-full` | — | pills, avatars, FAB |

Defined in `:root` (`--radius-control` / `-card` / `-sheet`) and
`tailwind.config.ts`. The generic `rounded-sm/md/lg/xl/2xl` scale is retained
only for shadcn ui primitives — don't use it in product UI.

> Banned in app code: any arbitrary `rounded-[Npx]`. The former de-facto
> defaults `rounded-[6px]` (19×), `[4px]`, `[3px]` were tokenized in place in
> Phase 1 (identical pixels) to `rounded-card` / `rounded-control`.

### Shadow — four tokens only
`shadow-soft` (resting cards) · `shadow-raised` (drawers/popovers) ·
`shadow-elevated` (lifted/floating cards) · `shadow-glow` (hover emphasis).
Banned: `shadow-sm/md/lg/xl/2xl` and arbitrary `shadow-[…]` (except the scanner
spotlight mask). `shadow-elevated` is now a real token — it was referenced 5×
before this doc and silently rendered nothing.

### Spacing
Page gutter is **`px-5`**, applied by the layout, not per-page. Vertical rhythm
in multiples of `0.25rem`. Stacked rows use `divide-y divide-hairline`.

### Motion
**framer-motion only** (it respects `useReducedMotion`). `PageTransition` wraps
every route. Standard durations: enter 180–220ms ease-out. Do not add
`tailwindcss-animate` `animate-in/*` classes or bespoke `@keyframes` in pages —
they bypass reduced-motion.

### Icons
**lucide-react only.** Sizes: `h-4 w-4` default, `h-5 w-5` emphasis,
`h-3.5 w-3.5` dense rows. No other icon library.

---

## 3. Components

### Buttons — `src/components/ui/button.tsx`
Sanctioned variants (everything else is being retired):
| Variant | Use |
|---|---|
| `primaryLight` | the primary CTA on light surfaces (forest, mono, lowercase, `rounded-md`) |
| `primaryDark` | primary CTA on dark/forest surfaces |
| `secondaryLight` | secondary / cancel actions |
| `ghost` (icon) | inline icon controls |

There is **no `destructive` button variant.** Destructive intent is signalled by
`ConfirmDialog` + the `destructive` *color* token (icons, indicators) — never a
red CTA. `primaryDark` is the on-dark option for camera/scanner surfaces.

Sizes: `lg` (h-12) for full-width CTAs, default (h-11), `compact`/`sm` for inline.
**No hand-rolled `<button>` with bespoke Tailwind**, no bracket text-buttons
(`[ save trip ]`), no one-off pills. The legacy `hero/secondary/glass/quiet/
link/destructive` variants were removed in Phase 1. `default` and `outline`
remain in `button.tsx` ONLY because shadcn ui primitives (calendar, pagination,
alert-dialog cancel) reference them — never use them in product UI.

### Entity rows (lists, trips, items) — *the canonical list presentation*
Flat, borderless **ruled rows**, never cards:
- container: `divide-y divide-hairline`, row `py-` with `px-5` gutter
- name: `text-[15px] lowercase text-foreground truncate`
- metadata: `font-display italic` count + `font-mono text-[12px]` timestamp,
  in `muted-foreground`
- trailing: `<Money>` and/or a chevron; no leading icon, no border, no shadow
- component: `src/components/EntityRow.tsx` — `EntityRow` (single row) + `EntityList`
  (the `divide-y divide-hairline` wrapper). Reference styling: `Lists.tsx`, `TripTapeRow`.

> This replaces the card-style list rows in the Home start-trip drawer. The same
> entity must look identical whether you're managing it or picking it.

### Money — `src/components/Money.tsx`
**Every** currency value renders via `<Money cents={…} />`. It owns
`.text-money` (mono + tabular). Never call `formatMoney()` + `.text-money`
inline. Currency is resolved centrally; don't thread a `currency` prop unless
rendering a share-export receipt.

### Overlays — pick the right one, every time
| Need | Use | Why |
|---|---|---|
| Pick one / enter data (mobile) | **Drawer** (vaul, bottom sheet) | thumb-reachable; the app's canonical picker |
| Confirm a destructive action | **`ConfirmDialog`** (AlertDialog) | blocks accidental data loss |
| Centered focus form (rare/desktop) | **Dialog** | only when a bottom sheet doesn't fit |

The **Drawer is the one true picker.** Store-picker, substitution-picker, and
list-picker should all be the same bottom Drawer — not a mix of Drawer and
Dialog. `Sheet` (the side variant) is not used; don't introduce it.

### Destructive confirms — `src/components/ConfirmDialog.tsx`
The single component for delete/discard. Two modes:
- **Uncontrolled:** pass `trigger` (e.g. a trash icon button).
- **Controlled:** pass `open` + `onOpenChange` (when the action lives inside
  another component, e.g. a `LedgerRow` delete).

```tsx
<ConfirmDialog
  trigger={<button aria-label="Delete list"><Trash2 /></button>}
  title="Delete this list?"
  description="…this can't be undone."
  confirmLabel="Delete list"
  onConfirm={() => remove(id)}
/>
```
Confirm = `primaryLight`, cancel = `secondaryLight`, matching the exit-trip
dialog. The exit-trip AlertDialog in `ActiveTrip.tsx` should migrate to this
component (Phase 2).

### Inputs & selection controls
- Text: `ui/input.tsx` (`h-12`, `rounded-md`, `bg-surface-sunk`). Use everywhere.
- Selection chips (gender/age/goals/behavior): **one** chip primitive, `rounded-md`,
  active state `border-primary bg-primary/10`. The three divergent onboarding chip
  styles (`rounded-md` vs `rounded-2xl` ±check) must converge (Phase 2).

### Page header — `src/components/PageHeader.tsx`
Mandatory on every top-level page and the onboarding `Layout`: eyebrow +
`.text-h1` (Fraunces) + optional action slot. No hand-rolled headers, no
reinvented eyebrows (use `<Eyebrow>` / `.text-eyebrow`). Onboarding titles must
use the serif display scale, not `text-3xl font-bold`.

### Empty / loading states
- Loading: `<MarketLoader>` everywhere (retire bare `Loader2`).
- Empty: one `<EmptyState>` primitive — `src/components/EmptyState.tsx` (centered,
  optional icon + CTA, lowercase). The four legacy variants converge onto it in Phase 2.

### Feedback
**Sonner only.** The Radix `useToast`/`<Toaster>` system is removed. Errors use
`toast.error` *or* an inline `destructive`-token message — never raw `red-500`,
and never two channels for the same error.

---

## 4. Guardrails

Add an ESLint rule (Phase 3) banning, in `pages/**` and `components/**` (excluding
the receipt-export files):
- arbitrary `rounded-[*]`, `shadow-[*]`
- raw hex `#…` in `className`
- `text-red-*` / `border-red-*` / `ring-red-*` (use `destructive`)
- `text-neutral-*` / `border-neutral-*` (use `muted-foreground` / `border`)

This is what stops the system from re-fracturing.

---

## 5. Migration roadmap

- **Phase 0 — Bugs ✅.** Defined `shadow-elevated`; BottomNav → `primary`/`muted`
  tokens; `ConfirmDialog` added + wired into list & item deletes (with optimistic
  rollback); onboarding stepper fixed (`TOTAL_STEPS 7→5`, `i<step`); removed the
  dead Radix toaster; fixed the duplicate-item dialog (dropped the inverted
  red/green one-off buttons → `primaryLight`/`secondaryLight`).
- **Phase 1 — Primitives ✅.** Collapsed `Button` to the sanctioned set (removed
  `hero/secondary/glass/quiet/link/destructive`; migrated the 5 remaining call
  sites); established the brand radius tokens `control`/`card`/`sheet` and
  tokenized every arbitrary `rounded-[Npx]` in place (identical pixels); built
  `<EntityRow>`/`<EntityList>` and `<EmptyState>`; verified the `<Money>` API.
  No page adoption yet — that's Phase 2.
- **Phase 2 — Rollout (flow by flow).** Pick-a-list drawer → `EntityRow` (kills the
  flagged card/row split); headers → `PageHeader`; onboarding typography + chips;
  money displays → `<Money>`; pickers → Drawer; `red-500` → `destructive`.
- **Phase 3 — Code health.** Dedup `ReceiptView` → `useReceiptShare`,
  `PrintedReceiptOverlay` → `ReceiptPaper`; unify motion to framer-motion; retire
  `TapCard`; add the ESLint guardrails.

---

## 6. Status quick-reference (as of Phase 1)

| Area | State |
|---|---|
| Tokens (color/type/radius/shadow) | ✅ defined; `shadow-elevated` + `control`/`card`/`sheet` radii now real |
| Button system | ✅ collapsed to the sanctioned set (`default`/`outline` ui-only) |
| Entity rows | ⚠️ `<EntityRow>` built; drawer/Lists adoption is Phase 2 |
| Empty states | ⚠️ `<EmptyState>` built; per-screen adoption is Phase 2 |
| Money component | ⚠️ API ready; adoption outside history is Phase 2 |
| Overlays | ⚠️ Drawer/Dialog split — Phase 2 |
| Destructive confirms | ✅ `ConfirmDialog` is canonical |
| Onboarding type/stepper | ⚠️ stepper fixed; typography Phase 2 |
| Feedback (toasts) | ✅ Sonner only |
| Motion / icons | ✅ healthy (minor cleanup Phase 3) |
