## Onboarding Flow — Implementation Plan

### 1. Data layer (migration)

New table `user_onboarding` (one row per user):

```sql
-- UP
create table public.user_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  gender text,                 -- 'male' | 'female' | 'other' | 'prefer_not'
  age_range text,              -- '18-24' | '25-34' | '35-44' | '45-54' | '55+'
  goals text[] not null default '{}',
  shopping_behavior text,      -- 'plan_all' | 'plan_most' | 'decide_in_store'
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_onboarding enable row level security;
create policy "own onboarding read"   on public.user_onboarding for select using (auth.uid() = user_id);
create policy "own onboarding insert" on public.user_onboarding for insert with check (auth.uid() = user_id);
create policy "own onboarding update" on public.user_onboarding for update using (auth.uid() = user_id);
```

Default budget: on completion, upsert `user_budgets` with `monthly_cents = 40000` if user skipped (currency-agnostic; treated as 400 in active currency).

### 2. Trigger logic

- LocalStorage flag: `cartwise:onboarded` (per device, per the user's choice).
- New `<RequireOnboarding>` wrapper inside `RequireAuth` → if user logged in and flag missing → redirect to `/onboarding`.
- Setting flag happens after Screen 6 CTA (Start Trip) or skip (Home).

### 3. Routes & screens

New route group `/onboarding/*` (no `AppLayout` chrome — clean full-screen):


| #   | Path                        | Screen                                                                    |
| --- | --------------------------- | ------------------------------------------------------------------------- |
| 0   | `/onboarding`               | Value intro (animated card preview)                                       |
| 1   | `/onboarding/signup`        | Skipped if already authed; else Google + email                            |
| 2   | `/onboarding/profile`       | First/last name (autofill from Google `user_metadata`), gender, age range |
| 3   | `/onboarding/goals`         | Multi-select chips                                                        |
| 4   | `/onboarding/budget`        | Numeric input + Skip                                                      |
| 5   | `/onboarding/behavior`      | Single-select                                                             |
| 6   | `/onboarding/first-list`    | Pre-filled editable list (milk, eggs, bread)                              |
| 7   | `/onboarding/feature-intro` | Modal-style finance/receipt intro, dismissible                            |


Shared layout:

- Top-right Skip (text) where applicable
- Bottom primary CTA matching scan-barcode button (`Button` default = primary green)
- Progress dots (subtle, top)

State held in a `useOnboarding()` context; persisted to `user_onboarding` only on Screen 6 submit (single write) to keep flow snappy. Budget persisted at same point. Name persisted to `profiles.display_name` too.

### 4. First-list handoff

- Screen 6 "Start your first trip":
  - Create a temporary `shopping_list` + items from edits, then route through existing Home `startTripWith(listId)` logic (set `sessionStorage.pendingTrip:listId`, navigate `/trip/new`).
- Skip → discard list, navigate `/`.
- Either path: set `cartwise:onboarded=1` and stamp `completed_at`.
- Feature intro (Screen 7) shown as a `<Dialog>` overlay on the destination (Home or Trip) on first arrival, controlled by `cartwise:featureIntroShown`.

### 5. Personalization wiring

- `Home.tsx` greeting: read `user_onboarding.first_name` (cached in `useAuth` context extension or a `useProfile()` hook). Show `Welcome back, {firstName}` else generic.
- Finance insights edge function (`finance-insights`): pass `goals` + `shopping_behavior` in the request body so the prompt can tailor messaging. Update `supabase/functions/finance-insights/index.ts` accordingly.

### 6. Visual / interaction details

- Value-intro animation: framer-motion already? If not, use Tailwind `animate-in slide-in-from-bottom` + a subtle floating loop via CSS keyframe. Card composition: a fake Finance receipt + a checked grocery list (static mock components, not live data).
- All primary CTAs: `<Button size="lg" className="w-full">` (already maps to dark primary green per design system).
- Skip: `<Link className="absolute right-4 top-4 text-sm text-muted-foreground">Skip</Link>`.

### 7. Files to add / change

**Add**

- `supabase/migrations/<ts>_user_onboarding.sql`
- `src/pages/onboarding/Layout.tsx` (shared shell + progress)
- `src/pages/onboarding/{Intro,Profile,Goals,Budget,Behavior,FirstList,FeatureIntro}.tsx`
- `src/hooks/useOnboarding.tsx` (context + draft state)
- `src/hooks/useProfile.tsx` (firstName lookup, cached)
- `src/components/RequireOnboarding.tsx`

**Edit**

- `src/App.tsx` — add `/onboarding/*` routes outside `AppLayout`; wrap protected routes with `RequireOnboarding`.
- `src/pages/Home.tsx` — personalized greeting; trigger feature-intro modal on first visit.
- `src/integrations/supabase/types.ts` — auto-regenerated, no manual edit.
- `supabase/functions/finance-insights/index.ts` — include goals/behavior in prompt.

### 8. Reality check / risks

- **"First login this device"detected on the users on boarded or not boolean val. If true, skip the onboarding flow and land on the home page. If not, go through on boarding.**
- **Google name autofill**: `session.user.user_metadata.full_name` / `given_name` is only populated when signing in with Google; email signup users will type names manually. Realistic.
- **Skipping signup**: if a user is already authed and lands on `/onboarding`, we skip Screen 1 and jump to Screen 2. Fine.
- **Pre-filled list discarded on skip**: we won't insert it at all unless user proceeds via "Start your first trip" — avoids dangling lists.
- **Default budget = $400 CAD: if user chooses diff currency, convert into that currency** 
- **Feature intro on top of `/trip/new**`: the trip-start flow has its own important UI. Recommend showing feature-intro only when user lands on Home (skip path), not when starting trip — keeps the "first real value moment" uninterrupted. Flag if you disagree.
- Everything else in the PRD is realistic and small-scope. ETA: ~1 focused implementation pass.

Confirm and I'll execute.