-- 0006_triggers_and_seed.sql

-- Runs once, right after a new row lands in auth.users (i.e. right after sign-up).
-- SECURITY DEFINER is required here: at the moment this fires, there is no
-- authenticated session yet, so auth.uid() is null and the RLS policies above
-- would block every insert. This is the one deliberate, narrow exception —
-- it only ever runs as a direct response to a brand-new auth.users row, and
-- it only ever inserts rows scoped to NEW.id.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into stats (user_id, stat_type, xp)
  select new.id, s, 0
  from (values ('strength'), ('discipline'), ('endurance'), ('physique'), ('recovery')) as t(s);

  -- a small starter pack so a brand-new sign-up sees a populated app, not an empty shell —
  -- matters a lot for non-technical friends/family trying this for the first time.
  insert into tasks (user_id, title, type, difficulty, xp_reward, stat_type) values
    (new.id, 'Drink 2L of water', 'habit', 'small', 10, 'recovery'),
    (new.id, 'Deep work — 1 hour', 'habit', 'medium', 30, 'discipline'),
    (new.id, 'Move your body today', 'quest', 'hard', 75, 'strength');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Achievements catalog (Section 5.5 / Profile screen). Global, not user-scoped.
insert into achievements (slug, title, description, icon) values
  ('first_workout', 'First Workout', 'Logged your first session', 'dumbbell'),
  ('seven_day_streak', '7 Day Streak', 'Kept a habit alive for a week', 'flame'),
  ('level_10', 'Level 10', 'Reached character level 10', 'trending-up'),
  ('thirty_day_discipline', '30 Day Discipline', '30-day overall streak', 'shield'),
  ('titan_tier', 'Titan Tier', 'Reached Titan on any lift or subject', 'crown'),
  ('balanced_build', 'Balanced Build', 'All stats within 3 levels of each other', 'scale')
on conflict (slug) do nothing;

-- Checks the handful of achievement conditions for a user and unlocks any that
-- newly qualify. Returns only the ones actually newly inserted by THIS call
-- (tracked via INSERT...RETURNING, not a time window — a time window breaks
-- under rapid successive actions, e.g. logging several workouts within a
-- few seconds would otherwise re-report the same achievement every time).
create or replace function check_and_unlock_achievements(p_user_id uuid)
returns table(slug text, title text, icon text)
language plpgsql
as $$
declare
  v_character_level integer;
  v_stat_levels integer[];
  v_inserted_id uuid;
  v_unlocked_ids uuid[] := '{}';
begin
  v_character_level := character_level_for_user(p_user_id);

  select array_agg(level_from_xp(xp)) into v_stat_levels from stats where user_id = p_user_id;

  -- first_workout
  if exists (select 1 from workouts where user_id = p_user_id) then
    insert into user_achievements (user_id, achievement_id)
    select p_user_id, a.id from achievements a where a.slug = 'first_workout'
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id into v_inserted_id;
    if v_inserted_id is not null then
      v_unlocked_ids := array_append(v_unlocked_ids, v_inserted_id);
    end if;
  end if;

  -- seven_day_streak
  if profile_longest_streak(p_user_id) >= 7 then
    v_inserted_id := null;
    insert into user_achievements (user_id, achievement_id)
    select p_user_id, a.id from achievements a where a.slug = 'seven_day_streak'
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id into v_inserted_id;
    if v_inserted_id is not null then
      v_unlocked_ids := array_append(v_unlocked_ids, v_inserted_id);
    end if;
  end if;

  -- level_10
  if v_character_level >= 10 then
    v_inserted_id := null;
    insert into user_achievements (user_id, achievement_id)
    select p_user_id, a.id from achievements a where a.slug = 'level_10'
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id into v_inserted_id;
    if v_inserted_id is not null then
      v_unlocked_ids := array_append(v_unlocked_ids, v_inserted_id);
    end if;
  end if;

  -- thirty_day_discipline
  if profile_longest_streak(p_user_id) >= 30 then
    v_inserted_id := null;
    insert into user_achievements (user_id, achievement_id)
    select p_user_id, a.id from achievements a where a.slug = 'thirty_day_discipline'
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id into v_inserted_id;
    if v_inserted_id is not null then
      v_unlocked_ids := array_append(v_unlocked_ids, v_inserted_id);
    end if;
  end if;

  -- titan_tier (either an exercise or a subject reached Titan or Olympian)
  if exists (
    select 1 from exercise_ranks where user_id = p_user_id and tier in ('Titan', 'Olympian')
    union
    select 1 from subject_ranks where user_id = p_user_id and tier in ('Titan', 'Olympian')
  ) then
    v_inserted_id := null;
    insert into user_achievements (user_id, achievement_id)
    select p_user_id, a.id from achievements a where a.slug = 'titan_tier'
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id into v_inserted_id;
    if v_inserted_id is not null then
      v_unlocked_ids := array_append(v_unlocked_ids, v_inserted_id);
    end if;
  end if;

  -- balanced_build (require some real progress, not just "all stats are 0")
  if v_stat_levels is not null and (
    (select min(l) from unnest(v_stat_levels) l) >= 5
    and (select max(l) from unnest(v_stat_levels) l) - (select min(l) from unnest(v_stat_levels) l) <= 3
  ) then
    v_inserted_id := null;
    insert into user_achievements (user_id, achievement_id)
    select p_user_id, a.id from achievements a where a.slug = 'balanced_build'
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id into v_inserted_id;
    if v_inserted_id is not null then
      v_unlocked_ids := array_append(v_unlocked_ids, v_inserted_id);
    end if;
  end if;

  return query
    select a.slug, a.title, a.icon
    from achievements a
    where a.id = any(v_unlocked_ids);
end;
$$;
