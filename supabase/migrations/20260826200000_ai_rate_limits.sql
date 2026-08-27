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
 * Returns true when the call is allowed, false when the limit is already spent.
 * Concurrency is handled by ON CONFLICT DO UPDATE, which takes a row lock, so
 * simultaneous calls serialise instead of racing past the ceiling.
 */
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count int;
begin
  -- No identity, no quota. The edge functions verify the JWT before calling
  -- this, so reaching here unauthenticated means something is wrong upstream.
  if v_user is null then
    return false;
  end if;

  insert into public.ai_rate_limits as arl (user_id, bucket, window_start, count)
  values (v_user, p_bucket, now(), 1)
  on conflict (user_id, bucket) do update
    set
      -- Both CASE expressions read the pre-update row, so they agree on whether
      -- the existing window has expired.
      window_start = case
        when arl.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else arl.window_start
      end,
      count = case
        when arl.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else arl.count + 1
      end
  returning arl.count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Callable by signed-in users only. anon has no quota to consume.
revoke all on function public.consume_rate_limit(text, int, int) from public, anon;
grant execute on function public.consume_rate_limit(text, int, int) to authenticated;

-- DOWN
--
-- drop function if exists public.consume_rate_limit(text, int, int);
-- drop table if exists public.ai_rate_limits;
