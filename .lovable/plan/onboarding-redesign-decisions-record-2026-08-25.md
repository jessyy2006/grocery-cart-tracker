# Onboarding redesign — decisions record

Not an implementation plan. This is the agreed product/design spec from our discussion, for you to review before I turn it into build steps.

## Flow shape

```text
hero  →  showcase (5 cards)  →  name+email  →  6-digit code  →  budget  →  home
         ↑ skip ──────────────────┘            (Google path skips name + code)
```

## 1. Hero

- "Cartwise / your grocery shopping hero", receipt artwork circling the headline.
- Primary: "show me how". Secondary text link: "already have an account? log in".
- Log in reuses the signup surface minus the name field — email + OTP, or Google. No passwords anywhere in the app, so no password-reset flow is owed.

## 2. Feature showcase — 5 cards, ~12s total

Order and copy:

| # | Title | Subtitle | Demo shows |
|---|---|---|---|
| 1 | build lists | tag items, add notes, reuse lists every week | creating a list, adding an item with tags and a note |
| 2 | see your cart total live | track extras, substitutes, or shop freely without a list! | starting a trip, scanning a barcode, cart total updating |
| 3 | collect receipts for repeat runs | you can create lists from any run | ending a trip, receipt popup, zoom to final screen |
| 4 | or scan prev receipts | you can shop from previous runs too! | scanning a past receipt, logging it, saving |
| 5 | track your spending habits | share your stats with friends | finance page → yearly receipt → swipe barcode to share |

Motion and interaction:

- Active card sits center, enlarged. Demo loops immediately on arrival.
- Exiting cards flatten, blur, shrink and recede **left**, behind the incoming card — art-gallery carousel. (Swipe direction and motion direction agree.)
- Auto-advance after 2 demo loops. Swipe left accelerates. **Forward only** — no back.
- Persistent "skip" top-right → goes straight to signup.
- Progress: 5 dots, filled as you go.
- Demos are animated mock components built in-app, not screen recordings — small payload, no loading states, always on-brand.

Transition into signup: all cards fly off in one gesture, screen clears to white.

Alternates recorded in case this doesn't feel right later:
- Cards congregate into the hero's receipt artwork (full-circle callback).
- Last card morphs/shrinks into the signup form container.

## 3. Signup — name + email

- Persistent grey progress caption above the headline, swapping copy per screen: "ready to start saving?" → "almost there…" → "one last step".
- Entrance motion (caption shrinks 25%, greys, moves up; headline fades into center) plays on screen entry, not repeated on every subsequent screen.
- Headline: "first, tell us who you are."
- Fields: first name, email. Nothing else.
- "continue with Google" available.

## 4. Six-digit code

- Headline "confirm the 6 digit code", caption "almost there…".
- Auto-submits on the 6th digit — no confirm button.
- iOS one-time-code autofill supported.
- "didn't get it? click here to resend" with a 30s cooldown to avoid tripping auth email rate limits.
- Wrong/expired code shows an inline error under the field, no screen change.

## 5. Budget

- Caption "one last step", headline "set your budget".
- Currency dropdown + amount, label states **monthly** explicitly.
- Skippable via a "set this later" text link; a default is applied if skipped.
- Primary: "start saving".

## 6. Google path

Google returns a verified email and a name, so it skips both the name screen and the code screen and lands directly on budget.

## 7. Landing

"start saving" → Home, in its empty state pointing at "new list". No feature-intro dialog — the showcase already did that job.

## 8. Resume behavior

Showcase always restarts from the hero. Signup resumes at the furthest step reached — a verified email or captured name is never re-asked.

## 9. Removed permanently

Last name, gender, age range, goals, shopping behavior, and the seeded first list (milk/eggs/bread) are all dropped from onboarding. None of them currently change what the user sees in-product.

## Still open

- Exact wording of the default budget applied when skipped, and whether the user is told a default was set.
- Whether the hero's circling receipt cards are static or animate on entry.
