# Cartwise — UX Flow & Interaction Audit

Date: 2026-08-25 · Scope: full app · Code changes made: **none**

Method: verified route walk in the running preview (393×771, authenticated session) + line-level code review of every page, guard, hook and edge function. Each issue is labelled:

- **[REPRO]** reproduced in the interface
- **[CODE]** verified from code, not visually reproduced
- **[INFER]** inferred, still requires validation

---

## Verified route inventory

| Route | Guard | Chrome | Walk result |
|---|---|---|---|
| `/onboarding` | none | full-bleed | renders hero even when signed in + onboarded |
| `/onboarding/showcase` | none | full-bleed | renders for onboarded users |
| `/onboarding/signup` | none | shell | self-redirects forward when signed in |
| `/onboarding/verify` | none | shell | flashes blank email before redirect |
| `/onboarding/budget` | RequireAuth | shell | ok |
| `/` | Auth+Onboarding | tab bar | ok, but no active-trip affordance |
| `/lists` | Auth+Onboarding | tab bar | ok |
| `/lists/:id` | Auth+Onboarding | fullscreen | **invalid id renders a usable blank list** |
| `/trip/new` | Auth+Onboarding | fullscreen | side-effecting route, redirects to `/trip` |
| `/trip` | Auth+Onboarding | fullscreen | ok |
| `/trip/:id` | Auth+Onboarding | tab bar (bug) | "trip not found" for invalid id |
| `/history` | Auth+Onboarding | tab bar | **silently deletes trips >1yr on every visit** |
| `/finance` | Auth+Onboarding | tab bar | ok |
| `/profile` | Auth+Onboarding | detail | ok |
| `/scan-receipt` | Auth+Onboarding | fullscreen | no camera → dead shutter still rendered |
| `/index` | — | — | redirects to `/` |
| `*` | — | plain | "this page doesn't exist" + back home |

---

# Part 1 & 2 — Issues

## Critical

### UX-01 — An in-progress trip is unreachable from Home and is silently destroyed
- **Flow:** Shopping trips → returning after interruption
- **Route:** `/` (also `/lists/:id`)
- **Step/component/state:** `Home.tsx` hero, `startTripWith()` (`Home.tsx:119-138`); an `trips.status='active'` row exists
- **User goal:** resume the shop I walked away from
- **Current:** Home renders "start a live trip" with no indication a trip is open. Tapping it runs `delete().eq("status","active")` and starts a fresh trip. `ListDetail.startRun()` (`:381-385`) does the same for a trip belonging to a different list. The only way back into a live trip is knowing the `/trip` URL. **[REPRO]** — an active "free trip · aug 25, 2:31 pm" existed while Home showed no trace of it.
- **Expected:** Home surfaces a persistent "resume trip · N items · $X" banner; starting a different trip requires confirmation naming what will be discarded.
- **Why it matters:** irreversible loss of a whole shop's data, with zero warning. This is the single highest-risk flow in the app.
- **Root cause:** no global active-trip query/state; destructive cleanup is a silent side effect of the start action.
- **Severity:** Critical · **Frequency:** high (any interruption — phone lock, tab switch, accidental exit)
- **Fix:** add `useActiveTrip()` hook (query `trips` where status=active, limit 1) consumed by Home; render a resume banner above the hero; wrap trip-replacing deletes in `ConfirmDialog` ("You have a trip in progress at *walmart essentials* with 12 items. Start a new one and discard it?").
- **Alternative:** auto-save the abandoned trip as `saved` instead of deleting. Tradeoff: pollutes History with partial trips; needs a "partial" flag.
- **Affected:** `/`, `/lists/:id`, `/trip/new`; `Home.tsx`, `ListDetail.tsx`, `StartTrip.tsx`
- **Depends on:** none · **Regression risk:** the resume banner must not appear for hidden free-trip shells with 0 items *and* no store
- **Acceptance:** with an active trip, Home shows resume; tapping resume lands on `/trip` with items intact; starting a different trip shows a confirm naming the old trip; cancelling leaves the old trip untouched.

### UX-02 — History silently mass-deletes trips older than one year on every visit
- **Flow:** History → default view · **Route:** `/history`
- **Step:** mount effect, `History.tsx:47-50` — `await supabase.from("trips").delete().lt("started_at", cutoff)` runs before the fetch, unconditionally.
- **Current:** a year+ of receipts is permanently destroyed with no notice, no toast, no setting, no export. **[CODE]**
- **Expected:** no destructive write on a read route. Retention, if wanted, is an explicit opt-in setting with a warning and an export path.
- **Why:** users lose year-over-year data the app itself advertises (the yearly receipt, YoY delta on the monthly receipt depend on it).
- **Root cause:** retention policy implemented client-side in a render path.
- **Severity:** Critical · **Frequency:** every History visit
- **Fix:** delete the statement. If retention is required, move it to a scheduled backend job with a Profile setting (default: keep everything) and an in-app notice before the first purge.
- **Regression risk:** the fetch also filters `.gte(cutoff)` — remove that too or old trips stay invisible.
- **Acceptance:** visiting `/history` issues no DELETE; trips older than a year are listed and openable.

