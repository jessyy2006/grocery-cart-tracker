# Detail-route header contract + exit affordance

Scope: three targeted changes from the visual-hierarchy audit. Onboarding is explicitly out of scope for this and all following tasks. The "end trip" prominence work is deferred and will be the next task.

## 1. List detail adopts the Phase-4 header contract

`src/pages/ListDetail.tsx` currently hand-rolls its header: a raw `font-display text-h1` title with `truncate`, no back affordance, and the bottom tab bar still visible.

- Add a `BackHeader` at the top of the page, matching Profile and Trip detail.
- Hide the bottom tab bar on `/lists/:id` (it is already treated as a fullscreen route in `AppLayout`; move it into the detail bucket so it gets the standard detail shell instead).
- Title becomes the standard 36px lowercase display treatment with wrapping (`text-balance break-words`) instead of `truncate`, so long list names read fully.
- Subtitle stays "X items" under the title.
- Inline rename keeps working: tapping the title swaps in the input, which inherits the same display size.

## 2. Trip detail title

`src/pages/TripDetail.tsx` stays centered as it is today, but the title moves from `text-h1` (28px) to 34px so it carries the same weight as other detail routes while keeping the receipt's symmetric composition. The date eyebrow above it is unchanged.

## 3. Exit run moves to the top-left

In `src/pages/ActiveTrip.tsx` the exit "✕" sits top-right today. Move it to the left cell of the header grid (standard iOS dismiss position, out of the thumb path), leaving the right cell as the spacer. Tap target grows to 44x44 with the existing `press`/`focus-ring` utilities.

Also fix the exit dialog's action ranking while we are in it: "Exit" is currently the solid primary on the left and "No, go back" is secondary. Swap so the safe action is primary/right and the destructive exit is the recessive/left action. Copy stays the same.

## Deferred

"Make end trip more prominent" — I'll come back to you with concrete options and implement it as the next task.

## Technical notes

- `AppLayout.tsx`: `isListDetail` moves from the `fullscreen` bucket to `detail`, so the list page gets the page shell + back header and no tab bar. Footer clearance on the list page needs re-checking after the switch since it currently owns its own scroll container.
- No data, query, or business-logic changes in any of the three items.
