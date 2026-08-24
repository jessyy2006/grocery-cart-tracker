# Design-System Consistency Audit — Cartwise

Read-only audit of 19 routes, all overlays, and every actively used shared component. Findings are grouped by root cause; every affected route/component is listed. No code was changed.

## Verified vs. assumed rules

| Assumed rule (from inventory) | Reality |
| --- | --- |
| Standard top margin `safe-top-page` | Only ListDetail, ActiveTrip, ScanReceipt use it. Home/Lists/Finance/History rely on `AppLayout`'s `safe-top` + ad-hoc `pt-3 pt-2`. Not a system. |
| Lowercase copy | Applied on Lists, History, EntityRow, buttons. Finance ("Finance"), Home cards ("Start a trip"), onboarding, dialogs are sentence case. Mixed. |
| Standard modal styling | True for Dialog/AlertDialog only. Drawer and 3 custom fullscreen overlays diverge. |
| Semantic tokens everywhere | False: 14+ hard-coded hex/black/white sites. |
| `rounded-[6px]` everywhere | Now `rounded-card`, but 10 competing radii remain in product code. |

## Issues

### DS-01 · Page header is not a component (High)
`PageHeader.tsx` is used by Home and History only. Finance (`Finance.tsx:509`) and Lists (`Lists.tsx:70`) hand-roll the same markup; History overrides the h1 via `[&_h1]:text-display [&_h1]:lowercase`; Lists inlines `font-display text-[2.25rem]`. Result: four different H1 sizes/cases on four tab destinations. Not intentional. Root cause: component lacks size/case variants, so pages fork. Fix: give `PageHeader` `variant="page"` (display, lowercase) as the single tab-page header and migrate all four. Level: shared component.
Affected: `/`, `/lists`, `/finance`, `/history`, `/profile`, `/lists/:id`, `/trip`, `/trips/:id`, `/scan-receipt`.

### DS-02 · Inconsistent page shell padding & top offset (High)
`px-5 pt-3` (Finance, History), `px-5 pt-3 pb-12` (Lists), `px-4` (ScanReceipt review), no shell (Home relies on inner), `safe-top-page` (3 routes). Vertical rhythm also splits: `space-y-7` (Finance, History) vs `space-y-8` (Home). Fix: `PageShell` template with fixed gutter (20px), `safe-top-page`, `pb-24` when tab bar shown, and one `space-y` scale token. Level: page template.

### DS-03 · Two loading implementations + one unguarded page (High)
`PageLoadGate` (Home, Lists, Finance, History, Profile, ListDetail) vs bare `MarketLoader` with no delay (TripDetail:191, ActiveTrip:820) vs `Loader2` spinners (ScanReceipt:522/697, StartTrip:82). TripDetail/ActiveTrip therefore flash the loader on fast loads — the exact bug `PageLoadGate` was built to kill. Fix: route-level loads always `PageLoadGate`; in-button/in-flight work uses one `Spinner` component wrapping `Loader2` (fixed size/stroke/color). Level: shared component.

### DS-04 · Empty states diverge from the shared component (Medium)
`EmptyState` used on Home, Lists, History, Finance (×3), Profile, ListDetail, ActiveTrip — but TripDetail:251 renders raw text "no items on this trip" and Profile:251 renders "no items yet" inline. Descriptions mix case ("Create a list to plan…" sentence case under a lowercase title). Fix: replace the two one-offs; define copy rule (lowercase title, sentence-case description) inside the component doc. Level: shared component + copy rule.

### DS-05 · Hard-coded colors bypassing tokens (High, maintainability + dark-mode)
`ReceiptPaper.tsx:1-2` (`#fdfaf1`, `#0e1a14`), `ReceiptView.tsx:35`, `YearlyReceiptView.tsx:17,136,222`, `PrintedReceiptOverlay.tsx:21` (`#13261d`), `FeatureIntroDialog.tsx:9-10`, `Index.tsx:8` (`#fcfbf8`), `ScanReceipt.tsx:441,702` (`bg-black text-white`), `Scanner.tsx:56`, `TripDetail.tsx:229` + receipts (`rgba(0,0,0,.18)` drop-shadows). Tokens `--receipt-paper`/`--receipt-ink` already exist and are ignored. Partly intentional (rasterized share images need literal colors) — but the on-screen render must use tokens. Fix: add `--camera-bg`, `--camera-fg`, `--receipt-forest`, `--shadow-paper`; keep literals only inside the html-to-png clone path in `useReceiptShare.ts`. Level: design token.

