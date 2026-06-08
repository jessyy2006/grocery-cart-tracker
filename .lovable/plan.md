
# Direction C — "Farmers Market" (Light)

A bright, tactile farmers-market app: cream paper, fresh produce greens, sun-warmed accents, hand-set serif voice. Every screen has one obvious next action and a clear visual lead.

---

## 1. Visual narrative

**Concept:** *Saturday morning at the market.* Cream canvas like butcher paper, leafy green as the brand voice, tomato red as the urgent accent, honey/butter and sky as supporting produce colors. Receipts look like ones the cashier hands you.

**Personality:** warm, generous, unfussy, a little editorial. Not corporate, not techy, not dark-mode-cool.

**Signature moments**
- Cream paper background with a faint paper-grain texture.
- One hand-set serif headline per screen as the visual anchor.
- Receipt with perforated edge + mono totals as the Finance hero.
- Pastel category chips that feel like produce stickers.
- Soft "lift" on press, gentle springs, no harsh shadows.
- Floating tab bar in cream-glass with a moving leaf-green pill.

---

## 2. Color system (light, HSL in `index.css`)

```text
--background:        38 40% 96%   /* cream paper */
--surface:           36 50% 99%   /* card */
--surface-sunk:      38 30% 93%   /* input, inset */
--surface-raised:    0 0% 100%    /* sheet, modal */
--foreground:       150 30% 12%   /* deep leaf ink */
--muted:            150 8% 42%
--hairline:          36 20% 86%

--primary:          145 55% 28%   /* leaf green — brand */
--primary-foreground: 38 40% 97%
--primary-glow:     130 55% 45%

--accent-tomato:      8 80% 56%   /* urgent / over-budget / destructive */
--accent-honey:      40 90% 60%   /* highlights, this-month */
--accent-butter:     48 95% 78%   /* soft fills */
--accent-sky:       200 70% 70%
--accent-plum:      300 35% 60%
--accent-clay:       18 55% 62%
--accent-mint:      155 45% 72%
--accent-blush:     350 70% 82%

--success:          145 55% 38%
--danger:             8 80% 56%
--receipt-paper:     40 35% 97%
--receipt-ink:      150 35% 10%
```

Tag palette (8 produce-sticker pastels, mapped from existing FNV hash in `tagColor.ts`): tomato, honey, butter, sky, plum, clay, mint, blush. Chips render as `bg-{tag}/20 text-{tag-ink} border-{tag}/40`.

No dark mode in this pass — `:root` and `.dark` both ship light tokens so accidental dark toggles don't break the visual.

---

## 3. Typography

Self-host via `@fontsource` — no CDN.

| Role | Font | Weight | Size / Leading | Tracking |
|---|---|---|---|---|
| Display (hero, brand) | **Fraunces** variable (opsz 144) | 500 | 36 / 40 | -0.02em |
| H1 page title | Fraunces (opsz 72) | 500 | 28 / 32 | -0.015em |
| H2 section header | Fraunces | 500 | 20 / 26 | -0.01em |
| H3 / card title | Inter Tight | 600 | 15 / 20 | -0.005em |
| Body | Inter Tight | 450 | 15 / 22 | 0 |
| Body small | Inter Tight | 450 | 13 / 18 | 0 |
| Eyebrow / label | Inter Tight | 600 uppercase | 11 / 14 | 0.10em |
| Money / numbers | **JetBrains Mono** | 500 tabular-nums | varies | -0.01em |

Rules
- Exactly **one Fraunces element above the fold per page** — the page H1. Section headers may use Fraunces at H2 size when the page is content-dense (Lists, History); otherwise Inter Tight 600.
- All currency uses mono + tabular-nums. Never the serif, never the body sans.
- Replace `text-3xl font-bold` defaults with semantic helpers: `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-small`, `text-eyebrow`, `text-money`.

---

## 4. Spacing, radius, elevation

**Spacing scale** (4pt): 4, 8, 12, 16, 20, 24, 32, 40, 56, 72.

