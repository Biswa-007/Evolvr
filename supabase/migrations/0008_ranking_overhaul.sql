-- 0008_ranking_overhaul.sql
-- Fixes a real exploit: LP was previously `set_count * 9`, completely ignoring
-- weight. 10 sets of 1kg earned identical LP to 10 sets of your working max.
-- 60kg x 5 reps and 300kg x 1 rep both being "5 sets" worth the same LP was
-- the literal bug report. This replaces it with a formula based on your
-- estimated 1RM (Epley) *relative to your own previous best on that exercise*
-- — i.e. progressive overload, not raw volume.

-- Returns the LP a single exercise entry should earn, given:
--   p_estimated_1rm    — this session's best estimated 1RM for the exercise (null if bodyweight-only)
--   p_previous_best_1rm — the exercise's best estimated 1RM before this session (null if first time)
--   p_total_reps        — total reps across all sets (used only for the bodyweight-only fallback)
create or replace function compute_workout_lp_gain(
  p_estimated_1rm numeric,
  p_previous_best_1rm numeric,
  p_total_reps integer
)
returns integer
language plpgsql
immutable
as $$
declare
  v_ratio numeric;
begin
  -- Bodyweight-only exercise (pull-ups, dips, etc.) — no 1RM is computable,
  -- so fall back to a small, capped reps-based credit. Capped low on purpose:
  -- this path should never out-earn genuine weighted progression.
  if p_estimated_1rm is null then
    return least(10, greatest(2, round(coalesce(p_total_reps, 0) / 5.0)::integer));
  end if;

  -- First time ever logging real weight on this exercise — flat starting credit.
  if p_previous_best_1rm is null or p_previous_best_1rm <= 0 then
    return 15;
  end if;

  v_ratio := p_estimated_1rm / p_previous_best_1rm;

  if v_ratio > 1 then
    -- A new estimated-1RM PR. Reward scales with how big the jump was, capped
    -- so one freak set can't single-handedly rank you up several tiers.
    return least(60, 25 + round((v_ratio - 1) * 200)::integer);
  elsif v_ratio >= 0.95 then
    -- Working within 5% of your best — genuine training, modest reward.
    return 10;
  elsif v_ratio >= 0.85 then
    return 5;
  else
    -- A light or deload day, well below your best — minimal credit. Still
    -- logs the session (and still counts toward streaks/XP), just doesn't
    -- inflate the ladder.
    return 2;
  end if;
end;
$$;