### DS-06 · Radius scale has 10+ values (Medium)
In product code: `rounded-md` (37), `rounded-full` (36), `rounded-card` (29), `rounded-sm` (21), `rounded-control` (11), `rounded-lg` (8), `rounded-2xl` (4), `rounded-xl` (2), plus literals `rounded-[22px]` and `rounded-[16px]` (BottomNav), `rounded-[8px]`, `rounded-[2px]`. `FeatureIntroDialog` icon uses `rounded-2xl` while every other icon chip is `rounded-full`. Fix: allow only `control` (4px), `card` (6px), `sheet` (28px), `full`; map `sm/md/lg/xl/2xl` aliases onto them in `tailwind.config.ts` so shadcn primitives inherit. Level: design token.

### DS-07 · Button size scale is unenforced and largely unused (Medium)
34/44 call sites use `size="lg"`; `compact` used once (Lists "+ new list", h-10) while ListDetail's header "+ ADD" is a hand-styled button — two visually different header actions with the same job. `default`, `xl`, `sm` are near-dead. Also `default` variant (shadcn-only, per the file's own comment) still leaks into product UI in 2 places, and `outline` in 2. Fix: reduce to `sm | md | lg | icon`; delete `xl`/`compact`; make header actions a single `PageHeader action` button preset; move `default`/`outline` behind an internal-only export name. Level: shared component.

### DS-08 · Interaction states differ between buttons and tappable rows (High, touch)
`Button` has `active:scale-[0.98]` + `focus-visible:ring-2`. `EntityRow` uses `hover:opacity-70` only — no active, no focus ring; `OptionRow` has `transition` but no focus-visible; `Lists`/`History` rows use `group-hover` reveal for the delete action, which never triggers on touch, so delete is discoverable only by accident. BottomNav uses `active:scale-95` (different amount than buttons). Fix: one `--motion-press` scale (0.98) and one focus-ring recipe applied to Button, EntityRow, OptionRow, LedgerRow, BottomNav; replace hover-revealed destructive actions with always-visible or swipe affordance (SwipeRow already exists in ScanReceipt). Level: token + shared components.

### DS-09 · Overlay family is four different systems (High)
Dialog: `bg-black/80` overlay, `rounded-card`, `p-5`, centered serif `text-h2` title, 50/50 footer. AlertDialog: matches (via ConfirmDialog). Drawer: `bg-foreground/40 backdrop-blur-sm` overlay, `rounded-t-sheet`, `p-4` header/footer, `sm:text-left` title, **vertical** stacked footer (`flex-col gap-2`) — so the same confirm pair renders 50/50 in a dialog and stacked in a drawer (6 drawers live in `ActiveTrip.tsx`). Custom fullscreen overlays (`Scanner.tsx`, `ScanReceipt.tsx` capture, `PrintedReceiptOverlay.tsx`) have their own black chrome, their own close-button sizes and their own safe-area handling. Fix: unify overlay scrim token, drawer padding to `p-5`, drawer footer to the same 50/50 row, centered title; extract `FullscreenOverlay` (safe-area header + standard close button) shared by Scanner/ScanReceipt/PrintedReceipt. Level: shared component.

### DS-10 · Overlay scrim / z-index / theme-color inconsistency (Medium)
Scrims: `bg-black/80` (dialog, alert-dialog, sheet) vs `bg-foreground/40 backdrop-blur-sm` (drawer). `FeatureIntroDialog` mutates `<meta theme-color>` to `#0a0a0a` — no other overlay does, so the status bar changes color for one modal only. Fix: `--scrim` token; move theme-color handling into the Dialog primitive or drop it.

### DS-11 · Toasts are an untouched shadcn default (Medium)
Both `Toaster` (radix) and `Sonner` are mounted in `App.tsx`; product code only calls `sonner`. Sonner keeps default radius/typography/colors — no `font-mono`, no `rounded-card`, no forest token — so success/error feedback looks foreign next to every other surface. Fix: theme Sonner via `toastOptions.classNames`, delete the unused radix Toaster mount. Level: shared component.

