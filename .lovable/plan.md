# Match list rows to history rows

Restyle the rows on **your lists** so they read exactly like the "previous runs" rows on the history page, and change the timestamp format.

## Row styling

- Same typography as history: list name at 15px, lowercase, normal weight; the line below at 13px lowercase in muted grey.
- Same vertical rhythm (20px top/bottom per row) and the same dashed hairline divider between rows instead of the current solid one.
- Drop the mixed serif-italic / mono treatment currently used for "N items · updated ...".
- Subline format matches the screenshot: `date · N items` (e.g. `tuesday · 5 items`).
- No price on the right (lists have no total). The delete action stays as it is today, revealed on row hover/press.

## Timestamp rules

Based on the list's last-edited time, in the user's local time:

- Edited today → time only, e.g. `11:36 pm`
- Edited within the last 7 days → weekday name, e.g. `tuesday`
- Older than 7 days → `yyyy-mm-dd`

## Technical notes

- `src/pages/Lists.tsx`: replace the `EntityList`/`EntityRow` usage with a row that mirrors `src/components/trip/TripTapeRow.tsx` markup (same classes, no `Money`), keeping the `ConfirmDialog` delete trigger absolutely positioned at the right.
- Add a small `formatListTimestamp(iso)` helper (date-fns `isToday`, `differenceInCalendarDays`, `format`) — placed in `src/lib/format.ts` so it can be reused.
- Presentation only; no data or query changes.