### UX-03 — Invalid or deleted list URL renders a fully functional, nameless phantom list
- **Flow:** Lists → invalid URL · **Route:** `/lists/:id`
- **Step:** `ListDetail.tsx:113-140` sets `ready=true` even when the list row is null.
- **Current:** blank title, "0 items", a working "+ ADD" and an enabled "start grocery run". **[REPRO]** at `/lists/00000000-...`. Adding an item fails on RLS; starting a run creates a trip against a nonexistent list.
- **Expected:** `ErrorState` "list not found — it may have been deleted", primary action "back to lists" — matching `/trip/:id`, which already does this correctly.
- **Root cause:** null result not distinguished from empty result; `ErrorState` exists but is unused in Lists/ListDetail/ActiveTrip/Home.
- **Severity:** Critical (data integrity + dead end) · **Frequency:** medium (stale deep links, deleted list, back-after-delete)
- **Fix:** branch on `!list` → `<ErrorState>`; apply the same null-vs-empty branch to `Lists.tsx` and `Home.tsx` load failures (see UX-11).
- **Acceptance:** unknown/foreign list id shows the error state with a working back action and no add/run affordances.

### UX-04 — Starting a trip from a list wipes that list's saved check/price state with no warning
- **Flow:** Shopping trips → start from Home · **Route:** `/`
- **Step:** `Home.tsx:126-129` — `update({checked_at:null, price_cents:null}).eq("list_id", listId)` before navigating.
- **Current:** silent destructive reset of shared list state. **[CODE]** (documented as intentional in an earlier plan, but it is unannounced.)
- **Expected:** either the reset is announced ("previous run progress cleared") or, better, it is a no-op because run state lives only in `trip_planned_items` (which it now does) — the list-level columns should not be mutated at all.
- **Severity:** Critical (silent data mutation) · **Frequency:** every list-based trip
- **Fix:** confirm whether `shopping_list_items.checked_at/price_cents` are still read anywhere; if not, drop the reset entirely. If they are, gate behind a confirm when any row is non-null.
- **Product decision required:** should a list remember prices between runs?
- **Acceptance:** starting a run from a list either leaves list rows untouched, or warns before clearing them.

### UX-05 — `RequireOnboarding` hangs forever on a failed network request
- **Flow:** System → session/network · **Route:** every guarded route
- **Step:** `RequireOnboarding.tsx:19-31` — async IIFE with no `.catch`; `status` stays `"checking"`.
- **Current:** permanent "Loading…" text, no retry, no way out except a reload that fails identically. Same class of bug in `Signup.tsx:34-53`. **[CODE]**
- **Expected:** on failure, fail open to the app (or show an error state with "try again"), never an infinite gate.
- **Severity:** Critical (total app lockout on flaky network) · **Frequency:** low-medium
- **Fix:** try/catch → on error set `status='ok'` and toast once; add a 6s timeout.
- **Acceptance:** with the backend unreachable, the app reaches a usable screen or an error state with retry within 6s.

### UX-06 — Exiting a trip permanently deletes it; the wording understates the loss
- **Flow:** Shopping trips → exit · **Route:** `/trip`
- **Step:** exit confirm (`ActiveTrip.tsx:786`, `exitTrip()` `:752-757`) → `trips.delete()`
- **Current:** copy reads "are you sure you want to exit? / Your trip won't be saved." with **exit** and **no, go back**. **[REPRO]** Everything — checked items, extras, prices, store — is destroyed with no undo.
- **Expected:** name the loss ("Discard 12 items and $84.20?"), label the destructive button "discard trip", and offer "save & exit" when the cart is non-empty.
- **Severity:** Critical · **Frequency:** high
- **Fix:** dynamic confirm copy from live counts; add a third path "save trip instead" when `total > 0`.
- **Depends on:** VH-26 (block ending empty trips) — same dialog family.
- **Acceptance:** exiting a non-empty trip offers save-instead; the discard copy states item count and total.

## High

