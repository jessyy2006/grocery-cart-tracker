# iOS-style floating tab bar

Replace the binder-tab navigation with the familiar iOS floating tab bar: a frosted, rounded bar that hovers above the bottom of the screen with icon-plus-label tabs.

## Design

- Full-width rounded bar inset ~16px from the left/right edges, floating above the home-indicator safe area.
- Frosted translucent cream background with a hairline border and a soft shadow, so list content blurs subtly behind it while scrolling.
- Four tabs, evenly spaced: Home, Lists, Finance, History — each an icon above a small mono uppercase label.
- Active tab tints forest green (icon + label, slightly heavier stroke); inactive tabs stay muted grey.
- Tap gives a small press-down scale for tactility. Reduced-motion users get no scale.
- Bar stays hidden on the live trip and receipt-scan screens, as today.

## Technical notes

- `src/components/BottomNav.tsx`: rewrite the markup. Items gain lucide icons (`Home`, `ListChecks`, `Wallet`, `Clock`). Wrapper stays `fixed inset-x-0 bottom-0 z-30` with `env(safe-area-inset-bottom)` padding plus ~12px extra, inner bar `mx-4 rounded-[22px] border border-hairline shadow-soft` with `bg-surface-raised/80` and `backdrop-blur` (reuse the saturate/blur values already in `index.css`).
- Tabs: `grid grid-cols-4`, each `NavLink` a flex column, icon `h-5 w-5`, label `text-[9px] font-mono uppercase tracking-widest`, active `text-primary`, inactive `text-muted-foreground`.
- `src/components/AppLayout.tsx`: bump content padding from `pb-14` to `pb-24` so the floating bar never covers the last row or the page footers.
- No route, data, or page-component changes.
