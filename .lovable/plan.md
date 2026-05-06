# Fix three UI flashing/overlay bugs

## 1. Finance page flashes on every visit

**Cause:** `Finance.tsx` returns a completely different layout while `loading` is true:
```text
loading view: <div className="space-y-4 p-4"> + skeletons
loaded view : <div className="space-y-5 px-5 pb-24 pt-2"> + header + content
```
Different padding (`p-4` vs `px-5 pb-24 pt-2`), different vertical rhythm, and the header is missing from the skeleton — so the whole page visibly shifts when data arrives. That's the "flash".

**Fix:** In `src/pages/Finance.tsx`, render the **header always** (it doesn't depend on data) and only swap the body for skeletons while loading. Use the exact same outer container (`space-y-5 px-5 pb-24 pt-2`) in both states so nothing reflows.

```text
return (
  <div className="space-y-5 px-5 pb-24 pt-2">
    <header className="flex items-end justify-between"> … same header … </header>
    {loading ? <FinanceSkeleton/> : (view === 'receipt' ? <ReceiptView…/> : <FinanceCardView…/>)}
    <Dialog …/>
  </div>
);
```
`FinanceSkeleton` = the existing skeleton blocks (budget card, 3 signal tiles, chart) without the outer `p-4` wrapper.

## 2. Profile header flashes "Profile" before settling on "Jessica's Profile"

**Cause:** `useProfile` does **not** reset `loading` to `true` when `user` changes. Initial render: `user=null`, the effect runs, hits the `if (!user)` branch and sets `loading=false`, `firstName=null`. The Profile page therefore renders the "Profile" fallback. A moment later `user` becomes defined, the effect re-runs and starts fetching — but `loading` is still `false` and `firstName` is still `null`, so "Profile" stays on screen until the fetch resolves and replaces it with "Jessica's Profile". That's the flash.

**Fix:** In `src/hooks/useProfile.tsx`, set `setLoading(true)` at the **top** of the effect (before the `if (!user)` short‑circuit) so the consumer always sees `loading=true` while the hook is figuring out the new user's name. Profile.tsx already renders an invisible placeholder while `profileLoading` is true, so nothing else changes.

While we're there: seed `firstName` synchronously from `user.user_metadata` (given_name / full_name) before the DB round‑trip so the visible text appears instantly on Google sign‑ups too.

## 3. Top of screen is solid dark when the Finance intro dialog opens

**Cause:** `index.html` declares `<meta name="apple-mobile-web-app-status-bar-style" content="default">`. On iOS PWA standalone, "default" makes the status bar **opaque**, painted with `theme-color` (`#0F2A1D`, dark green). The Radix Dialog overlay (`fixed inset-0 bg-black/80`) lives inside `<body>` and therefore cannot paint over the OS status bar. Result: the rest of the screen gets the translucent black‑80 wash, while the status bar stays a flat dark‑green block — exactly the "solid dark strip on top" the user described.

**Fix:** In `index.html`, change the status bar style to **`black-translucent`**:
```text
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```
With this, the OS status bar becomes transparent and the web view extends underneath it, so the dialog overlay (and any other full‑screen overlay/drawer/sheet) covers the status bar area uniformly. The existing `safe-top` padding on `<main>` already pushes content below the notch, so nothing visually shifts in normal screens.

## Files touched
- `src/pages/Finance.tsx` — keep header mounted, swap only body for skeleton, unify outer container.
- `src/hooks/useProfile.tsx` — `setLoading(true)` at start of effect; seed `firstName` from `user_metadata` immediately.
- `index.html` — status bar style → `black-translucent`.

No DB / route / dependency changes.
