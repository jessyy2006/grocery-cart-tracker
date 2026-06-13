## Restyle List Detail page

Single file affected: `src/pages/ListDetail.tsx` (plus a small tweak to `src/components/LedgerRow.tsx` for note spacing).

### 1. Header

- Remove the sticky `glass` header bar with bottom border (no divider between header and list).
- Keep a minimal back arrow above the title (small, borderless, no background bar) — clicking returns to `/lists`.
- Below the back arrow, a left-aligned block:
  - **Title**: list name, large display weight (matches screenshot's `W1 List` styling — use existing `text-h1`/display font). Click the title to enter inline edit mode.
  - **Subtitle**: `{items.length} items` in muted small text (e.g. `text-small text-muted-foreground`).
- Right side of the title row: a `+ ADD` button (outline/ghost, small, uppercase mono to match the screenshot's chip style) that opens the existing Add-item dialog.
- Remove the "Shopping list" eyebrow entirely.
- Remove the top-right item-count number (subtitle now shows the count).

### 2. Inline rename

- Clicking the title swaps it for an `Input` of the same size, plus explicit Save (check) icon next to it. 
- Save commits to Supabase (`shopping_lists.name`) and exits edit mode; clicking off of the title reverts their changes.
- Delete the existing `renameOpen` Dialog and related state.

### 3. Add-item modal collapse affordance

- Add a small chevron-down "collapse" icon button in the Add-item card that already appears at the bottom of the screen when user clicks the new "add item" button.

### 4. Footer / bottom area

- Remove the existing `QuickAddRow` row above the start-grocery-run footer (per user: replaced by the new header `+ ADD` button).
- Keep the `start grocery run` footer button exactly where it is.

### 5. Spacing

- Match screenshot rhythm: generous top padding under title, ~24px gap before the `group by:` row, ~24px before the first category heading, hairline divider under category heading already present.
- In `LedgerRow`, tighten the gap between item name and the note line (`fresh, 2 leaves`) — reduce from current spacing to ~2px (e.g. `mt-0.5` instead of `mt-1`/`mt-1.5`).

### 6. Cleanup

- Remove unused imports (`Pencil`, `DialogDescription` if no longer used, rename state, `QuickAddRow` import).

### Technical notes

- No schema changes. No new routes.
- Inline edit state: reuse local state (`editingName: boolean`, `nameDraft: string`); on Save, run the same Supabase update currently in `renameOpen` flow and toast on error.
- Header is non-sticky now; the page already scrolls inside the inner flex container, so removing the sticky bar is purely visual.
- `+ ADD` button styling: small height (`h-8`), outline border, uppercase mono text (`font-mono text-[11px] tracking-[0.14em]`), `+` icon left — matches the screenshot's pill.

### Out of scope

- No changes to LedgerRow behavior, QuickAdd logic (just removed from render), trips, or data model.
- No changes to other pages or the design tokens.

### Risks / rollback

- Low risk; pure UI. Rollback = revert `ListDetail.tsx` + `LedgerRow.tsx`.