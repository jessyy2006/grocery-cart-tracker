## Changes

### 1. `index.html`
Revert one line:
```diff
- <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
+ <meta name="apple-mobile-web-app-status-bar-style" content="default" />
```
Restores iOS reserving the status bar area, fixing the upward shift on the Intro page and the bottom nav.

### 2. `src/components/FeatureIntroDialog.tsx`
Add a `useEffect` that, while `open`, swaps `<meta name="theme-color">` to `#0a0a0a` (matching the Radix dialog overlay) and restores `#0F2A1D` on close. Keeps the original status-bar-darkening fix without changing layout.

## Files touched
- `index.html`
- `src/components/FeatureIntroDialog.tsx`
