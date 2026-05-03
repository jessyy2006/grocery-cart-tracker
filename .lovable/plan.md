## 1. Stub bounce only after share dialog closes

**File:** `src/components/finance/ReceiptView.tsx`

Currently the reset effect (lines 331-341) runs `setTorn(false)` whenever the dialog closes — but the dialog opens 380ms *after* `torn` becomes true, and an `onOpenChange` flicker can fire too early. The actual issue: the effect's condition `!dialogOpen && torn` is true the entire time *before* the dialog opens (torn=true from t=0 to t=380ms), causing the immediate bounce-back the user is seeing.

Fix: track whether the dialog has been opened at least once for this tear, and only reset after it has been opened *and then* closed.

- Add `dialogShownRef = useRef(false)`.
- In the `setTimeout(() => setDialogOpen(true), 380)` branch, set `dialogShownRef.current = true` when opening.
- Change the reset effect to only fire when `!dialogOpen && torn && dialogShownRef.current && !previewOpen`, and reset the ref to false after restoring.

## 2. Fully delete `/auth`

**Files:** `src/App.tsx`, `src/components/RequireAuth.tsx`

- Remove the `<Route path="/auth" element={<Navigate .../>} />` line entirely. Unknown paths fall through to `NotFound`.
- `RequireAuth` already redirects to `/onboarding/signup` — leave that. (See item 5 for the change to redirect to `/onboarding` instead.)

## 3. Disable "Continue" on skippable pages until input given

**Files:** `src/pages/onboarding/Goals.tsx`, `src/pages/onboarding/Budget.tsx`

The Layout already supports `primaryDisabled` (renders the Button with disabled state, which shadcn fades automatically).

- **Goals:** add `skipTo="/onboarding/budget"` and `primaryDisabled={draft.goals.length === 0}`.
- **Budget:** already has `onSkip`. Add `primaryDisabled={!value.trim()}`.
- **Behavior:** already disabled correctly; no skip exists on this screen — leave as-is (user must pick one). Confirm this is intended; if Behavior should also be skippable add `skipTo`/`onSkip`. *Assuming current no-skip behavior stays.*
- **Profile:** already disabled correctly until first+last name entered. Has skip. No change.

## 4. Intro page card layout

**File:** `src/pages/onboarding/Intro.tsx`

Replace the bottom card stack so:
- The **list card** is the bottom layer, sized to take ~60% of the available vertical area (tall rectangle anchored to bottom).
- The **budget card** sits on top, same compact size as today, offset 32px to the right of the list card (i.e. list card has `-ml-8` shift left, budget card sits with its current padding) — net effect: budget card is horizontally offset by 32px from the list card, slightly higher.

Approach: use absolute positioning inside the existing relative container.
```tsx
<div className="relative h-full">
  <Card className="absolute inset-x-0 bottom-0 h-[60%] p-4 ...">{/* list */}</Card>
  <Card className="absolute left-8 right-0 bottom-[55%] p-4 ...">{/* budget, 32px right offset, sits above list */}</Card>
</div>
```
Keep existing stagger animations. Verify on 402×716 viewport (current preview).

## 5. New users land on Intro (not Signup)

**File:** `src/components/RequireAuth.tsx`

Currently unauthenticated visits to `/` redirect to `/onboarding/signup`, skipping the value-prop intro. Change the redirect to `/onboarding` so a brand-new user sees the two demo cards first; the Intro's "Start saving" button already routes them to `/onboarding/signup`.

```diff
- if (!user) return <Navigate to="/onboarding/signup" replace ... />;
+ if (!user) return <Navigate to="/onboarding" replace ... />;
```

## Risks

- Item 1: if the user closes the receipt dialog very quickly (<380ms) the ref logic still works because we set the ref *before* opening; `dialogShownRef` becomes true synchronously when the timer fires.
- Item 4: absolute positioning inside the existing flex column needs the parent `relative mt-8 flex-1` to have a real height — it does (`flex-1` inside `min-h-full` flex col).
- Item 5: deep-linked unauthed users to e.g. `/history` will now land on Intro, then Signup. Acceptable for the value-prop goal.

No DB or types changes. No new dependencies.
