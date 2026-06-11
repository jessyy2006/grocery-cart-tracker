# Lists as untouched templates + cleaner list cards

## Problem

1. **Lists get "consumed" by trips.** `ActiveTrip.tsx` writes `checked_at`, `price_cents`, `qty`, `name`, and `barcode` directly back onto rows in `shopping_list_items`. So after a trip ends, the source list shows every item struck through, with trip prices baked in. Returning to the list to reuse it is impossible.
2. **List cards show "9 picked".** `Lists.tsx` derives `done` from `checked_at` on list items and appends `· {done} picked` to the eyebrow. Even if (1) is fixed, this label is wrong — a list is a template, not a progress bar.

## Fix overview

Introduce a trip-scoped snapshot of the list so the trip has its own mutable copy. The original `shopping_list_items` rows are never written to during a trip. Then strip the "picked" suffix from list cards.

## 1. New table: `trip_planned_items`

One row per list item, copied at trip start. This is what the live trip checks off, prices, and renames — not the source list.

Columns:

- `id`, `trip_id` (FK → trips, cascade)
- `source_list_item_id` (nullable FK → shopping_list_items, set null on delete — purely informational)
- `name`, `qty`, `category`, `notes`, `tag`, `barcode` — snapshotted at trip start
- `price_cents` (nullable), `checked_at` (nullable) — mutated during the trip
- `created_at`

RLS: user owns row via `trip_id → trips.user_id`. Standard GRANTs to `authenticated` + `service_role`.

## 2. Snapshot at trip start

In `src/pages/StartTrip.tsx`, immediately after inserting the new trip, if `list_id` is set, copy every row from `shopping_list_items` where `list_id = X` into `trip_planned_items` for the new trip (name, qty, category, notes, tag, barcode copied; `price_cents` and `checked_at` left null). The hidden "Free trip" list flow is unchanged — its list starts empty, so the snapshot is empty and items will be added during the trip as today.

## 3. Rework `ActiveTrip.tsx` to read/write the snapshot

Everywhere it currently touches `shopping_list_items` for the live trip, point at `trip_planned_items` instead. Concretely:

- `listItems` state now holds `trip_planned_items` rows (same shape, just different source).
- Load query: `from("trip_planned_items").eq("trip_id", tripId)` (drop the list query).
- `uncheckListItem`, `confirmManualCheck`, `handleMatchOrExtra` (the planned-list check-off branch), `confirmAsSubstitute`, free-shop insert branch — all switch to `trip_planned_items`.
- Receipt builder is unchanged in shape; it just reads from the snapshot rows.
- `listName` is still loaded from `shopping_lists` (display only).
- `listHidden` logic for free-shop mode still consulted; free-shop inserts of new items now go to `trip_planned_items` (not the hidden list).

`shopping_list_items` is never written to during a trip. The hidden free-trip list can stay as the "owning" record (or we drop the hidden-list creation entirely later — out of scope here).

## 4. `ListDetail.tsx` shows the pristine list

Today it reads from `shopping_list_items`, which is correct. Once writes stop, it will naturally show the original, nothing crossed off, no trip prices. One small UI cleanup:

- The price column (`it.price_cents`) shown next to items in `ListDetail` is a leftover of the bug — list items shouldn't carry a price anymore. Hide the price element here. (We don't migrate existing data, just stop rendering it; old rows can be cleared lazily or left alone.)
- `done/total` counter in the header (`9/9`) should become just `9 items` — there's no "done" concept on a template list.
- Remove the `runActive` toggle gate on `toggle()` and the toggle UI entirely from this page (checking off is a trip-only action, not a list action). Items render as plain rows with edit/delete only.

## 5. `Lists.tsx` card label

Change line 93-96 from:

```text
{total} items · {done} picked
```

to simply:

```text
{total} items   (or "Empty list" when 0)
```

Drop the `done` calculation and the `shopping_list_items(id, checked_at)` join can become `shopping_list_items(id)` (count only).

## Out of scope

- Backfilling/cleaning the `checked_at` / `price_cents` already written onto existing `shopping_list_items` rows from past trips. We can either run a one-shot cleanup `UPDATE` (happy to add) or just let the new code ignore them. I'd suggest a one-shot cleanup as part of the same migration — confirm if you want that included.
- Changing `TripDetail` / `Finance` receipt history — those read from `trip_items`, untouched.
- Removing the hidden "Free trip" list mechanism.

## Files touched

- new migration: `trip_planned_items` table + RLS + GRANTs (+ optional cleanup `UPDATE shopping_list_items SET checked_at = null, price_cents = null`)
- `src/pages/StartTrip.tsx` — snapshot on trip create
- `src/pages/ActiveTrip.tsx` — repoint all list-item reads/writes to `trip_planned_items`
- `src/pages/ListDetail.tsx` — drop check-off UI, hide price, simplify header counter
- `src/pages/Lists.tsx` — drop "X picked"

## One question before I build

Should the migration also run a one-time cleanup to clear `checked_at` and `price_cents` on existing `shopping_list_items` so your current lists immediately look fresh? Answer: YES.