### UX-07 — No guard on `/onboarding`, `/onboarding/showcase`
Signed-in, fully onboarded users who open these (bookmark, back-stack, deep link) see onboarding again with **no back or close control** — a dead end short of a URL edit. `App.tsx:40-41`, `Hero.tsx`, `Showcase.tsx` check `user` only, never completion. **[CODE]** · Severity High · Fix: a `RedirectIfOnboarded` wrapper on all `/onboarding/*` public routes.

### UX-08 — Google sign-in can stay disabled forever
`Signup.tsx:103-122`: `googleBusy` clears only on an explicit error or a focus/visibility heuristic. In an embedded webview or if the redirect silently fails, the button is permanently dead with no message. **[CODE]** · Fix: 15s timeout that resets state and surfaces "couldn't reach Google — try again or use email".

### UX-09 — Resend-code cooldown starts before the request succeeds
`Verify.tsx:67-79` sets the 45s cooldown, then calls the API; on failure the user waits 45s for a resend that never happened. **[CODE]** · Fix: set cooldown only in the success branch.

### UX-10 — OTP errors are toast-only; the field clears with no persistent reason
`Verify.tsx:58-61` wipes `code` and toasts. A user watching the keypad sees six boxes empty themselves. **[CODE]** · Fix: inline error state under the OTP input, persisting until the next keystroke.

### UX-11 — "No data" and "request failed" are indistinguishable everywhere
`Lists.tsx:28-36`, `Home.tsx:58-96`, `Finance.tsx:82-158` never inspect `error`; `ready`/`loading` flips regardless. A failed fetch renders the friendly empty state ("no trips yet"), actively misinforming the user. **[CODE]** · Severity High · Frequency: every offline/flaky load · Fix: capture `error` from each response; render `ErrorState` with a retry action; reserve `EmptyState` for confirmed-empty results. This is one root cause across Home, Lists, Finance, History.

### UX-12 — Destructive row actions are hover-only, i.e. invisible on touch
`Lists.tsx:132` and `LedgerRow.tsx:129` use `opacity-0 group-hover:opacity-100` for delete/edit. On a phone there is no hover: the control is either permanently invisible or appears only after a tap that may itself do something else. **[CODE]** · Severity High (core delete path undiscoverable on the primary device) · Fix: always-visible low-contrast icons on coarse pointers (`@media (pointer: coarse)`), or standardise on the existing swipe-to-delete row with a visible affordance.

### UX-13 — Drag-to-recategorise is a hidden, gesture-only feature
`ListDetail.tsx:85-88, 788-808`: 250ms long-press with no drag handle, no hint, no menu alternative. Undiscoverable and unusable without precise gesture control. **[CODE]** · Fix: add a grip glyph on each row and a "move to category" option in the row's edit sheet as a non-gesture path.

### UX-14 — Checkboxes on a list look interactive but fail with a toast
`ListDetail.tsx:345-353` toasts "Start the grocery run to check items off" *after* the tap. **[CODE]** · Fix: render the checkbox as a static bullet outside an active run, or remove it; explain the state in the footer.

### UX-15 — "Start grocery run" is enabled on an empty list, then rejects the tap
`ListDetail.tsx:709-731` → `startRun()` toasts "Add some items first". **[REPRO]** on the phantom-list screen. **[CODE]** for the real case. · Fix: disable with a visible reason ("add an item to start"), consistent with VH-11's empty-state CTA.

### UX-16 — Scan Receipt with no camera still renders a shutter button
**[REPRO]** at `/scan-receipt`: black frame, inline "No camera found on this device.", a duplicate toast saying the same thing, and the capture shutter still drawn below the fold. A control that cannot work is presented as available. **[REPRO]** · Fix: swap the whole capture chrome for an `EmptyState` with "upload photo" as the single primary action; drop the duplicate toast.

### UX-17 — Cancelling receipt review discards all manual edits with no confirmation
`ScanReceipt.tsx:195-198`, wired to both "X" (`:624`) and "Cancel" (`:763`). A user who has corrected ten line items loses everything to one tap. **[CODE]** · Severity High · Fix: confirm dialog when `parsed` has been edited; label it "discard scanned receipt?".

### UX-18 — Parse failures give one generic message regardless of cause
`parse-receipt` returns 402 (credits) and 429 (rate limit); `ScanReceipt.tsx:280-284` collapses everything into "couldn't read receipt" with photo-quality tips. A rate-limited user is told to improve their lighting. **[CODE]** · Fix: map status codes to distinct copy — retry-after for 429, service notice for 402, photo tips for parse failures.

### UX-19 — Sign out is fire-and-forget with no feedback
`Profile.tsx:341` — no await, no error handling, no pending state. On failure nothing happens at all. **[CODE]** · Fix: await, disable during, toast on failure, navigate to `/onboarding` on success.

