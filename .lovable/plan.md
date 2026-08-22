# Profile: fix home city picker, input focus ring, and toggle styling

## 1. Home city can't be selected or saved

Root cause (confirmed by reading the page): the city editor renders inside the stat-line value cell, which is `flex-1 truncate`. `truncate` sets `overflow: hidden`, so the absolutely-positioned suggestion dropdown is clipped and never visible. On top of that, the only way to save is clicking a suggestion — typing a city and pressing Enter does nothing, and the 120ms blur timer closes the editor.

Fix:
- Drop `truncate`/overflow clipping on the value cell when the city editor is open (truncation stays for the static text state).
- Keep the dropdown visible above siblings and let it be selected with mouse or keyboard (Enter picks the top suggestion; Escape cancels).
- Allow saving free text on Enter when no suggestion matches, so a city that isn't in the bundled list can still be saved.
- The bundled list (3,673 "City, Country" labels) and the matcher itself are working and need no change.

## 2. Translucent corners around the city text box

The shared input applies a focus ring (`ring-2 ring-primary/25`) plus a border-color change on focus. The ring's soft halo reads as grey blobs outside the rounded corners at this small height. Fix: on this inline city field, use the border-only focus treatment (no ring), matching the app's other compact inline fields.

## 3. Toggles too chunky

`Switch` uses a 24px track with a 20px thumb, and the profile page shrinks the track to `h-5 w-9` without shrinking the thumb — so the knob nearly fills the track. Fix in the shared `Switch` primitive so every toggle in the app matches the reference: a slimmer pill track with a clearly smaller inset knob (approx. 24x44 track, 18px thumb, 3px inset, travel adjusted to match), keeping the existing dark-green `primary` fill when on. Remove the per-page `h-5 w-9` override on the profile page so all toggles are consistent.

## Files
- `src/pages/Profile.tsx` — city editor overflow, keyboard save, focus ring override, remove switch size override
- `src/components/ui/switch.tsx` — track/thumb sizing
