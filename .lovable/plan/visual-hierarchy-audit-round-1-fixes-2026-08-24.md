# Visual-hierarchy audit — round 1 fixes

Scope: VH-02, 03, 04, 06, 08, 09, 10, 11, 15, 16, 17. Onboarding (VH-07, 12, 13, 14) is out of scope. VH-05 (end trip prominence) is parked — options saved below, no code change this round.

## Trip detail (VH-02, VH-03, VH-06)

- Title stays centered at 34px with the eyebrow above it — no change, confirming the audit's left-align suggestion is rejected.
- Header: `TripDetail` already renders a bare `BackHeader` (chevron only) and the tab bar is already hidden for `/trips/:id` in `AppLayout`. Verify on device and leave as-is; no code change unless the render shows otherwise.
- "Shop from this list" pill becomes a sanctioned `Button variant="primaryLight"` (card radius, standard font/casing) and gets ≥16px clearance from the receipt's bottom edge instead of overlapping its shadow.

## Destructive action ranking (VH-04)

Make the footer contract explicit and apply it everywhere, not just the exit-trip dialog:
- Destructive confirm → recessive variant (`destructiveSoft`/outline), **left**.
- Safe cancel → solid, **right**.
- Audit and update every AlertDialog/Dialog confirm: exit trip, delete list, delete item, delete account, discard scanned receipt.
- Add a small unit test asserting order + variant for the shared footer.

## Fixed-chrome clearance (VH-08, VH-09)

- Add a `--nav-clearance` token = tab-bar height + safe-area + 16px; `AppLayout` uses it instead of the hard-coded `pb-24`. Applies to finance, history, lists, home.
- `ListDetail`: the scroll container's bottom padding accounts for the measured footer height + safe area so the last row clears the "start grocery run" bar.

## Item name wrapping (VH-10)

`LedgerRow` name allows two-line wrap (`line-clamp-2`, break-words) with qty and price staying on their own right rail. Covers list detail, active trip planned rows, and scan-receipt review since they share the row.

## Active trip empty state (VH-11)

No action slot. Copy only: description becomes "add item to cart to start tracking". Keeps the footer as the single action surface.

## Loading states (VH-15)

Standardize on `Spinner` as the single in-flight indicator. `PageLoadGate` renders a centered `Spinner` (200ms gate) instead of `MarketLoader`; the bare spinner on `/trip/new` and the inline scan-receipt spinner adopt the same component and sizing. `MarketLoader` is retired once its last call site is gone.

## Finance chips (VH-16)

Only these four changes to that cluster:
1. Chip corners use the hero-card radius (`rounded-card`, 6px) — applied to the shared toggle/chip styling so all chips of that family match.
2. `Target` icon → `DollarSign`.
3. The budget button becomes the exact same chip shape and size as the receipt/grid chips (same height, width, radius, border).
4. Its pressed/active fill box matches the chip fill box exactly — no larger hit-fill.

Nothing else in the finance header changes (icons stay unlabeled).

## Finance "vs last" stat (VH-17)

Subtitle becomes `[over|under] vs [prev month]`, e.g. "over vs july" / "under vs july", replacing the bold red SAVED/OVER meta. Value keeps its arrow and color; weight drops to match sibling stats.

## Parked — VH-05 end trip options (for later)

1. Swap: "end trip" full-width solid in the tray, "scan barcode" demoted to secondary.
2. 50/50 row: scan barcode (secondary) left, end trip (primary) right.
3. Total bar as CTA: the cart-total block becomes "end trip · $42.10".
4. Progress-aware: footer promotes end trip to primary once items are checked.

## Technical notes

- Touches: `src/pages/TripDetail.tsx`, `src/pages/Finance.tsx`, `src/pages/ActiveTrip.tsx`, `src/pages/ListDetail.tsx`, `src/components/LedgerRow.tsx`, `src/components/PageLoadGate.tsx`, `src/components/AppLayout.tsx`, `src/components/ui/toggle.tsx`, `src/index.css` (`--nav-clearance`).
- No data, query, or business-logic changes.
