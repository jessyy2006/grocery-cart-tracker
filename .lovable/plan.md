## Why iOS shows the grey "C" fallback

iOS Safari "Add to Home Screen" picks an icon in this order:
1. `<link rel="apple-touch-icon">` pointing to a **square PNG ≤ ~512px**, ideally **180×180**.
2. `/apple-touch-icon.png` at the site root.
3. If neither resolves cleanly → auto-generated letter tile on grey (what you're seeing).

Our current setup violates step 1:
- `<link rel="apple-touch-icon" href="/icon-1024.png" />` — 1024px is too large; iOS often rejects it silently.
- The `sizes="192x192"` / `sizes="512x512"` variants are the wrong dimensions for iOS (it wants 180).
- No fallback at `/apple-touch-icon.png`.

Result: iOS can't resolve a usable icon and falls back to "C on grey".

## Fix

1. **Generate `public/apple-touch-icon.png` at 180×180** by downscaling `icon-1024.png` (ImageMagick, sRGB, no alpha — iOS prefers opaque).
2. **Update `index.html`** apple-touch-icon links:
   - Primary: `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />`
   - Drop the 1024 reference; keep 192/512 as secondary hints (Android/Chrome use them via the manifest anyway).
3. **Leave `manifest.json` alone** — it already has 192/512/1024 entries which Android uses correctly.
4. **Tell the user to fully remove the existing home-screen install and re-add it** — iOS caches the icon at install time; new icon won't appear on already-installed PWAs.

## Files touched

- `public/apple-touch-icon.png` — new, 180×180, generated from `icon-1024.png`.
- `index.html` — lines 14–16, replace apple-touch-icon links.

## Risks

- None to app behavior. Pure metadata/asset change.
- Caveat: existing installs on user's phone won't update — must delete + re-add after deploy.