### UX-20 — Store deletion in Profile has no confirmation
`Profile.tsx:124-128` deletes immediately from a trash icon sitting inline in a list. **[REPRO]** (icons visible, always-on). · Fix: `ConfirmDialog` or an undo toast.

### UX-21 — Account deletion can partially succeed and leave the user signed in to an emptied account
`delete-account/index.ts:41-59` wipes data tables sequentially, then deletes the auth user. A failure after the table wipe leaves a live session pointing at erased data; the UI shows only a generic toast and the dialog reopens as if nothing happened. **[CODE]** · Severity High · Frequency low, impact irreversible · Fix: make the function idempotent and transactional where possible; on partial failure force sign-out and show "your data was removed but the account couldn't be closed — contact support".

### UX-22 — Avatar upload has no validation and no visible failure state
`Profile.tsx:142-157`: no type/size check, no progress, no optimistic image; on error the old avatar remains with only a toast. The avatar itself carries no visible "change photo" affordance. **[REPRO]** (empty circle, no camera badge). · Fix: camera badge overlay, accept-filter + 5MB guard with inline message, spinner during upload, revert with explanation on failure.

### UX-23 — No in-flight lock on high-value writes
`ListDetail.performAdd`/`saveEdit` (`:274-343`), `ActiveTrip.saveTrip` (`:535-675`), `ScanReceipt.save` (`:436-455`). Buttons are gated on field validity, not on a pending flag; the save chain in `saveTrip` is several sequential awaits long. Double-tap can duplicate items or double-save a trip. **[CODE]/[INFER]** · Fix: a shared `usePending()` guard that disables and swaps the label to a spinner for every mutating primary button.

## Medium

### UX-24 — `/trip/new` is a side-effecting route with no back control
`StartTrip.tsx` creates a hidden list and a trip on mount. Visiting it directly (deep link, refresh, back into it) creates rows; there is no cancel and only a bare spinner with no context. **[REPRO]** (direct visit resolved into an existing trip). · Fix: label the spinner ("setting up your trip…"), navigate with `replace` (already done), and short-circuit if the referrer isn't an in-app start action.

### UX-25 — Free-shop trips create permanent hidden lists
`StartTrip.tsx:44-56` inserts a `hidden` list per free trip. Exiting the trip deletes the trip but not the list, so orphan rows accumulate forever. **[CODE]** · Fix: delete the hidden list alongside the trip in `exitTrip`, or reuse a single per-user scratch list.

### UX-26 — `AppLayout` never matches Trip Detail, so the tab bar shows on a detail route
`AppLayout.tsx:11` tests `/^\/trips\/[^/]+$/` (plural) but the route is `/trip/:id` (singular). **[REPRO]** — the tab bar renders on `/trip/<id>`. Contradicts the VH-03 detail-route contract. · Fix: correct the regex; guard against colliding with `/trip/new`.

### UX-27 — Background AI match can yank the "not on your list" sheet out from under the user
`ActiveTrip.tsx:387-393` may call `setOffList(null)` and auto-apply a match while the sheet is open and the user is mid-tap. **[CODE]** · Fix: once the sheet is visible, the AI result must only annotate it ("looks like *milk 2L* — use it?"), never dismiss it.

### UX-28 — Unchecking a substituted item silently deletes the substitution
`ActiveTrip.tsx:194-207` removes the linked `trip_items` row with no confirm and no undo, unlike the guarded delete elsewhere. **[CODE]** · Fix: undo toast.

### UX-29 — Removing an extra fires success confetti
`ActiveTrip.tsx:527-533` reuses the check-off celebration for a removal. **[CODE]** · Fix: no confetti on removal; use an undo toast instead.

### UX-30 — Rename-list and tag drafts are discarded silently on outside tap
`ListDetail.tsx:147-157` (name) and `:159-181` (tag, which never calls `commitTag()`). Users reasonably read a dismissal as a save. **[CODE]** · Fix: commit on outside tap, or show "discarded" feedback; be consistent between the two.

### UX-31 — Total mismatch on a scanned receipt is a grey caption
`ScanReceipt.tsx:720-724` prints "Receipt total: $X" with no emphasis when the edited lines disagree by more than a cent. **[CODE]** · Fix: warning-toned banner with a "use receipt total" one-tap reconcile.

### UX-32 — Budget accepts zero and nonsense values
`Finance.tsx:414-420` only rejects unparseable input. **[CODE]** · Fix: require > 0, cap at a sane maximum, inline error.

