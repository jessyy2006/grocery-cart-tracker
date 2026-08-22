# Profile page hero restyle

Rebuild the profile page around a hero block (avatar + name + three stat lines), with every setting collapsed under a single "settings" header below it. No action buttons in the hero.

## Hero

```text
jessica                          (  photo  )
Jessica Young                    ( circle  )

[icon] trips logged: 42
[icon] home: +Add
[icon] favorite item: bananas
```

- Title: first name in the app's serif `text-h1` style, lowercase, left aligned.
- Sub-line: full name (or email if no name saved), muted small text.
- Avatar: circular, top-right, tappable to upload a photo from the device. Falls back to the user's initial.
- Three stat lines with small lucide icons, matching the app's body/small type scale — no cards, no borders.

### Stat lines
- **trips logged** — count of the user's saved grocery trips.
- **home** — city. Shows `+Add` when empty; tapping opens a search field with autocomplete over a bundled world-city list (offline, instant). Saved to the user's profile.
- **favorite item** — name only of the grocery item with the highest total quantity across all trips. Hidden/omitted gracefully when there is no data yet.

## Settings

One section header ("settings", styled as the existing mono eyebrow) containing the current hairline-divider rows:
- Display currency
- Duplicate item alerts
- My stores list stays below as its own section (unchanged behaviour), and the sign-out button stays pinned at the bottom.

## Technical notes

- **Avatar storage**: new private `avatars` bucket; upload path `<user_id>/avatar.<ext>`, RLS policies scoped to the owner's folder for select/insert/update/delete. Signed URL used for display.
- **Schema**: add `avatar_url text` and `city text` to `public.profiles` (nullable, no data migration needed). Existing owner-scoped RLS already covers them.
- **City data**: a bundled `src/lib/cities.ts` list (city + region/country strings, ~1–2k entries) with a simple prefix/substring matcher; no network calls, no API cost.
- **Favorite item**: aggregate `trip_items.name_snapshot` by `sum(qty)` for the user's trips, normalised case-insensitively, take the top name. Single query on page load.
- Reuses existing tokens only — `text-h1`, `text-eyebrow`, `text-small`, `border-hairline`, `rounded-card`. No hardcoded colors.
