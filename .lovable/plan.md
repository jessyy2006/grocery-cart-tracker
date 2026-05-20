## Scope

Two features, shipped together:

1. **Per-list item tags** (one tag per item, grouped display)
2. **Substitute item flow** during live trips (replaces "extra" decision with a 2-choice modal)

---

## 1. Item Tags

### Data model

Add one nullable column — no separate tag table needed since tags are per-list and "create inline" means the tag set is just the distinct values used.

```sql
-- UP
ALTER TABLE public.shopping_list_items ADD COLUMN tag text;
CREATE INDEX idx_shopping_list_items_list_tag ON public.shopping_list_items (list_id, tag);
-- DOWN
DROP INDEX IF EXISTS idx_shopping_list_items_list_tag;
ALTER TABLE public.shopping_list_items DROP COLUMN tag;
```

Tag suggestions per list = `SELECT DISTINCT tag FROM shopping_list_items WHERE list_id = ? AND tag IS NOT NULL`.

### UI

- New `TagPill` component: rounded-full, muted bg, color derived from `hash(tagName) % palette[N]` (palette defined in `index.css` as semantic muted tokens — e.g. `--tag-1` through `--tag-6`, all HSL).
- Add-item modal (`ListDetail.tsx` + same modal in `ActiveTrip.tsx` if present): tag selector below name. Combobox-style: shows existing tags as pills, free-text input creates a new one on Enter. Single-select; selecting a second replaces the first. "Clear tag" option.
- Edit-item modal: same control.

### Grouping

category stay as the primary group and tag be a secondary chip users can toggle to sort by.

- `src/pages/ListDetail.tsx` (`grouped` memo)
- `src/pages/ActiveTrip.tsx` (planned-items list rendering)

Group order: tags sorted by first-use (creation order of first item in group) → `OTHER` (untagged) last. Category emoji still shown per-item as a small inline marker; tag becomes the section header.

---

## 2. Substitute Flow

### Data model

```sql
-- UP
ALTER TABLE public.trip_items
  ADD COLUMN substitutes_list_item_id uuid REFERENCES public.shopping_list_items(id) ON DELETE SET NULL;
CREATE INDEX idx_trip_items_substitutes ON public.trip_items (substitutes_list_item_id);
-- DOWN
DROP INDEX IF EXISTS idx_trip_items_substitutes;
ALTER TABLE public.trip_items DROP COLUMN substitutes_list_item_id;
```

Semantics:

- `substitutes_list_item_id IS NULL` + item not matched to list → **extra/impulse** (unchanged)
- `substitutes_list_item_id IS NOT NULL` → **substitute** (fulfills planned item, NOT extra, NOT impulse)
- Matched-by-barcode/name to a list item → **planned** (unchanged)

### Flow change in `ActiveTrip.tsx`

Current `handleMatchOrExtra` auto-adds unmatched items to Extras. New behavior:

1. Unmatched item → open `OffListModal` with two CTAs: **Add as Extra** / **Mark as Substitute**.
2. **Add as Extra** → current extras path.
3. **Mark as Substitute** → open `SubstitutePickerModal`:
  - Searchable list of unchecked planned items (filtered client-side).
  - On select: insert trip_item with `substitutes_list_item_id = planned.id`, qty/price = scanned/entered values, then mark planned item `checked_at = now()`.
  - UI shows the substituted item under its planned tag/group with a small "↔ substitute" label.

### Finance impact (`src/pages/Finance.tsx`)

Update `isExtra(it, list)` to also return `false` when `it.substitutes_list_item_id` is set. That alone fixes impulse rate, extras spend, and the impulse insight — no other changes needed.

---

## File changes

- `supabase/migrations/*` — one migration with both schema changes
- `src/integrations/supabase/types.ts` — auto-regenerated
- `src/lib/tagColor.ts` (new) — hash → semantic token
- `src/components/TagPill.tsx` (new)
- `src/components/TagSelector.tsx` (new) — combobox used in add/edit modals
- `src/index.css` — add `--tag-1..6` HSL tokens
- `src/pages/ListDetail.tsx` — modal wiring, grouping by tag
- `src/pages/ActiveTrip.tsx` — modal wiring, grouping, off-list modal, substitute picker, persist `substitutes_list_item_id`
- `src/pages/Finance.tsx` — exclude substitutes from `isExtra`

No changes to RLS (inherits via existing list_id / trip_id policies).

---

## Risks / notes

- **Existing data**: `tag` defaults NULL → all current items land in "OTHER" until tagged. Acceptable.
- **Substitute deletion**: if user deletes the substitute trip_item, the planned item stays checked. Add a small rollback: on delete of a substitute trip_item, set its planned item `checked_at = null`. Cheap to do client-side.
- **History/TripDetail view**: substitute label should also surface there for clarity. I'll add a minimal "↔" badge — low effort, prevents confusion in receipts.

---

## Open question before I build

**Tag vs category grouping** — confirm full replacement (tag becomes the primary grouping, category becomes a per-item emoji only). If you want both, say "keep category groups, tag is secondary chip" and I'll adjust.

Once you confirm, I'll run the migration, wait for approval, then ship the code in one pass.