### UX-33 — "Saved receipt image" toast fires even when the download was blocked
`useReceiptShare.ts:110-118` — fire-and-forget `<a download>`; `:58-83` `generatePng` has no timeout, so a hung render spins forever. `:137-143` unsupported-share fallback is a passive toast with no "save instead" action. **[CODE]** · Fix: timeout the PNG generation (reuse `invokeWithTimeout`), only toast success on a resolved save, and make the fallback actionable.

### UX-34 — Empty-month state in History has no "clear filter" action
`History.tsx:141-157` tells the user to "pick another month" but offers no button; the only path is reopening the select. **[CODE]** · Fix: "show all months" action inside the empty state.

### UX-35 — Trip Detail's "shop from this list" can be replayed via back
`TripDetail.tsx:154-188` navigates without `replace` and resets `revisiting`, so back-then-tap creates a second list. **[CODE]** · Fix: `replace: true` and keep the button disabled once a list has been created.

### UX-36 — Guards render bare "Loading…" text
`RequireAuth.tsx:7`, `RequireOnboarding.tsx:36` bypass `PageLoadGate`/`Spinner`, producing a different loading language on the most-seen surface. **[REPRO]** · Fix: route both through `PageLoadGate`.

### UX-37 — Verify screen flashes a blank recipient before redirecting
`Verify.tsx:32-34` redirects in an effect, so "We sent a 6-digit code to " renders empty for a frame on refresh. **[CODE]** · Fix: guard the render, not just the effect.

### UX-38 — Onboarding routes are outside the error boundary
`App.tsx:40-51` — a render crash in Hero/Showcase/Signup/Verify/Budget gives a white screen. **[CODE]** · Fix: wrap the onboarding element tree in `RouteErrorBoundary`.

### UX-39 — Onboarding draft outlives the account it belongs to
`Signup.tsx:36` only seeds `firstName` when empty, so a stale name from an abandoned signup carries into a different account's onboarding. **[INFER]** · Fix: clear the draft on successful sign-in with a different email, and on sign-out.

### UX-40 — `BackHeader` has no fallback when the history stack is empty
`BackHeader.tsx:25` calls `navigate(-1)`; on a deep link this exits the app or lands nowhere. **[CODE]** · Fix: `navigate(-1)` only when `window.history.state?.idx > 0`, else the page's declared parent route.

### UX-41 — Duplicate onboarding-status query causes a double loading flash
`RequireOnboarding.tsx:19-31` and `Signup.tsx:42-53` independently query `user_onboarding`. **[CODE]** · Fix: single source in a context/react-query key.

### UX-42 — Group-by and period selections don't survive navigation
`ListDetail` groupBy, `ActiveTrip` tripGroupBy, `Finance` period are plain `useState`. **[CODE]** · Fix: persist to `sessionStorage` per surface (Finance period at minimum, since the receipt is shared from there).

### UX-43 — Store context lost on a new session mid-trip, with no notice
`ActiveTrip.tsx:173-181` restores the store from `sessionStorage` only. **[CODE]** · Fix: persist the store on the trip row and restore from the DB.

### UX-44 — Nearby-store search is dead code
`geolocation.ts` exports `findNearbyStores`/permission and timeout errors; no call site in `ActiveTrip.tsx`. The store modal is manual-entry only, so every documented location failure path is unreachable. **[CODE]** · Product decision required: ship nearby search or delete the module.

## Low

- **UX-45** Send-code button never changes label while sending (`Signup.tsx:131-139`). **[CODE]**
- **UX-46** "Create list" shows no in-progress label (`Lists.tsx:40-52`). **[CODE]**
- **UX-47** Note field silently truncates at 25 chars with no counter (`ListDetail.tsx:283,329`). **[CODE]**
- **UX-48** Manual entry from the scanner is a single low-emphasis control with no persistent hint after repeated scan failures (`Scanner.tsx:61-72`). **[CODE]**
- **UX-49** History's scan entry point is icon-only with no visible label (`History.tsx:130-136`). **[CODE]**
- **UX-50** Onboarding progress is text ("step 2 of 3") on three screens but dots on Showcase. **[CODE]**
- **UX-51** Showcase autoplay doesn't pause when the tab is hidden, so returning skips beats (`Showcase.tsx:39-43`). **[CODE]**
- **UX-52** Delete-account confirm text resets on every reopen (`Profile.tsx:349-352`). **[CODE]**
- **UX-53** Manual-entry path pre-fills the list name "Receipt Essentials" while the OCR path does not (`ScanReceipt.tsx:251` vs `:277`). **[CODE]**
- **UX-54** `pages/Index.tsx` is unreferenced scaffold. **[CODE]**
- **UX-55** `QuickAddRow.tsx` is unreferenced and duplicates the add-pad logic. **[CODE]**
- **UX-56** Trip Detail can't distinguish "deleted" from "not yours" (`TripDetail.tsx:200-207`). **[CODE]**
- **UX-57** History/Trip Detail never refetch after mount. **[INFER]**
- **UX-58** Saved trips with $0 total and 1 item appear in Home and History. **[REPRO]** — likely a residue of the earlier persist bug; needs data validation.
- **UX-59** Concurrent receipt saves can create duplicate stores (`ScanReceipt.tsx:380-391`). **[INFER]**
- **UX-60** Parse-failure screen offers "retake" but no "choose a different file" (`ScanReceipt.tsx` error stage). **[CODE]**

