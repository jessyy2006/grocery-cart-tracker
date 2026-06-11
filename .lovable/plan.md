# Unify primary button styling

## Goal

Collapse the app's many ad-hoc primary buttons into exactly **two** canonical styles, matching the reference screenshots, and apply them consistently.

## The two canonical styles

**primary-light** (reference: `+ new list` on Lists)

- Solid `bg-forest` / `text-forest-foreground`
- `font-mono`, lowercase, `tracking-tight`, **not** bold (mono regular)
- `rounded-[4px]`
- Hover: `opacity-90`
- Sizes: `lg` = `h-12 px-5 text-[14px]` (full-width CTAs), `sm` = `h-10 px-4 text-[12px]` (inline header buttons)

**primary-dark** (reference: `scan barcode` on ActiveTrip footer)

- Transparent background with `border border-forest-foreground`, `text-forest-foreground`
- `font-mono`, lowercase, `tracking-wide`, `rounded-[4px]`
- Hover: `bg-forest-foreground/5`
- Sizes: same `lg` / `sm` scale
- Used only on dark `forest` surfaces

## Implementation

### 1. Add variants to `src/components/ui/button.tsx`

Add `primaryLight` and `primaryDark` to `buttonVariants` cva, plus `compact` size token (h-10, px-4, text-[12px]). Keep existing variants for non-primary uses (ghost, outline, destructive, secondary). The old `hero` and `default` variants are no longer used for primary CTAs but stay available to avoid breakage in any third-party flows; we replace all current call sites.

### 2. Replace call sites. make sure that each button's RELATIVE SIZE is still the same so there is no container overflow etc. 


| File                                                                      | Current                                 | New                                                                                        |
| ------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/pages/Lists.tsx` L77-81                                              | bare `<button>` `+ new list`            | `<Button variant="primaryLight" size="compact">` (reference — visual identical)            |
| `src/pages/ActiveTrip.tsx` L886-893                                       | bare `<button>` scan barcode            | `<Button variant="primaryDark" size="lg">` (reference — visual identical)                  |
| `src/pages/Home.tsx` L185-190                                             | bare `<button>` `[ start a live trip ]` | `<Button variant="primaryLight" size="lg">` label → `start a live trip` (brackets dropped) |
| `src/pages/ListDetail.tsx` L384-390                                       | `<Button>` start grocery run            | `variant="primaryLight" size="lg"` (drop custom className)                                 |
| `src/pages/ListDetail.tsx` L448 (Add item modal confirm)                  | default `<Button>`                      | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/ListDetail.tsx` L516 (Edit item Save)                          | default `<Button>`                      | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/Lists.tsx` L153 (Create list modal)                            | `variant="hero"`                        | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/ActiveTrip.tsx` L978 (Add as substitute confirm)               | default `<Button>`                      | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/ActiveTrip.tsx` L1025 (manual check confirm)                   | default `<Button>`                      | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/ActiveTrip.tsx` L737 (Exit trip AlertDialogAction)             | custom transparent                      | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/ScanReceipt.tsx` L439 (Parse) and L617 (Save)                  | default `<Button>`                      | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/Finance.tsx` L495 (Save budget), L530 (Set budget), L723 (CTA) | default `<Button>`                      | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/onboarding/Layout.tsx` L74 (Continue)                          | default `<Button size="lg">`            | `variant="primaryLight" size="lg"` (cascades to all onboarding steps)                      |
| `src/pages/onboarding/Signup.tsx` L171 (Sign up submit)                   | default                                 | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/onboarding/Intro.tsx` L71                                      | default                                 | `variant="primaryLight" size="lg"`                                                         |
| `src/pages/onboarding/FirstList.tsx` L260, L347 (modal confirms)          | default                                 | `variant="primaryLight" size="lg"`                                                         |
| `src/components/FeatureIntroDialog.tsx` L40 (Got it)                      | default                                 | `variant="primaryLight" size="lg"`                                                         |


### 3. Out of scope (intentionally NOT changed)

- Destructive confirms (Delete, AlertDialog destructive actions) — stay `variant="destructive"`.
- Cancel / secondary / ghost buttons in modals — unchanged.
- Sign out (`Profile.tsx` outline) — unchanged.
- Icon-only buttons (edit budget pencil, scanner close, FAB, bottom nav) — unchanged.
- The Onboarding progress bar's primary color tokens — unchanged.

## Risks

- Onboarding Continue button restyle cascades to all 7 steps — verify visually after build.
- AlertDialogAction in the Exit modal uses a different primitive; passing `className={buttonVariants(...)}` keeps it visually correct since it's not a `<Button>` component.
- Any future contributor must use these two variants only; we'll add a one-line comment in `button.tsx` documenting that `primaryLight` / `primaryDark` are the only canonical primaries.

## Verification

- Build succeeds.
- Visually spot-check: Lists, Home, ListDetail, ActiveTrip (footer + all modals), Finance budget modal, ScanReceipt, every onboarding step, FeatureIntroDialog.