-- 0009_analytics.sql
-- Replaces the frontend's mock chart series (src/lib/analytics-data.ts) with
-- real server-side aggregations. Each one fills gaps with zeros (via a
-- generated date/week spine) so charts don't silently skip empty periods,
-- and each scopes strictly to auth.uid() so it's safe to call directly from
-- the client under RLS.

create or replace function xp_growth_weekly(p_weeks integer default 8)
returns table(week_start date, xp integer)
language sql
stable
as $$
  with weeks as (
    select generate_series(
      date_trunc('week', current_date)::date - ((p_weeks - 1) * 7),
      date_trunc('week', current_date)::date,
      interval '7 days'
    )::date as week_start
  )
  select w.week_start, coalesce(sum(e.amount), 0)::integer as xp
  from weeks w
  left join xp_events e
    on e.user_id = auth.uid()
    and date_trunc('week', e.created_at)::date = w.week_start
  group by w.week_start
  order by w.week_start;
$$;

create or replace function workout_frequency_weekly(p_weeks integer default 6)
returns table(week_start date, sessions integer)
language sql
stable
as $$
  with weeks as (
    select generate_series(
      date_trunc('week', current_date)::date - ((p_weeks - 1) * 7),
      date_trunc('week', current_date)::date,
      interval '7 days'
    )::date as week_start
  )
  select w.week_start, count(wk.id)::integer as sessions
  from weeks w
  left join workouts wk
    on wk.user_id = auth.uid()
    and date_trunc('week', wk.workout_date)::date = w.week_start
  group by w.week_start
  order by w.week_start;
$$;

-- % of active habits completed, broken out by weekday, over the last p_days days.
-- weekday follows Postgres's extract(dow): 0 = Sunday ... 6 = Saturday.
-- "Expected" only counts habits that existed as of each day (a habit added
-- yesterday doesn't drag down last month's average), and only days that have
-- actually elapsed for "today" so the current day's not-yet-complete habits
-- don't make today look artificially bad.
create or replace function habit_consistency_by_weekday(p_days integer default 28)
returns table(weekday smallint, pct integer)
language sql
stable
as $$
  with habit_ids as (
    select id, created_at::date as created_date
    from tasks
    where user_id = auth.uid() and type = 'habit' and is_active
  ),
  recent_days as (
    select d::date as d
    from generate_series(current_date - (p_days - 1), current_date, interval '1 day') as d
  ),
  expected as (
    select rd.d, extract(dow from rd.d)::smallint as weekday, count(hi.id) as expected_count
    from recent_days rd
    left join habit_ids hi on hi.created_date <= rd.d
    group by rd.d
  ),
  actual as (
    select tl.log_date as d, count(*) as actual_count
    from task_logs tl
    where tl.user_id = auth.uid()
      and tl.task_id in (select id from habit_ids)
      and tl.log_date > current_date - p_days
    group by tl.log_date
  )
  select e.weekday,
    case when sum(e.expected_count) = 0 then 0
    else round(100.0 * sum(coalesce(a.actual_count, 0)) / sum(e.expected_count))::integer
    end as pct
  from expected e
  left join actual a on a.d = e.d
  group by e.weekday
  order by e.weekday;
$$;
