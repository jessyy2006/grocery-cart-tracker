-- UP
--
-- Per-user rate limiting for the three AI edge functions.
--
-- Every AI call now bills to our own GEMINI_API_KEY, and all three functions are
-- reachable by any authenticated user. Without a limit, one scripted caller can
-- run the bill up with no ceiling.
--
-- Fixed-window counter rather than a token bucket: the failure mode we care about
-- is "unbounded spend", not "perfectly smooth pacing", and a fixed window is one
-- round trip with no background refill job.

create table if not exists public.ai_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  count int not null default 0,
  primary key (user_id, bucket)
);

-- RLS on with NO policies: this table is reachable only through the security
-- definer function below. A client cannot read its own counter, and more to the
-- point cannot reset it.
alter table public.ai_rate_limits enable row level security;

/**
 * Records one call against (current user, bucket) and reports whether it is
 * within the limit.
 *
 * The user is taken from auth.uid() inside the function rather than passed in,
 * so a caller cannot consume or bypass someone else's quota.
 *
 * Limits and the window are hard-coded here, NOT taken as parameters. This
 * function is granted to `authenticated`, so any signed-in client can call it
 * directly over RPC — and a caller-supplied window is a complete bypass: passing
 * p_window_seconds = 0 makes the existing window read as expired on every call,
 * resetting the counter to 1 forever. Changing a limit is a migration, which is
 * the correct amount of friction for a spending control.
 *
 * Calling this directly is still possible; it just cannot help. The only effect
 * available to a client is spending its own quota faster.
 *
 * Returns true when the call is allowed, false when the limit is already spent,
 * and false for an unknown bucket so a typo fails closed rather than open.
 * Concurrency is handled by ON CONFLICT DO UPDATE, which takes a row lock, so
 * simultaneous calls serialise instead of racing past the ceiling.
 */
create or replace function public.consume_rate_limit(p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_limit int;
  v_window_seconds int;
  v_count int;
begin
  -- No identity, no quota. The edge functions verify the JWT before calling
  -- this, so reaching here unauthenticated means something is wrong upstream.
  if v_user is null then
    return false;
  end if;

  -- Sized to how each function is actually called: `match` runs once per scanned
  -- barcode so a large shop is legitimately chatty and is the cheapest call;
  -- `receipt` sends a full image and is the most expensive; `insights` fires on
  -- the Finance screen, so its ceiling mostly catches a render loop.
  case p_bucket
    when 'match'    then v_limit := 300; v_window_seconds := 3600;
    when 'receipt'  then v_limit := 30;  v_window_seconds := 3600;
    when 'insights' then v_limit := 60;  v_window_seconds := 3600;
    else return false;
  end case;

  insert into public.ai_rate_limits as arl (user_id, bucket, window_start, count)
  values (v_user, p_bucket, now(), 1)
  on conflict (user_id, bucket) do update
    set
      -- Both CASE expressions read the pre-update row, so they agree on whether
      -- the existing window has expired.
      window_start = case
        when arl.window_start < now() - make_interval(secs => v_window_seconds)
          then now()
        else arl.window_start
      end,
      count = case
        when arl.window_start < now() - make_interval(secs => v_window_seconds)
          then 1
        else arl.count + 1
      end
  returning arl.count into v_count;

  return v_count <= v_limit;
end;
$$;

-- Callable by signed-in users only. anon has no quota to consume.
revoke all on function public.consume_rate_limit(text) from public, anon;
grant execute on function public.consume_rate_limit(text) to authenticated;

-- DOWN
--
-- drop function if exists public.consume_rate_limit(text);
-- drop table if exists public.ai_rate_limits;
