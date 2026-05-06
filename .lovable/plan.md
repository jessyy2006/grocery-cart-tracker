## Goal

Make the "Duplicate item" alert visually match the other modals in the app (e.g. `Add item`, `FeatureIntroDialog`) — rounded, subtle borders, no harsh white card, no thick colored borders — and use the existing semantic color tokens (`destructive` for the danger action, `success` for the safe action) instead of ad-hoc reds/greens.

## What's wrong today

In `src/pages/ListDetail.tsx` (lines 361–382) the duplicate prompt:

- Uses `AlertDialog`, which has square corners (`sm:rounded-lg`) and plain `bg-background` — clashing with the other dialogs that use `rounded-2xl` `Dialog`.
- Has a loud `border-destructive/40` outline + red title.
- Uses raw `bg-destructive` on the confirm button and the default outline on Cancel — neither matches the green/red tokens used elsewhere.
- Footer is right-aligned row; the rest of the app uses full-width stacked buttons in modals (see `FeatureIntroDialog`, `Add item`).

## New design

Reuse the regular `Dialog` component (already imported) so it inherits the same rounded-2xl, soft-border, centered look as `Add item`:

```text
┌──────────────────────────────┐
│         Duplicate item       │   ← DialogTitle (default foreground, centered)
│                              │
│  Heads up — this item is     │   ← DialogDescription (muted)
│  already on your list. Add   │
│     anyway?                  │
│                              │
│  ┌────────────────────────┐  │
│  │      Yes, add it       │  │   ← destructive, full width, lg
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │          No            │  │   ← success, full width, lg
│  └────────────────────────┘  │
└──────────────────────────────┘
```

- Container: standard `DialogContent` (rounded-2xl, `bg-background`, subtle border — already styled).
- Header: centered title + description, matching `FeatureIntroDialog`.
- Buttons: stacked, full-width, `size="lg"`, `rounded-xl`. Primary danger uses `bg-destructive text-destructive-foreground`; safe choice uses `bg-success text-success-foreground` (tokens already defined in `src/index.css` and `tailwind.config.ts`). The safe "No" stays visually dominant by being the second/closer-to-thumb button — matching the screenshot intent — but both share equal weight.
- No red title text, no red outer border — keeps the minimal aesthetic.

## Implementation (single file, scoped change)

Edit only `src/pages/ListDetail.tsx`, lines ~361–382. Replace the `AlertDialog` block with a `Dialog` block. No changes to `addItem`, `performAdd`, `dupOpen` state, or any other logic.

```tsx
<Dialog open={dupOpen} onOpenChange={setDupOpen}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle className="text-center">Duplicate item</DialogTitle>
      <DialogDescription className="text-center">
        Heads up — this item is already on your list. Add it anyway?
      </DialogDescription>
    </DialogHeader>
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        variant="destructive"
        className="w-full rounded-xl"
        onClick={() => { setDupOpen(false); void performAdd(); }}
      >
        Yes, add it
      </Button>
      <Button
        size="lg"
        className="w-full rounded-xl bg-success text-success-foreground hover:bg-success/90"
        onClick={() => setDupOpen(false)}
      >
        No
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

Then remove the now-unused `AlertDialog*` imports (lines 19–26) since they aren't used elsewhere in the file.

## Out of scope / untouched

- Duplicate-detection logic in `addItem`/`performAdd`.
- `getDuplicateAlerts` / `normalizeItemName` / Profile toggle.
- Any other dialog in the app.

## Risks

- Minor: `AlertDialog` traps focus slightly differently than `Dialog`, but since this is a simple confirm with two buttons and no destructive auto-dismiss requirement, `Dialog` is fine. The "X" close icon on `Dialog` will appear — equivalent to "Cancel/No", which is acceptable and consistent with `Add item`.