**Page layout rules**
- Horizontal page padding: `px-5` (20px). Hero edge-to-edge cards may bleed via `-mx-5`.
- Top: `pt-4` after safe area. Bottom content padding `pb-28` to clear floating tab bar.
- Vertical rhythm between sections: `space-y-8` (32px) — generous, lets the eye land.
- Inside a section: `space-y-3` for list rows, `space-y-2` for chips.
- Card inner padding: `p-5`; hero card `p-6`; receipt `p-7`.

**Radius**
```text
--radius-sm: 12px   /* chips, inputs */
--radius:    20px   /* cards, buttons */
--radius-lg: 28px   /* hero cards, sheets */
--radius-xl: 36px   /* receipt, big modals */
```

**Elevation** (soft, paper-like — no heavy drop shadows)
```text
--shadow-soft:    0 1px 2px hsl(150 30% 10% / .06), 0 8px 24px -16px hsl(150 30% 10% / .12)
--shadow-raised:  0 2px 4px hsl(150 30% 10% / .06), 0 16px 36px -20px hsl(150 30% 10% / .18)
--shadow-glow:    0 0 28px -10px hsl(var(--primary) / .35)
--hairline:       inset 0 0 0 1px hsl(var(--hairline))
```
Glass tab bar: `bg-surface/75 backdrop-blur-xl` + hairline.

---

## 5. Motion

Use existing `framer-motion`. Spring preset `{ stiffness: 360, damping: 30, mass: 0.9 }`.

- Route transition: 180ms cross-fade + 6px y-slide via `<PageTransition>` around `<Outlet />`.
- Tab bar pill: shared `layoutId="tab-pill"`.
- Money counter spring (`<AnimatedNumber>`).
- Item check: scale 1 → 0.94 → 1 + checkmark draw + `navigator.vibrate?.(8)`.
- Confetti reserved for under-budget only.

---

## 6. UX & visual hierarchy — per page

Every page follows the same hierarchy contract:
1. **Eyebrow** (tiny, muted) — sets context.
2. **Page H1 (Fraunces)** — names the place.
3. **One hero block** — the single most important thing on this screen.
4. **One primary CTA** — leaf-green, full-width on mobile.
5. **Supporting sections** — quieter, scannable.

### Home — "What do I do right now?"
Today the page has 2 competing CTAs and the monthly spend buried.
- Eyebrow: "Evening, Jess".
- H1: "Saturday market?"
- **Hero card:** "This month" — animated mono total + tiny sparkline + budget remaining as a thin honey bar. This is the dominant element.
- **Primary CTA:** ONE giant chartreuse/leaf "Start a trip" button below the hero. Tap → bottom sheet (replaces the current dialog-on-dialog).
- "My lists" demoted to a quiet text link with arrow, not a second button.
- Recent trips: 3 rows max, mono totals right-aligned, "See all →" link.

### Lists — "Pick or make a list."
- Eyebrow + H1: "Your lists".
- **Primary CTA:** "+ New list" pinned as a floating bottom button (above tab bar), not buried in the header.
- Each list = card with: list name (h3), item-count eyebrow, last-updated relative time, 3 tag chips preview. Tap target = full card.
- Empty state: serif headline + illustrated produce mark + single CTA.

### ListDetail — "Edit my list."
- Top bar: back chevron · editable title (Fraunces, pencil affordance already added) · overflow.
- **Hero strip:** "X items · Y categories" eyebrow + total estimated cost in mono.
- Items grouped by **food category** with a pastel category-chip header per group. Within group: row = checkbox · name · tag chips · price (mono right). Drag-handle on the right.
- **Primary CTA:** "+ Add item" floating button. Quick-add input slides up as bottom sheet with category autodetect.

### StartTrip / ChooseList — convert to bottom sheets
- Replace nested dialogs with **one** vaul `Drawer` that has 2 internal screens (slide horizontally). One tap to "Shop freely", one tap to a list.
- Visual hierarchy: grip handle · Fraunces title · choices as big cards with leaf-green check on the selected one · "Start shopping" sticky bottom CTA.

