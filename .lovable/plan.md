# Plan: Expanding Add-Item Footer Pad

Replace the current `+ ADD` modal on `src/pages/ListDetail.tsx` with an inline pad that slides up above the bottom CTA. No backdrop, list stays scrollable.

## Scope
- File: `src/pages/ListDetail.tsx` only.
- New small component: `AddItemPad` (same file or sibling — TBD during build).
- No DB schema changes. `tag` stays a single string.

## Behavior

1. **Trigger** — Tapping `+ ADD` in the title row toggles `addOpen`. Remove the `<Dialog>` for Add (keep Edit + Duplicate dialogs).
2. **Animation** — Pad mounts above the footer CTA; height/opacity transition (`framer-motion` `AnimatePresence` with `height: auto` + fade, ~200ms ease-out). Slides up, list above remains visible & scrollable.
3. **Dismiss** — (a) chevron-down handle (grey pill) at the top of the pad, (b) tap outside the pad on the list area. Tapping inside the pad never dismisses.
4. **CTA morph** — While `addOpen`: bottom button label becomes `ADD TO LIST`, calls `addItem()`, disabled when name empty. When closed: reverts to `start grocery run` exactly as today.

## Pad layout (per screenshot)

```
┌──────────── handle ────────────┐
│ ITEM NAME*                     │  ← eyebrow label, mono 9-10px, taupe
│ e.g. Greek Yogurt              │  ← borderless input, italic placeholder
├──────┬─────────────────────────┤
│ QTY  │ NOTE (OPTIONAL)         │  ← two cells, 1px hairline borders
│  1   │ Add details...          │     QTY ~15% width, light taupe bg
└──────┴─────────────────────────┘
  TAGS: <chip> <chip>          +    ← morphing tag row
```

- Inputs use existing hairline border tokens; no shadcn Card.
- Category: auto-detected silently from name (existing `guessCategory`). Add a tiny tappable category chip at the right edge of the QTY row showing `{emoji} {label}` — tap opens a small popover/select to override (re-use existing `Select` styled as a chip-sized trigger). Sets `autoCat=false` on override.

## Morphing tag row

- State: `tagEditing: boolean`, `tagDraft: string`. `tag` remains single value.
- **Empty display**: `TAGS:` label + placeholder `Type to add tag...` (taupe, mono 9px), `+` icon far right.
- **Active display**: `TAGS:` + one chip (1px `#143F2D` border, `#143F2D` text, mono). `+` icon at far right swaps the existing chip out when user enters input mode.
- **Input mode**: Tap placeholder or `+` → chip hides, full-width borderless mono input expands inside the row (fixed row height to prevent layout shift), auto-focus. Enter/Space commits → sets `tag`, exits input mode. Escape or blur with empty → exits.

## CTA wiring

```tsx
<Button onClick={addOpen ? addItem : startRun} disabled={addOpen && !name.trim()}>
  {addOpen ? "Add to list" : "Start grocery run"}
</Button>
```

Existing `addItem()` duplicate-check + `performAdd()` flow stays; on success it already clears state — also call `setAddOpen(false)` (already does).

## Outside-tap dismissal

Attach a click handler to the scrollable list container (`scrollRef`) that closes the pad if `addOpen` and the click target isn't inside the pad. Use a ref on the pad wrapper.

## Things explicitly NOT changing

- Drag-and-drop, grouping toggle, Edit dialog, Duplicate dialog, list header/title/back arrow, footer button styling, DB schema, snapshot/run logic.
- Eyebrow header already removed in earlier turn.

## Risks

- `framer-motion` not yet imported here — check `package.json`; if missing, use CSS `transition-[max-height]` with a fixed `max-h-[420px]` instead (cheaper, no new dep).
- Auto-focusing the name input on open may shift mobile viewport; mitigate with `inputMode` and `enterKeyHint="done"`.
- Outside-tap handler must ignore taps on the `+ ADD` title button (otherwise it re-opens immediately).

## Acceptance check

- Open pad → list stays visible, scrollable, no dimming.
- Bottom button reads `Add to list`, adds item, pad collapses, button reverts to `Start grocery run`.
- Tapping handle OR list area collapses the pad.
- Tag row morphs between chip and full-width input without row-height jump.
- Category auto-detects but inline chip lets user override.
