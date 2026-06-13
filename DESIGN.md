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
Use `<Money cents={…} />` for standard inline currency. It owns `.text-money`
(mono + tabular). Currency is resolved centrally; don't thread a `currency` prop
unless rendering a share-export receipt.

**Deliberately NOT a blanket replacement.** Money with intentional hierarchy —
the live cart total, receipt ink — keeps its own size/weight rather than being
forced through `<Money>`; flattening it would lose meaningful emphasis. The
consistency guarantee is the **shared formatter (`formatMoney`) + mono tabular
figures**, which every path already uses. So: reach for `<Money>` for ordinary
inline values; leave hero/receipt money styled in place.

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
- **Item-entry fields → `FieldBox` (`src/components/FieldBox.tsx`).** A bordered
  `rounded-card` box with a mono uppercase micro-label inside, above a borderless
  control (`fieldInputClass`). This is the canonical look for *every* item-entry
  surface so they read identically: the list-creation add pad, **the same pad
  reused for editing** (tap edit → pad slides up pre-filled, footer = "save
  changes"), and the live-run **add-to-cart** / **check-off** drawers. Error state =
  `border-destructive` on the box. No standalone titles on these — fields only.
- Selection rows → `OptionRow` (`src/components/OptionRow.tsx`): full-width bordered
  `rounded-card` row, `border-primary bg-primary/10` active, check/radio indicator.

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

`eslint.config.js` enforces, in `src/pages/**` and top-level `src/components/*`
(ui/ primitives and the receipt-export files in finance/ & trip/ are excluded):
- ❌ arbitrary `rounded-[Npx]` → use `rounded-control/card/sheet`
- ❌ raw `text/bg/border/ring-red-*` → use the `destructive` token

Known exceptions deliberately NOT yet enforced (legitimate uses remain):
`shadow-[…]` (the ScanReceipt camera-spotlight mask) and `*-neutral-*`
(TripDetail's on-paper receipt grays). Tighten later if those get cleaned up.

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
- **Phase 2 — Rollout (in progress).** Done: pick-a-list drawer + Lists page →
  `EntityRow`/`EntityList` (kills the flagged card/row split); onboarding typography
  → serif scale + `OptionRow` for Goals/Behavior; `red-500` → `destructive`;
  ActiveTrip pickers (add / check-off / off-list / substitute / store) → bottom
  Drawers (Drawer is now the one picker pattern; `DrawerTitle` matches `DialogTitle`);
  eyebrow unified to mono (`.text-eyebrow`); Profile sign-out + Signup buttons →
  sanctioned variants; `<EmptyState>` adopted across Home/Lists/ListDetail/History/
  Finance. Money: kept the shared formatter + mono tabular as the guarantee and
  deliberately did NOT blanket-swap to `<Money>` (preserves hero/receipt
  hierarchy). Minor leftover: Lists title still `text-[2.25rem]` (entangled with
  its notebook-margin layout) vs canonical `text-h1`.
- **Phase 3 — Code health (mostly ✅).** Done: retired dead `TapCard`; deduped
  `PrintedReceiptOverlay` → shared `ReceiptPaper` primitives; made the CSS
  animations reduced-motion-aware (`motion-reduce:animate-none`); added the ESLint
  guardrails. Deferred on purpose: `ReceiptView` → `useReceiptShare` dedup — it
  rewrites working PNG-export/gesture code that needs visual verification (can't
  confirm the share image in a headless run); do it in a session where the app is
  open. `TapCard` rename is moot (deleted).

---

## 6. Status quick-reference (as of Phase 2, in progress)

| Area | State |
|---|---|
| Tokens (color/type/radius/shadow) | ✅ defined; `shadow-elevated` + `control`/`card`/`sheet` radii; mono eyebrow |
| Button system | ✅ collapsed to the sanctioned set (`default`/`outline` ui-only) |
| Entity rows | ✅ adopted — pick-a-list drawer + Lists page share `EntityRow` |
| Empty states | ✅ `<EmptyState>` adopted (Home/Lists/ListDetail/History/Finance) |
| Money component | ✅ shared formatter + mono tabular everywhere; `<Money>` for inline, hero/receipt money intentionally styled in place |
| Overlays | ✅ Drawer is the one picker; ActiveTrip pickers converted; AlertDialog for destructive |
| Destructive confirms | ✅ `ConfirmDialog` is canonical |
| Onboarding | ✅ stepper + serif typography + `OptionRow` chips + sanctioned buttons |
| Feedback (toasts) | ✅ Sonner only; form errors use `destructive` |
| Motion / icons | ✅ framer-motion + CSS animations now reduced-motion-aware |
| Guardrails | ✅ ESLint bans arbitrary radii + raw red in product UI |
| Code health | ✅ TapCard removed, PrintedReceiptOverlay deduped; ReceiptView dedup deferred (needs visual check) |