### ActiveTrip — "I'm at the store, help me move fast."
This is the most-used screen — it gets the strongest scaffolding.
- **Sticky top bar (the real hero):** store name (h3) · running total (large mono) · elapsed time + budget remaining bar. Always visible. This is what the user glances at between aisles.
- Items grouped by category. Checked items collapse to a thin strikethrough row that sinks to the bottom of its group.
- **Floating "+ Add item" FAB** (leaf, primary) bottom-right above tab bar — biggest tap target on the page.
- "Extras" group gets a peach header chip — never a guilt-inducing red. Reads as "off-list", not "wrong".
- Bottom action bar: "End trip" as quiet ghost button, "Save & view receipt" as primary.

### Finance — "Where did my money go?"
- Eyebrow + H1: "This month".
- **Hero = the receipt itself, full-width.** Paper-colored card with perforated bottom edge, store-by-store mono totals, monthly subtotal, tax line, grand total. The toggle is gone — receipt is always there.
- Below the receipt: a single bar chart (chartreuse on cream, no grid lines, mono axis labels) titled "By category".
- Tertiary: small insight chip ("You spent 12% less than last month") with honey background.

### History — "Find a past trip."
- H1: "Trips".
- Sticky month-section headers (Fraunces, hairline divider).
- Each trip card: date (mono small) · stores as chips · total (mono large right).
- Tap → TripDetail.

### Profile / Onboarding
- Onboarding: one Fraunces line per step, big leaf primary action, generous whitespace (`pt-16`), illustrated produce mark per step.
- Profile: stacked surface cards, edit fields inline.

### Bottom nav
- Floating cream-glass pill with hairline, 5 icons, animated leaf pill behind active. Icons swap to filled when active. Always reachable with thumb.

---

## 7. Technical changes

```text
src/
  index.css                 light tokens, font faces, utilities, paper-grain bg, keyframes
  tailwind.config.ts        extend colors, radius, fontFamily, fontSize, boxShadow
  components/
    ui/button.tsx           variants: hero (leaf), quiet (text), glass; sizes h-12/h-14, rounded-2xl
    ui/card.tsx             default surface; export HeroCard
    ui/input.tsx            h-12, rounded-2xl, surface-sunk bg
    BottomNav.tsx           floating glass pill + layoutId leaf indicator
    PageHeader.tsx          new — eyebrow + H1 + optional action
    PageTransition.tsx      new — wraps Outlet
    Money.tsx               new — tabular mono
    AnimatedNumber.tsx      new
    Eyebrow.tsx             new
    CategoryChip.tsx        new
    TagPill.tsx             restyle to produce-sticker palette
    FloatingActionButton.tsx new — used by Lists, ListDetail, ActiveTrip
    finance/ReceiptView.tsx paper texture, perforated edge, mono totals, always-on
  pages/
    Home.tsx                rebuild hierarchy (one hero, one CTA)
    Lists.tsx               floating "+ New list", new card rows
    ListDetail.tsx          grouped by category, FAB, hero strip
    StartTrip.tsx           merge dialogs into one Drawer with internal steps
    ActiveTrip.tsx          sticky trip bar, FAB, peach Extras
    Finance.tsx             receipt-first, chart secondary
    History.tsx             sticky month headers
    onboarding/*.tsx        apply typography + spacing
  lib/tagColor.ts           map FNV → 8 produce pastels (logic unchanged)
```

Deps: `@fontsource-variable/fraunces`, `@fontsource-variable/inter-tight`, `@fontsource/jetbrains-mono`. Nothing else new.

No DB, RLS, edge function, route, or business-logic changes.

---

## 8. Out of scope

- Dark mode (deferred; tokens shaped so a future dark pass is straightforward).
- New features or copy rewrite beyond eyebrows + greetings.
- Icon set swap (Lucide stays, `strokeWidth={1.75}`).
- Haptics beyond `navigator.vibrate` best-effort.
- Recharts replacement — restyled, not rebuilt.