---

# Flow scorecard (1–5)

| Journey | Disc. | Compr. | Effic. | Feedback | Err.prev | Recov. | State | Confidence |
|---|---|---|---|---|---|---|---|---|
| Auth & onboarding | 4 | 4 | 4 | 3 | 3 | **2** | 3 | 3 |
| Home & navigation | 3 | 3 | 4 | 3 | **2** | **2** | **2** | **2** |
| Lists | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 3 |
| List item editing | **2** | 3 | 3 | 3 | 3 | 3 | **2** | **2** |
| Shopping trip | 4 | 4 | 4 | 4 | **2** | **1** | **2** | **2** |
| Receipt scanning | 4 | 3 | 3 | 3 | **2** | **2** | **2** | **2** |
| History & trip detail | 4 | 4 | 4 | 3 | **1** | **1** | 4 | **2** |
| Finance | 4 | 4 | 4 | 3 | 3 | **2** | 3 | 3 |
| Profile & account | 4 | 4 | 4 | **2** | **2** | **2** | 4 | **2** |

**Scores of 1–2 explained**

- *Home & navigation* — error prevention 2, recoverability 2, state 2, confidence 2: UX-01 lets one tap destroy a live trip, and there is no route back into it.
- *List item editing* — discoverability 2: edit/delete are hover-only (UX-12) and recategorise is an unhinted long-press (UX-13). State 2: rename and tag drafts vanish on outside tap (UX-30).
- *Shopping trip* — recoverability 1: exit is an unrecoverable delete with understated copy (UX-06) and there is no undo anywhere in the trip. Error prevention 2: no confirm before replacing an active trip (UX-01). State 2: store context is session-only (UX-43).
- *Receipt scanning* — error prevention 2: cancel discards all edits unprompted (UX-17); total mismatch is a grey caption (UX-31). Recoverability 2 / state 2: same, plus one generic failure message (UX-18).
- *History & trip detail* — error prevention 1 and recoverability 1: the route itself deletes a year of data with no confirmation and no undo (UX-02).
- *Profile & account* — feedback 2: sign-out and avatar upload are silent (UX-19, UX-22). Error prevention 2: store delete is unguarded (UX-20). Recoverability 2: partial account deletion leaves an inconsistent state (UX-21).
- *Auth & onboarding* — recoverability 2: Google can lock permanently (UX-08), resend burns a 45s cooldown on failure (UX-09), and the guard can hang forever (UX-05).

---

# Remediation plan

## Phase 1 — Critical protection and recovery

| Task | Resolves | Behaviour change | Touches | Dep | Pri | Effort |
|---|---|---|---|---|---|---|
| **T-01** Active-trip awareness | UX-01, UX-24, UX-25 | `useActiveTrip()` hook; resume banner on Home; confirm before replacing an active trip, naming list + item count + total; hidden free-trip list removed with its trip | `Home.tsx`, `ListDetail.tsx`, `StartTrip.tsx`, `ActiveTrip.tsx`, new `hooks/useActiveTrip.ts` | — | P0 | M |
| **T-02** Remove History retention delete | UX-02 | drop the DELETE and the `gte(cutoff)` filter; no destructive writes on read routes | `History.tsx` | — | P0 | S |
| **T-03** Not-found states for detail routes | UX-03, UX-56 | null result → `ErrorState` with a parent-route action; distinguish RLS-denied from deleted where the response allows | `ListDetail.tsx`, `TripDetail.tsx`, `ErrorState.tsx` | — | P0 | S |
| **T-04** Stop mutating list rows on trip start | UX-04 | remove the checked/price reset, or gate it behind a confirm | `Home.tsx`, `ListDetail.tsx` | product decision | P0 | S |
| **T-05** Guards can never hang | UX-05, UX-41, UX-36 | try/catch + 6s timeout, fail open; single shared onboarding-status query; `PageLoadGate` for guard loading | `RequireOnboarding.tsx`, `RequireAuth.tsx`, `Signup.tsx` | — | P0 | S |
| **T-06** Trip exit safety | UX-06 | dynamic confirm copy with counts and total; "save & exit" when the cart is non-empty; destructive button reads "discard trip" | `ActiveTrip.tsx`, `ConfirmDialog.tsx` | VH-26 | P0 | M |
| **T-07** Pending-write guard | UX-23, UX-35, UX-45, UX-46 | shared `usePending()`; every mutating primary button disables + shows a spinner label; post-create navigations use `replace` | `ListDetail.tsx`, `ActiveTrip.tsx`, `ScanReceipt.tsx`, `Lists.tsx`, `TripDetail.tsx`, `Profile.tsx` | — | P0 | M |
| **T-08** Account-deletion integrity | UX-21 | idempotent edge function; on partial failure force sign-out with an explanatory screen | `delete-account/index.ts`, `Profile.tsx` | backend validation | P0 | M |

