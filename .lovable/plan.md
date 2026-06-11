## 1. Exit confirmation on Active Trip

In `src/pages/ActiveTrip.tsx`, wrap the existing Exit button in an AlertDialog (shadcn).
- Title: "Are you sure you want to exit?"
- Description: "Your trip won't be saved."
- Primary action button (default variant): "No, go back" — closes dialog.
- Destructive/secondary action: "Exit" — deletes the trip row from `trips` (cascades to `trip_items` / `trip_planned_items`), clears the `trip:{id}:store` sessionStorage key, then navigates back to home.

## 2. Hide "No store" tag

Only show the `MapPin` + store text when there is actually a store associated.
- `src/pages/History.tsx` (line ~150): only render the `<MapPin/> {stores.join(...)} ·` portion when `t.stores.length > 0`. Always still show the item count.
- `src/pages/TripDetail.tsx`: group header `{g.name}` already conditional on the item having a snapshot; leave list grouping as is (items with no store fall under "Unspecified"). Only change History since that's the visible tag. Will also audit TripDetail header for any "No store" label.

## 3. Receipt overlay restyle + slide animations

In `src/components/trip/PrintedReceiptOverlay.tsx`:
- Background: replace `bg-foreground/40 backdrop-blur-sm` with a solid dark green (e.g. `#0e1a14` — already the INK color, or a slightly richer green like `#13261d`). Animate this background panel sliding in from top (`y: -100%` → `0`) and out (`0` → `100%`) using a smooth eased curve (cubic-bezier ~ `[0.22, 1, 0.36, 1]`, ~700ms) instead of the current opacity fade.
- Receipt: keep the existing top-slide entry; on dismiss, animate the receipt downward (`y: 100%`) together with the background using the same eased curve so they exit as one unit.
- Button: change to a very light beige (e.g. `#fdfaf1` / PAPER) with dark green text; keep `Collect receipt` label and secondary sizing.

Implementation note: use a single parent `motion.div` for both background+content slide, controlled by an internal `exiting` state toggled by `onDismiss`, so entry slides down from top and exit slides down off-bottom. Framer Motion's tween with a smooth cubic-bezier gives the "ramped Lenis-like" feel; true Lenis isn't needed for a one-shot transition and this is fully feasible in an iOS web/PWA context.

### Files touched
- `src/pages/ActiveTrip.tsx`
- `src/pages/History.tsx`
- `src/components/trip/PrintedReceiptOverlay.tsx`

### Question
For the dark green, do you want me to use the existing ink color `#0e1a14` (very dark, near-black green) or a more saturated forest green like `#13261d` / `#1a3a2a`? I'll default to `#13261d` unless you say otherwise.