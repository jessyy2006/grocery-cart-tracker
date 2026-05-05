# Fix 4 UI bugs

## 1. Onboarding "Continue" button too close to the bottom

`src/pages/onboarding/Layout.tsx` container is `flex min-h-full flex-col px-5 pb-6 pt-2 safe-top` — it has `safe-top` but no `safe-bottom`, so on iPhone the primary button sits in the home‑indicator zone, lower than where the bottom‑nav icons sit on in‑app pages.

Fix: add `safe-bottom` to the container so the button respects the same iOS bottom inset that `BottomNav` already uses (`safe-bottom` + `pt-1.5 pb-0` + nav‑item `py-2`). Result: container becomes `flex min-h-full flex-col px-5 pb-6 pt-2 safe-top safe-bottom`. The button bottom edge will then line up with where the nav icons render on every other screen, on every device size.

## 2. Back from "Select a grocery store" should go Home when launched from onboarding

`src/pages/onboarding/FirstList.tsx` → `startTrip()` navigates to `/trip/new` (which renders `StartTrip.tsx`). `StartTrip.tsx` line 144 uses `navigate(-1)`, which pops back into the onboarding flow.

Fix without breaking the normal Home → Start Trip → Back behavior:

- In `FirstList.tsx` `startTrip()`, set a one‑shot flag alongside the existing `pendingTrip:listId`:
  `sessionStorage.setItem("trip:cameFromOnboarding", "1");`
- In `StartTrip.tsx`, replace the back button handler with:
  ```ts
  const goBack = () => {
    if (sessionStorage.getItem("trip:cameFromOnboarding") === "1") {
      sessionStorage.removeItem("trip:cameFromOnboarding");
      navigate("/", { replace: true });
      return;
    }
    navigate(-1);
  };
  ```
  and wire the existing back button to `goBack`. Also clear the flag once a trip is actually started (in the existing `startWith` success path) so a future Back from a different entry isn't affected.

## 3. Header alignment and sizing across tabs

Cause: Home (`Lists.tsx`, `Home.tsx`) renders a small eyebrow `<p>` above the `<h1>` (`"Welcome back"`, `"Plan your run"`). History and Profile have no eyebrow, so their `<h1>` sits ~20px higher even though their container padding (`px-5 pb-6 pt-2`) is identical. Finance also uses `text-2xl` instead of `text-3xl` and `p-4` instead of `px-5 … pt-2`.

Fix (no hard‑coded pixel offsets — relies on the same eyebrow line):

- **`src/pages/Finance.tsx`** — Change container from `space-y-5 p-4 pb-24` to `space-y-5 px-5 pb-24 pt-2`. Change `<h1 className="text-2xl …">Finance</h1>` to `text-3xl`. Add an invisible eyebrow `<p>` above it so the title sits at the same Y as Home/Lists:
  ```tsx
  <header className="flex items-end justify-between">
    <div>
      <p className="text-sm text-muted-foreground invisible select-none" aria-hidden>.</p>
      <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
    </div>
    <div className="flex items-center gap-1"> … existing controls … </div>
  </header>
  ```
- **`src/pages/History.tsx`** — Wrap the existing flex header so the `<h1>` gets the same invisible eyebrow above it (matching Home/Lists vertical position):
  ```tsx
  <div className="flex items-end justify-between gap-3">
    <div>
      <p className="text-sm text-muted-foreground invisible select-none" aria-hidden>.</p>
      <h1 className="text-3xl font-bold tracking-tight">History</h1>
    </div>
    {monthOptions.length > 0 && ( … existing Select … )}
  </div>
  ```
- **`src/pages/Profile.tsx`** — Add the same invisible eyebrow inside `<header>` directly above the `<h1>`:
  ```tsx
  <header>
    <p className="text-sm text-muted-foreground invisible select-none" aria-hidden>.</p>
    <h1 className="text-3xl font-bold tracking-tight"> … existing name logic … </h1>
    <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
  </header>
  ```

Because the eyebrow uses the same `text-sm` line height as Home/Lists, the `<h1>` Y position will match automatically across all viewport sizes — no fixed pixel values.

## 4. Wrong app icon on Create Your Account screen

`src/pages/onboarding/Signup.tsx` renders a hard‑coded `<ShoppingBasket>` lucide icon inside the gradient tile. Replace it with the actual app icon file referenced by `index.html` and `manifest.json` (`/icon-1024.png`):

```tsx
<div className="mb-4 h-16 w-16 overflow-hidden rounded-2xl shadow-elevated">
  <img src="/icon-1024.png" alt="CartWise" className="h-full w-full object-cover" />
</div>
```

Also remove the now‑unused `ShoppingBasket` import. The path `/icon-1024.png` is the same canonical path used by `<link rel="apple-touch-icon">` and the PWA manifest, so swapping the icon file in `public/` will update this screen automatically with no further code changes.

## Files touched
- `src/pages/onboarding/Layout.tsx`
- `src/pages/onboarding/FirstList.tsx`
- `src/pages/StartTrip.tsx`
- `src/pages/Finance.tsx`
- `src/pages/History.tsx`
- `src/pages/Profile.tsx`
- `src/pages/onboarding/Signup.tsx`
