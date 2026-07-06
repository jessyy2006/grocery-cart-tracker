## 2 mobile fixes

### 1. Footer buttons cut off at bottom of screen

The list-detail footer uses `pb-3` with no safe-area padding, so on notched phones the button's rounded bottom sits under the home indicator. The ActiveTrip footer already uses `paddingBottom: calc(env(safe-area-inset-bottom) + 0.75rem)`, which is what your screenshot references.

Fix: apply the same padding to the `<footer>` in `ListDetail.tsx` (line 705) so the "add to list" / "start grocery run" button bottom margin matches the trip page's "cart total / scan barcode" tray.

File: `src/pages/ListDetail.tsx`.

### 2. Lock pinch-zoom on mobile

Update the viewport meta in `index.html` to disable user scaling:

```text
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
```

This also covers the keyboard-resize behavior from fix #1.

File: `index.html`.

## Risk / notes

- `user-scalable=no` is an accessibility trade-off (users can't pinch to zoom text). You've asked for a locked app feel, which is standard for installed PWAs — flagging it so you're aware.
- `interactive-widget=resizes-content` is ignored on older iOS; the `preventScroll` focus is the belt-and-suspenders fix for those.
- No business logic touched; all changes are presentation/viewport only.