-- Full redefinition of add_workout: identical to 0007's version except the
-- ladder LP gain now comes from compute_workout_lp_gain() instead of
-- `v_set_count * 9`. Postgres requires the whole function body to replace it.
create or replace function add_workout(p_name text, p_duration_minutes integer, p_exercises jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_exercise jsonb;
  v_exercise_name text;
  v_total_sets integer := 0;
  v_xp_gain integer;
  v_old_xp integer;
  v_old_level integer;
  v_new_xp integer;
  v_new_level integer;
  v_old_char_level integer;
  v_new_char_level integer;
  v_old_rank text;
  v_new_rank text;
  v_existing exercise_ranks%rowtype;
  v_set_count integer;
  v_total_reps integer;
  v_lp_gain integer;
  v_promo record;
  v_promotion jsonb := null;
  v_set jsonb;
  v_best_1rm numeric;
  v_set_1rm numeric;
  v_new_pr jsonb := null;
  v_new_achievements jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_exercises is null or jsonb_array_length(p_exercises) = 0 then
    raise exception 'A workout needs at least one exercise';
  end if;

  insert into workouts (user_id, name, duration_minutes)
    values (v_user_id, coalesce(trim(p_name), 'Workout'), coalesce(p_duration_minutes, 0))
    returning id into v_workout_id;

  for v_exercise in select * from jsonb_array_elements(p_exercises)
  loop
    v_exercise_name := trim(v_exercise->>'name');
    v_set_count := jsonb_array_length(v_exercise->'sets');
    v_total_sets := v_total_sets + v_set_count;

    insert into workout_exercises (workout_id, user_id, name, sets)
      values (v_workout_id, v_user_id, v_exercise_name, v_exercise->'sets');

    -- estimated 1RM for this exercise in this session, via Epley's formula
    -- (1RM ≈ weight × (1 + reps/30)) — only meaningful for weighted (kg) sets.
    -- Also tally total reps for the bodyweight-only LP fallback.
    v_best_1rm := null;
    v_total_reps := 0;
    for v_set in select * from jsonb_array_elements(v_exercise->'sets')
    loop
      v_total_reps := v_total_reps + coalesce((v_set->>'reps')::integer, 0);
      if (v_set->>'weightType') = 'kg' then
        v_set_1rm := (v_set->>'weight')::numeric * (1 + (v_set->>'reps')::numeric / 30.0);
        if v_best_1rm is null or v_set_1rm > v_best_1rm then
          v_best_1rm := v_set_1rm;
        end if;
      end if;
    end loop;

    -- find or create this exercise's ladder entry (auto-created on first log, same as subjects)
    select * into v_existing from exercise_ranks
      where user_id = v_user_id and lower(exercise_name) = lower(v_exercise_name);

    if not found then
      insert into exercise_ranks (user_id, exercise_name, tier, division, lp, best_estimated_1rm)
        values (v_user_id, v_exercise_name, 'Wood', 3, 0, null)
        returning * into v_existing;
    end if;

    -- LP gain is now strength-progression based (see compute_workout_lp_gain),
    -- using v_existing.best_estimated_1rm BEFORE it gets updated below.
    v_lp_gain := compute_workout_lp_gain(v_best_1rm, v_existing.best_estimated_1rm, v_total_reps);

    select * into v_promo from advance_ladder(v_existing.tier, v_existing.division, v_existing.lp, v_lp_gain);

    update exercise_ranks
      set tier = v_promo.new_tier,
          division = v_promo.new_division,
          lp = v_promo.new_lp,
          best_estimated_1rm = case
            when v_best_1rm is not null and (best_estimated_1rm is null or v_best_1rm > best_estimated_1rm)
            then v_best_1rm else best_estimated_1rm
          end,
          updated_at = now()
      where id = v_existing.id;

    if v_promo.promoted and v_promotion is null then
      v_promotion := jsonb_build_object(
        'name', v_existing.exercise_name, 'tier', v_promo.new_tier, 'division', v_promo.new_division
      );
    end if;

    if v_best_1rm is not null and (v_existing.best_estimated_1rm is null or v_best_1rm > v_existing.best_estimated_1rm) then
      insert into personal_records (user_id, exercise_name, value, unit, achieved_at)
        values (v_user_id, v_exercise_name, round(v_best_1rm, 1), 'kg', now());
      if v_new_pr is null then
        v_new_pr := jsonb_build_object('exerciseName', v_exercise_name, 'value', round(v_best_1rm, 1));
      end if;
    end if;
  end loop;

  v_xp_gain := greatest(40, v_total_sets * 18);

  select xp into v_old_xp from stats where user_id = v_user_id and stat_type = 'strength';
  v_old_level := level_from_xp(v_old_xp);
  v_old_char_level := character_level_for_user(v_user_id);
  v_old_rank := rank_from_level(v_old_char_level);

  update stats set xp = xp + v_xp_gain
    where user_id = v_user_id and stat_type = 'strength'
    returning xp into v_new_xp;

  insert into xp_events (user_id, stat_type, amount, source_type, source_id)
    values (v_user_id, 'strength', v_xp_gain, 'workout', v_workout_id);

  v_new_level := level_from_xp(v_new_xp);
  v_new_char_level := character_level_for_user(v_user_id);
  v_new_rank := rank_from_level(v_new_char_level);

  select coalesce(jsonb_agg(jsonb_build_object('title', title, 'icon', icon)), '[]'::jsonb)
    into v_new_achievements
    from check_and_unlock_achievements(v_user_id);

  return jsonb_build_object(
    'workoutId', v_workout_id,
    'xpGained', v_xp_gain,
    'statType', 'strength',
    'newStatLevel', v_new_level,
    'leveledUp', v_new_level > v_old_level,
    'newCharacterLevel', v_new_char_level,
    'rankChanged', v_new_rank <> v_old_rank,
    'newRank', v_new_rank,
    'promotion', v_promotion,
    'newPr', v_new_pr,
    'newAchievements', v_new_achievements
  );
end;
$$;
