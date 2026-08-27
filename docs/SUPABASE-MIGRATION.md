# Moving Supabase off Lovable

Moving the backend from the Lovable-managed project (`ajtmlttnljbcztivbphh`, in
Lovable's organisation) to a Supabase project on your own account.

**Do this before inviting TestFlight testers.** Right now the database holds your own
test data. Once testers sign up you are migrating live accounts and sessions people
care about, and the auth-user problem below stops being theoretical.

---

## What carries over, and what does not

| | Carries over | How |
|---|---|---|
| Schema | Yes | 17 migrations replay onto an empty project |
| Storage bucket | Yes | now created by migration (see gap 1 below) |
| Row data | Yes | CSV or `pg_dump` per table |
| **Auth users** | **No** | see below — this is the hard part |
| Edge functions | Yes | `supabase functions deploy` |
| Secrets | No | re-set by hand |

**Auth users are the reason to do this early.** `auth.users` rows carry hashed
passwords and identity links; you cannot move them with a plain SQL dump without
Supabase support involvement. Every `user_id` in the app's tables is a foreign key
to `auth.users`, so migrating row data without the users behind it produces orphans
the new cascades will reject.

Since the app is email-OTP only, there are no passwords to preserve — a user "moves"
by signing in again on the new project and getting a new `auth.users` row with a new
UUID. That means either:

- **Start clean** (recommended now): don't migrate row data. You lose your own test
  trips and lists, which cost nothing to recreate.
- **Remap** (only if data matters): export rows, sign each user up on the new project,
  build an old-UUID → new-UUID map, rewrite every `user_id` during import. Doable, but
  it is real work and it grows with every tester.

---

## Two gaps this repo had

Both are fixed in migrations, but worth knowing they existed, because they are the
kind of thing that only surfaces on a fresh project:

1. **The `avatars` bucket was never in a migration.** Four RLS policies referenced
   `bucket_id = 'avatars'`, but the bucket itself was created by hand in the Lovable
   dashboard. On a fresh project, avatar upload would fail with "Bucket not found".
   Fixed by `20260826190000_create_avatars_bucket.sql`.
2. **`user_onboarding` was never in a migration** and its RLS was unverifiable from
   the repo. Fixed by `20260826180000_onboarding_backfill_and_user_cascades.sql`.

Nothing else drifted: all 11 tables in `types.ts` are now created by migrations, and
no migration forward-references a table created later.

---

## Procedure

### 1. Create the project

Supabase dashboard → New project, in **your** organisation. Pick the region closest
to your users. Save the database password somewhere durable — it is shown once.

### 2. Replay the schema

```bash
supabase login
supabase link --project-ref <NEW_REF>
supabase db push
```

`db push` applies every file in `supabase/migrations/` in timestamp order. Expect 17.

> Not yet verified by replay. Docker was not available on this machine, so the
> migrations have only been checked statically (ordering, forward references, table
> coverage). If you install Docker, `supabase start && supabase db reset` replays them
> against a local Postgres and will catch anything the static check missed — worth
> doing before touching the real project.

### 3. Deploy the edge functions

```bash
supabase functions deploy delete-account
supabase functions deploy parse-receipt
supabase functions deploy finance-insights
supabase functions deploy match-list-item
```

### 4. Set secrets

```bash
supabase secrets set GEMINI_API_KEY=...
```

Optionally, to override the AI rate limits without a deploy (defaults in
`supabase/functions/_shared/rateLimit.ts`):

```bash
supabase secrets set RATE_LIMIT_RECEIPT=30 RATE_LIMIT_MATCH=300 RATE_LIMIT_INSIGHTS=60
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically. `LOVABLE_API_KEY` is no longer read by anything.

### 5. Configure auth

Not covered by `db push` — see `MOBILE.md` → *Required Supabase configuration for
email OTP*:

- Magic Link template containing `{{ .Token }}`
- OTP expiry `900`, max frequency `60s`
- SMTP provider
- Redirect allow-list, if Google OAuth is being re-enabled

### 6. Repoint the app

`.env`, all three values from the new project's API settings:

```
VITE_SUPABASE_PROJECT_ID="<NEW_REF>"
VITE_SUPABASE_URL="https://<NEW_REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<new anon key>"
```

Also update `project_id` in `supabase/config.toml`, and drop the Lovable warning at
the top of that file — it stops applying once the project is yours, and `config push`
becomes a safe way to manage auth settings.

Then regenerate types so drift cannot creep back in:

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### 7. Verify before trusting it

In order, on a real device:

1. Sign up with a new email → code arrives, six digits, lands on `/onboarding/budget`
2. Create a list, run a trip, scan a receipt (exercises `parse-receipt` + `GEMINI_API_KEY`)
3. Scan a barcode against an open list item (exercises `match-list-item`)
4. Upload a profile photo (exercises the `avatars` bucket — the gap above)
5. Delete the account from Profile → clean success
6. Re-run 1 with the same email → proves deletion actually released it

Step 5 is the one App Review tests, and step 4 is the one most likely to fail on a
fresh project.

`finance-insights` is deliberately not in this list: nothing in the app calls it (see
below), so there is no UI path that would exercise it.

### finance-insights has no caller

The function is deployed and reachable by any authenticated user, but no client code
invokes it — `Finance.tsx` renders its insights section from local computation. Either
wire it up or stop deploying it; a reachable function that no one watches is the kind
of thing that gets abused quietly, which is why it is rate limited despite being
unused.

### 8. Decommission

Only after the above passes. Keep the Lovable project paused rather than deleted for
a couple of weeks — it is the only copy of the old data.