## Phase 2 — Navigation and continuity

| Task | Resolves | Behaviour change | Touches | Pri | Effort |
|---|---|---|---|---|---|
| **T-09** Onboarding route guards | UX-07, UX-39 | `RedirectIfOnboarded` on all public onboarding routes; clear the draft on sign-out and on an email change | `App.tsx`, `useOnboarding.tsx`, new guard | P1 | S |
| **T-10** Detail-route chrome fix | UX-26 | correct the `/trip/:id` regex; verify against `/trip/new` | `AppLayout.tsx` | P1 | S |
| **T-11** Back fallbacks | UX-40 | `navigate(-1)` only with real history, else a declared parent | `BackHeader.tsx` + callers | P1 | S |
| **T-12** Selection persistence | UX-42, UX-43 | groupBy/period to `sessionStorage`; active store persisted on the trip row | `ListDetail.tsx`, `ActiveTrip.tsx`, `Finance.tsx`, migration | P1 | M |
| **T-13** Onboarding error boundary | UX-38 | wrap onboarding routes | `App.tsx` | P1 | S |

## Phase 3 — Forms and input

| Task | Resolves | Behaviour change | Touches | Pri | Effort |
|---|---|---|---|---|---|
| **T-14** Inline validation & disabled reasons | UX-10, UX-15, UX-32, UX-47 | inline field errors that persist; disabled primary buttons carry a visible reason; note counter; budget must be > 0 | `Verify.tsx`, `ListDetail.tsx`, `Finance.tsx` | P1 | M |
| **T-15** Draft commit semantics | UX-30 | outside tap commits list rename and tag; otherwise explicit "discarded" feedback | `ListDetail.tsx` | P1 | S |
| **T-16** Unsaved-work confirms | UX-17, UX-52 | discard confirm on receipt review when edited; preserve the typed DELETE across reopen | `ScanReceipt.tsx`, `Profile.tsx` | P1 | S |

## Phase 4 — Core product flows

Ordered: **Onboarding** T-09, T-17 (Google timeout UX-08, resend cooldown UX-09, verify flash UX-37, progress consistency UX-50, autoplay pause UX-51) → **Lists** T-18 (touch-visible row actions UX-12, drag handle + non-gesture recategorise UX-13, non-interactive checkboxes outside a run UX-14, remove dead `QuickAddRow` UX-55) → **Trips** T-19 (AI match may annotate but never dismiss UX-27, undo on uncheck-substitute UX-28, no confetti on removal UX-29, nearby-store decision UX-44) → **Scanning** T-20 (no-camera empty state UX-16, cause-specific failure copy UX-18, mismatch banner + reconcile UX-31, choose-another-file UX-60, consistent list-name defaults UX-53, store de-dupe UX-59) → **History** T-21 (clear-filter action UX-34, scan entry label UX-49, refetch on focus UX-57, audit $0 trips UX-58) → **Finance** T-22 (share/save timeouts and honest toasts UX-33) → **Profile** T-23 (sign-out feedback UX-19, store-delete confirm UX-20, avatar affordance + validation UX-22).

## Phase 5 — Feedback and recovery

**T-24 — Unified load/empty/error contract.** Resolves UX-11 and hardens every screen: each data surface returns `{data, error}`; `ErrorState` with retry for failures, `EmptyState` only for confirmed-empty; `PageLoadGate` everywhere; offline detection toast; undo toasts for reversible deletions (extras, substitutes, stores). Touches every page + `EmptyState`/`ErrorState`. P1, Large.

**T-25 — Permission and capability states.** Camera denied/unavailable and share/download unsupported each render an explicit state with a working alternative. `ScanReceipt.tsx`, `Scanner.tsx`, `useReceiptShare.ts`. P2, Medium.

## Phase 6 — End-to-end verification