### DS-12 · Form controls are three unrelated families (High)
`FieldBox` + `fieldInputClass` (ListDetail add pad, ActiveTrip) vs raw shadcn `Input` (onboarding Budget/Profile, ScanReceipt review, Finance) vs `OptionRow` (onboarding) vs bespoke `Select`/`ToggleGroup` trims (`History.tsx:118` sets `h-9 rounded-card bg-surface border-hairline text-small` inline; Finance's ToggleGroup uses `variant="outline"` defaults). Heights: 44 (Button lg), 36 (Select), 28 (fieldInput), unset (raw Input). Labels: mono 9px uppercase in FieldBox, sentence-case 13px elsewhere. Fix: one `Field` primitive (label + control + error slot), one 44px control height on touch, restyle `input.tsx`/`select.tsx`/`toggle-group.tsx` defaults so no page needs inline trims. Level: shared component + token.

### DS-13 · Receipts are a parallel design system (Medium, mostly intentional)
`ReceiptView`, `YearlyReceiptView`, `PrintedReceiptOverlay`, `ReceiptPaper` use their own paper/ink hexes, their own dividers, their own type scale, duplicated `JaggedEdge`, duplicated barcode renderer (`ReceiptView:113` ≡ `YearlyReceiptView:136`) and duplicated share/export logic (`ReceiptView:188` ≡ `useReceiptShare:45`). The paper look is intentional; the duplication is not. Fix: extract `receipt/` primitives (Paper, JaggedEdge, Barcode, Row, Divider, Quote) + single `useReceiptShare`; drive colors from `--receipt-*`. Level: shared component.

### DS-14 · Navigation: Profile is a fullscreen-class page that shows the tab bar (Medium)
`AppLayout.tsx:8` treats only `/trip`, `/trip/new`, `/scan-receipt`, `/lists/:id` as fullscreen. `/profile` is reachable only from the Home header yet renders the 4-tab bar with no tab active — the bar reads as "no page selected". `/trips/:id` and `/trip/new` also differ in back-affordance (ActiveTrip has a grid header with X; TripDetail has none of the same chrome). Fix: add a `detail` layout class (tab bar hidden, standard back header) for `/profile` and `/trips/:id`; single `BackHeader` component. Needs your decision (see below). Level: page template.

### DS-15 · BottomNav uses literal radii and its own motion (Low)
`rounded-[22px]`/`rounded-[16px]`, `active:scale-95`, inline `backdropFilter` string duplicated from `.glass` utility in `index.css:190`. Fix: use `.glass`, `rounded-sheet`/`rounded-card`, shared press scale.

### DS-16 · Typography scale is bypassed (Medium)
Literals in product code: `text-[15px]` (EntityRow, fieldInput), `text-[2.25rem]` (Lists h1), `text-[9px]` (FieldBox), `text-[12px]/[13px]/[14px]` (button sizes), `text-xs/text-sm/text-base` across ScanReceipt, TripDetail, Drawer description. `.text-h3`/`.text-body` already define 15px — duplicated by hand. Fix: forbid arbitrary text sizes; extend utilities with `.text-micro` (9–11px mono) and `.text-caption`; migrate. Level: token.

### DS-17 · Dead / near-duplicate surfaces (Low)
`Index.tsx` (unreachable, hard-coded `#fcfbf8`), `NotFound.tsx` (untokenized default), radix `Toaster`, `sheet.tsx` (unused, duplicates Drawer), 22 unused shadcn primitives. Fix: delete after Phase 4 (explicitly out of scope this run).

### DS-18 · Motion values are ad-hoc (Low)
Durations 120/150/180/200/220ms and 3 different springs (`PageTransition`, `MarketLoader`, ScanReceipt `SwipeRow`, AddItemPad). Fix: `--motion-fast/base/slow` + one spring preset exported from `lib/motion.ts`.

## Remediation plan

### Phase 1 — Foundations (blocks everything)
| Task | Issues | Change | Files | Effort |
| --- | --- | --- | --- | --- |
| F1 | DS-06 | Collapse radius scale to control/card/sheet/full; alias legacy names | `index.css`, `tailwind.config.ts` | S |
| F2 | DS-05, DS-10 | Add `--scrim`, `--camera-bg/fg`, `--receipt-forest`, `--shadow-paper`; wire receipt tokens | `index.css`, `tailwind.config.ts` | M |
| F3 | DS-16 | Add `.text-micro`, `.text-caption`; document banned literals | `index.css`, `DESIGN.md` | S |
| F4 | DS-18, DS-08 | `lib/motion.ts` (durations, spring, press scale, focus ring recipe) | new file | S |
| F5 | DS-02 | Spacing tokens: gutter 20px, section gap, page top offset | `index.css` | S |

### Phase 2 — Core shared components (depends on Phase 1)
| Task | Issues | Change | Effort |
| --- | --- | --- | --- |
| C1 | DS-07, DS-08 | Rework `button.tsx` sizes/states; internal-only `default`/`outline` | M |
| C2 | DS-12 | New `Field` primitive; restyle `input/select/toggle-group/switch` defaults | L |
| C3 | DS-01, DS-02 | `PageHeader` variants + `PageShell` template | M |
| C4 | DS-14, DS-15 | `AppLayout` layout classes, `BackHeader`, BottomNav tokenization | M |
| C5 | DS-04, DS-08 | `EntityRow`/`LedgerRow`/`OptionRow` press+focus states; touch-safe row actions | M |
| C6 | DS-03, DS-04 | `Spinner`; `PageLoadGate` everywhere; EmptyState copy rules | S |

### Phase 3 — Overlays and feedback (depends on Phase 1–2)
| Task | Issues | Change | Effort |
| --- | --- | --- | --- |
| O1 | DS-09, DS-10 | Unify Dialog/AlertDialog/Drawer chrome: scrim, padding `p-5`, centered `text-h2`, 50/50 footer | M |
| O2 | DS-09 | Extract `FullscreenOverlay` (safe-area + standard close) for Scanner, ScanReceipt, PrintedReceipt | M |
| O3 | DS-11 | Theme Sonner; remove radix Toaster mount | S |
| O4 | DS-13 | `receipt/` primitives + single share hook | L |

### Phase 4 — Page migration
`/` Home (C3,C6) · `/lists` (C3,C5,C1) · `/lists/:id` (C2,C3,C5,O1) · `/finance` (C3,C2,O4) · `/history` (C3,C2,C5) · `/profile` (C3,C4,C2,C5) · `/trip` + `/trip/new` (O1,O2,C2) · `/trips/:id` (C3,C4,C6,O4) · `/scan-receipt` (O2,C2,C6) · `/onboarding/*` ×7 (C1,C2,C3) · `/auth` Signup (C1,C2) · `*` NotFound (C3).

### Phase 5 — Verification
Playwright screenshots at 393×771 and 430×932 for every route in default/empty/loading/error state; overlay matrix (each dialog, alert, drawer, fullscreen overlay open); keyboard focus-ring pass; touch-only pass confirming no hover-only affordance; reduced-motion pass; contrast check on forest-on-cream and pink/red delete button; `vitest run` + `tsgo`.

### Traceability
DS-01→C3 · DS-02→F5,C3 · DS-03→C6 · DS-04→C6 · DS-05→F2,O4 · DS-06→F1 · DS-07→C1 · DS-08→F4,C1,C5 · DS-09→O1,O2 · DS-10→F2,O1 · DS-11→O3 · DS-12→C2 · DS-13→O4 · DS-14→C4 · DS-15→F1,C4 · DS-16→F3 · DS-17→(deferred) · DS-18→F4

## Top 10 fixes
1. C3 unified page header + shell (DS-01, DS-02) — four different H1s on four tabs.
2. O1 overlay unification (DS-09) — drawer vs dialog footers.
3. C2 form-control system (DS-12) — three input families.
4. C6 loading/empty unification (DS-03, DS-04) — loader flash on TripDetail/ActiveTrip.
5. F1 radius collapse (DS-06).
6. F2 color tokens for camera/receipt chrome (DS-05).
7. C1 button scale cleanup (DS-07).
8. C5/F4 touch-safe press+focus states (DS-08) — hover-only delete on Lists/History.
9. C4 nav/layout classes incl. Profile tab bar (DS-14).
10. O4 receipt primitive extraction (DS-13).

**Quick wins:** F1, F3, F4, O3, DS-04's two one-off empty states, BottomNav tokenization.
**Consolidate:** PageHeader/Lists/Finance headers → one; Drawer footer → DialogFooter; two barcode renderers → one; two share pipelines → one; Sheet → Drawer.
**Token additions:** `--scrim`, `--camera-bg`, `--camera-fg`, `--receipt-forest`, `--shadow-paper`, `--motion-fast/base/slow`, `--press-scale`, `--page-gutter`, `.text-micro`, `.text-caption`.
**Global before local:** Phase 1 and 2 must land before any page edit, or migrations get redone.

## Decisions I need from you
1. **Case rule** — lowercase everywhere (Lists/History style) or sentence case? Today it's split down the middle.
2. **Profile & trip detail chrome** — hide the tab bar and give them a back header (my recommendation), or keep the tab bar?
3. **Header size** — `text-display` lowercase (History/Lists) as the one page title, or `text-h1` (Home/Finance)?
4. **Delete-account pink/red button** — keep as an intentional one-off, or fold into a tokenized destructive style?

## Not inspectable
Camera/barcode capture (`Scanner`, `ScanReceipt` live states) and native Capacitor keychain/permission dialogs can't render in the web preview; iOS status-bar/theme-color behavior needs a device build. Push/email templates and any error state that requires a backend failure were reasoned from code only.
