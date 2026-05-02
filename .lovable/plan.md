## Grocery Tracker — Mobile PWA

A phone-first installable web app for tracking grocery runs in real time. Scan barcodes as you shop, watch your cart total update live, save the trip when you check out, and browse past trips with store, items, and prices.

### Core user flow

1. Sign up / log in (email + password, Google sign-in).
2. Tap **Start new trip** → app auto-detects your location and suggests nearby grocery stores; pick one (or add a custom name).
3. Scan barcodes with the phone camera. Each scanned item appears in the live cart with name, quantity, and price. Running total updates instantly.
4. Add a second store mid-trip → items get tagged to that store; cart shows a per-store breakdown plus a grand total.
5. Tap **Save trip** at checkout → trip is archived with date, store(s), items, and totals.
6. **History** tab → list of past trips, tap any to see exact items, prices, and stores.

### Screens

- **Auth** — login / signup
- **Home** — "Start new trip" button, list of recent saved trips, lifetime spend summary
- **Active trip** — current store header (with switch-store action), scrollable list of scanned items grouped by store, live total footer, big **Scan** button, **Save trip** button
- **Scanner** — full-screen camera with barcode overlay; on detection slides up a sheet with product info + price field + qty
- **Trip detail** — read-only view of a past trip
- **Item lookup fallback** — when a barcode isn't in Open Food Facts or has no remembered price, a quick form to enter name + price (saved for next time)
- **Profile / settings** — sign out, manage saved stores

### Data model

- `profiles` (id, display_name)
- `products` (barcode PK, name, brand, image_url, default_price, last_user_price) — shared lookup cache, populated from Open Food Facts + your past entries
- `stores` (id, user_id, name, address, lat, lng) — your personal store list, auto-populated as you shop
- `trips` (id, user_id, started_at, ended_at, status: active/saved, total_cents)
- `trip_items` (id, trip_id, store_id, barcode, name_snapshot, price_cents, qty, scanned_at) — snapshots so historical trips don't change if a price later updates

All tables protected with RLS so each user only sees their own data.

### Key features

- **Barcode scanning** in-browser via the phone camera (`BarcodeDetector` API with a JS fallback for iOS Safari).
- **Open Food Facts lookup** for product name/brand/image. No prices — first time you scan an item you type the price; we remember it and pre-fill next time (editable per scan).
- **GPS + nearby store search** when starting a trip (uses browser geolocation + a free reverse-geocoding/places lookup). You can override or type a custom name. Stores are saved to your personal list for one-tap reuse.
- **Multi-store trip** — switch active store mid-trip; items keep tagging to whatever store was active when scanned. Trip detail and totals break down by store.
- **Live totals** — cart subtotal recomputes on every add/edit/remove.
- **Offline-friendly scanning** — scans queue locally and sync when back online.
- **Trip history** with search by store and date.

### Look & feel

- Mobile-first single-column layout sized for one-handed use.
- Clean, calm palette (off-white background, deep green accent for grocery vibe), large tap targets, big sticky **Scan** FAB on the active-trip screen.
- Bottom tab bar: Home · Active Trip · History · Profile.

### Technical notes

- Built as a PWA (installable to home screen, works offline for viewing past trips). Structured so a later **Capacitor wrap** for native iOS/Android is a drop-in: all device APIs (camera, geolocation) accessed through a thin abstraction layer (`src/lib/device/`) so we can swap browser APIs for Capacitor plugins (`@capacitor/camera`, `@capacitor/geolocation`) without touching feature code. Auth, DB calls, and UI stay identical.
- **Lovable Cloud** for auth + Postgres + RLS.
- **Open Food Facts** public API for product lookups (no key required).
- **Geolocation**: browser `navigator.geolocation` + Nominatim (OpenStreetMap) for free reverse geocoding and nearby-store search. If results are weak, we can swap in Google Places later (would need an API key).
- Barcode scanning via native `BarcodeDetector` where available, falling back to `@zxing/browser`.
- React + Vite + Tailwind + shadcn (existing stack). React Query for data, Zod for validation.

### What's deferred (ask later if you want them)

- Sharing a trip / household sync
- Budgets and category analytics
- Receipt photo OCR
- Price comparison across stores