Happy paths: signup→verify→budget→home; list→run→check→end→receipt; scan→review→save→history. Failure paths: backend offline on each route (must reach an error state with retry, never an infinite gate); OTP wrong code; parse 429/402; avatar too large; delete-account failure. Direct-link tests: every route cold, signed-in and signed-out. Refresh tests: mid-trip, mid-review, mid-onboarding. Back tests: after every create/save; deep-link back fallback. Slow-network: 3G throttle on save-trip and receipt-save; no duplicate rows. Duplicate-action: double-tap every primary button. Interrupted flows: background during a trip, then return via Home. Destructive: exit trip, delete list, delete store, delete account — each confirms, each is recoverable or clearly labelled irreversible. Touch-only: complete a full run and delete a list item without hover. Keyboard-only: onboarding, add item, budget edit.

## Traceability

| Task | UX issues |
|---|---|
| T-01 | UX-01, UX-24, UX-25 |
| T-02 | UX-02 |
| T-03 | UX-03, UX-56 |
| T-04 | UX-04 |
| T-05 | UX-05, UX-36, UX-41 |
| T-06 | UX-06 |
| T-07 | UX-23, UX-35, UX-45, UX-46 |
| T-08 | UX-21 |
| T-09 | UX-07, UX-39 |
| T-10 | UX-26 |
| T-11 | UX-40 |
| T-12 | UX-42, UX-43 |
| T-13 | UX-38 |
| T-14 | UX-10, UX-15, UX-32, UX-47 |
| T-15 | UX-30 |
| T-16 | UX-17, UX-52 |
| T-17 | UX-08, UX-09, UX-37, UX-50, UX-51 |
| T-18 | UX-12, UX-13, UX-14, UX-55 |
| T-19 | UX-27, UX-28, UX-29, UX-44 |
| T-20 | UX-16, UX-18, UX-31, UX-53, UX-59, UX-60 |
| T-21 | UX-34, UX-49, UX-57, UX-58 |
| T-22 | UX-33 |
| T-23 | UX-19, UX-20, UX-22 |
| T-24 | UX-11, plus feedback hardening for UX-05, UX-33 |
| T-25 | UX-16, UX-48 |
| T-26 (cleanup) | UX-54 |

Every UX ID appears in at least one task.

---

# Final summary

**Ten highest-priority problems:** UX-01 (live trip unreachable and silently destroyed), UX-02 (History deletes a year of trips on every visit), UX-06 (exit deletes a trip with soft copy and no save-instead), UX-03 (phantom list route), UX-04 (list state wiped on trip start), UX-05 (guard hangs forever offline), UX-11 (failures look like emptiness), UX-12 (hover-only destructive controls on a touch app), UX-17 (receipt edits discarded with one tap), UX-21 (partial account deletion).

**Most likely to cause abandonment:** returning to a trip after an interruption (UX-01); a first scan that fails with unhelpful copy (UX-16, UX-18); an offline first launch that hangs on "Loading…" (UX-05).

**Confirmed data-loss risks:** UX-02 (verified in code, unconditional DELETE), UX-01, UX-04, UX-06, UX-17. UX-21 is a confirmed integrity risk pending backend validation.

**Highest-value quick wins:** T-02 (one line), T-03, T-10, T-05, T-19's undo toasts, T-23's sign-out feedback.

**Missing feedback and recovery mechanisms:** no undo anywhere in the app; no retry action on any failed fetch; no offline state; no pending state on mutating buttons; no distinction between empty and failed.

**Step reductions available:** free-shop trips need no hidden list per run; the double onboarding-status query can be one; Home can start a run in one tap when only one list exists.

**Product decisions needed from you:** (1) should a list remember prices/checks between runs (UX-04)? (2) do you want any retention policy at all, and if so opt-in with export (UX-02)? (3) ship nearby-store search or delete the module (UX-44)? (4) should exiting a non-empty trip offer "save instead" (UX-06)? (5) should abandoned trips auto-save rather than delete (UX-01)?

**Needs device or backend validation:** camera permission grant/deny and native share (simulator reports no camera — UX-16 was reproduced only in the unavailable-camera state); Capacitor session restore after backgrounding; delete-account partial-failure behaviour; the $0 saved trips seen in production data (UX-58).

**Global fixes to land before page-specific work:** T-24 (load/empty/error contract), T-07 (pending guard), T-05 (guards never hang). These three remove the root cause behind roughly a third of the findings.

**Recommended order:** T-02 → T-03 → T-05 → T-01 → T-06 → T-04 → T-07 → T-08 → Phase 2 → T-24 → Phase 3 → Phase 4 → T-25 → Phase 6.
