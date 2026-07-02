-- 0004_streaks.sql
-- Streaks are computed on read rather than stored/incremented, so there's no
-- cron job or scheduled function required to "break" a streak after a missed
-- day — a missed day simply stops showing up when this is queried. Cheaper to
-- reason about and impossible for a stored counter to drift out of sync.

create or replace function task_current_streak(p_task_id uuid)
returns integer
language plpgsql
stable
as $$
declare
  v_streak integer := 0;
  v_check_date date := current_date;
  v_has_today boolean;
begin
  select exists(select 1 from task_logs where task_id = p_task_id and log_date = current_date) into v_has_today;
  if not v_has_today then
    v_check_date := current_date - 1; -- not done today yet still counts through yesterday
  end if;

  loop
    if exists(select 1 from task_logs where task_id = p_task_id and log_date = v_check_date) then
      v_streak := v_streak + 1;
      v_check_date := v_check_date - 1;
    else
      exit;
    end if;
  end loop;

  return v_streak;
end;
$$;

-- % of the last N days a habit was completed (for the Habits screen success rate).
create or replace function task_success_rate(p_task_id uuid, p_window_days integer default 30)
returns integer
language sql
stable
as $$
  select round(
    100.0 * (
      select count(*) from task_logs
      where task_id = p_task_id and log_date > current_date - p_window_days
    ) / p_window_days
  )::integer;
$$;

-- A calendar day counts as "active" for the overall streak if the user logged
-- a habit/quest, a workout, or a study session on it.
create or replace function is_active_on(p_user_id uuid, p_date date)
returns boolean
language sql
stable
as $$
  select exists(select 1 from task_logs where user_id = p_user_id and log_date = p_date)
      or exists(select 1 from workouts where user_id = p_user_id and workout_date = p_date)
      or exists(select 1 from study_sessions where user_id = p_user_id and session_date = p_date);
$$;

create or replace function profile_current_streak(p_user_id uuid)
returns integer
language plpgsql
stable
as $$
declare
  v_streak integer := 0;
  v_check_date date := current_date;
begin
  if not is_active_on(p_user_id, current_date) then
    v_check_date := current_date - 1;
  end if;

  loop
    if is_active_on(p_user_id, v_check_date) then
      v_streak := v_streak + 1;
      v_check_date := v_check_date - 1;
    else
      exit;
    end if;
  end loop;

  return v_streak;
end;
$$;

-- Longest-ever streak, via the classic gaps-and-islands technique over every
-- distinct active date the user has (cheap at the scale a single user's
-- activity history will realistically reach).
create or replace function profile_longest_streak(p_user_id uuid)
returns integer
language sql
stable
as $$
  with active_dates as (
    select distinct log_date as d from task_logs where user_id = p_user_id
    union
    select distinct workout_date from workouts where user_id = p_user_id
    union
    select distinct session_date from study_sessions where user_id = p_user_id
  ),
  grouped as (
    select d, d - (row_number() over (order by d))::integer as grp
    from active_dates
  )
  select coalesce(max(cnt), 0)::integer
  from (select count(*) as cnt from grouped group by grp) s;
$$;
