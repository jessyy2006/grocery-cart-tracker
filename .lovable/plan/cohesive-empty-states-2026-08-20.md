# Cohesive Empty States

One primitive, one voice, page-level only. Lucide icon + lowercase title + plain practical description + optional CTA.

## The component

Extend `src/components/EmptyState.tsx` (no new component):

- `size`: `page` (default, `py-16`) and `section` (`py-8`) so in-page sections (Home recent trips, Finance insights) sit tighter than a full-page blank.
- Everything else stays as-is: optional `icon`, `title`, `description`, `action`, `className`.
- Rules kept: centered, lowercase title (`text-h3`), `text-small text-muted-foreground` description capped at 32ch, CTA is a `primaryLight` button.

## Where empty states go (icon · title · description · CTA)

| Screen | Icon | Title | Description | CTA |
|---|---|---|---|---|
| Lists — no lists | `ClipboardList` | no lists yet | Create a list to plan your next grocery run. | + new list |
| Lists — all hidden/archived (edge) | `ClipboardList` | nothing here | Your lists are all archived. | — |
| List detail — no items | `ListPlus` | no items yet | Tap "+ add" to add your first one. | — (pad is right there) |
| Home — no recent trips | `Receipt` | no trips yet | Your saved trips will show up here. | start a trip |
| History — no trips at all | `Clock` | no saved trips yet | Finish a grocery run and it lands here. | start a trip |
| History — none in selected month | `Clock` | no trips this month | Pick another month to see past runs. | — |
| Finance — no budget set | `Wallet` | set your monthly budget | Track how much you have left to spend on groceries. | set budget |
| Finance — budget set, no trips | `Receipt` | no trips yet | Save a grocery run to see your spending. | start a trip |
| Finance — receipt view, no data for period | `ScrollText` | nothing to print yet | No trips recorded for this period. | — |
| Active trip — no list linked | `ShoppingCart` | nothing in the cart | Scan or add items as you shop — we'll sort them by category. | — |
| Trip detail — trip saved with no items (edge) | `Receipt` | no items on this trip | Nothing was recorded during this run. | — |

Copy is plain and practical throughout; titles lowercase, descriptions sentence case, one sentence each.

## Consistency rules applied

- Only one CTA per empty state, and only when the action can be taken from that screen.
- Same icon per concept everywhere (trips = `Receipt`, history = `Clock`, lists = `ClipboardList`, money = `Wallet`, cart = `ShoppingCart`).
- Icon `h-8 w-8 text-muted-foreground`, no color, no illustration.
- Empty states render inside `PageLoadGate`, so a loading page never flashes an empty state.

## Technical notes

- `src/components/EmptyState.tsx`: add the `size` variant.
- Adopt/adjust call sites: `Lists.tsx`, `ListDetail.tsx`, `Home.tsx`, `History.tsx`, `Finance.tsx` (three states), `ActiveTrip.tsx` (replace the bare `<p>`), `TripDetail.tsx` (add the empty case if missing).
- Out of scope per your call: drawer/inline strings (store picker "no matches", scan-receipt "no items detected", profile "my stores", onboarding first-list) stay as they are.
- Update DESIGN.md §Empty states with the table above so future screens reuse it.
