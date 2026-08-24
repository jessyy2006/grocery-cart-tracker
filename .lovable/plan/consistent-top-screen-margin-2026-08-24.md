# Consistent top screen margin

## The standard

"Monday market run?" on Home sits at **safe-area top + 20px** (page wrapper `pt-3` = 12px, plus header `pt-2` = 8px). That becomes the one rule for every in-app screen.

## What's already correct

- Home, Lists, Finance, History — all land on safe-area + 20px.

## What's off and gets fixed


| Screen                             | Today                                       | Fix                                          |
| ---------------------------------- | ------------------------------------------- | -------------------------------------------- |
| Profile                            | 12px (hero header has no extra top padding) | add the missing 8px so the name sits at 20px |
| Live grocery run (ActiveTrip)      | 16px above the header row                   | change to 20px                               |
| List detail                        | 12px above the back arrow                   | change to 20px                               |
| Scan receipt — confirm/manual step | 24px                                        | change to 20px                               |


All of these already respect the iOS safe area, so the change is purely the extra offset below it.

## Exceptions I want your approval on

These two I'd leave alone, because matching them to 20px would hurt them:

1. **Camera capture overlays** (barcode scanner, receipt capture). These are full-bleed camera views where the close button uses `max(safe-area, 12px)` — a floating control over video, not a page header. Forcing 20px pushes the X further into the frame and there is no header to align with.
2. **Onboarding screens** (intro / signup / step layout). These are intentionally centred or extra-airy pre-app screens, not tabbed app pages.

If you'd rather I normalise either of those to 20px too, say so and I'll include them. DO NOT NORMALIZE TO 20PX, keep as is. 

## Technical notes

- No layout logic or data changes — only top-padding classes in `Profile.tsx`, `ActiveTrip.tsx`, `ListDetail.tsx`, `ScanReceipt.tsx`.
- Fullscreen pages keep their own `safe-top`; `AppLayout` keeps applying `safe-top` for tabbed pages.