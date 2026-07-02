-- 0007_rpc_functions.sql
-- These are the only ways XP is ever awarded. The client never sends an XP
-- amount — it sends "I completed task X" or "here's the workout I did", and
-- everything from there (XP math, level-up detection, rank-change detection,
-- ladder promotion) happens in here, server-side, under RLS as the calling
-- user. This is what makes it safe for friends/family to use without anyone
-- being able to edit local state and hand themselves XP.

create or replace function complete_task(p_task_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_task tasks%rowtype;
  v_old_xp integer;
  v_old_level integer;
  v_new_xp integer;
  v_new_level integer;
  v_old_char_level integer;
  v_new_char_level integer;
  v_old_rank text;
  v_new_rank text;
  v_new_achievements jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_task from tasks where id = p_task_id and user_id = v_user_id;
  if not found then
    raise exception 'Task not found';
  end if;

  if exists (select 1 from task_logs where task_id = p_task_id and log_date = current_date) then
    raise exception 'Task already completed today';
  end if;

  select xp into v_old_xp from stats where user_id = v_user_id and stat_type = v_task.stat_type;
  v_old_level := level_from_xp(v_old_xp);
  v_old_char_level := character_level_for_user(v_user_id);
  v_old_rank := rank_from_level(v_old_char_level);

  insert into task_logs (task_id, user_id, log_date) values (p_task_id, v_user_id, current_date);

  update stats set xp = xp + v_task.xp_reward
    where user_id = v_user_id and stat_type = v_task.stat_type
    returning xp into v_new_xp;

  insert into xp_events (user_id, stat_type, amount, source_type, source_id)
    values (v_user_id, v_task.stat_type, v_task.xp_reward, 'task', p_task_id);

  v_new_level := level_from_xp(v_new_xp);
  v_new_char_level := character_level_for_user(v_user_id);
  v_new_rank := rank_from_level(v_new_char_level);

  select coalesce(jsonb_agg(jsonb_build_object('title', title, 'icon', icon)), '[]'::jsonb)
    into v_new_achievements
    from check_and_unlock_achievements(v_user_id);

  return jsonb_build_object(
    'xpGained', v_task.xp_reward,
    'statType', v_task.stat_type,
    'newStatLevel', v_new_level,
    'leveledUp', v_new_level > v_old_level,
    'newCharacterLevel', v_new_char_level,
    'rankChanged', v_new_rank <> v_old_rank,
    'newRank', v_new_rank,
    'newAchievements', v_new_achievements
  );
end;
$$;

-- p_exercises shape: [{"name": "Bench Press", "sets": [{"weightType":"kg","weight":80,"reps":6}, ...]}, ...]
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
    v_best_1rm := null;
    for v_set in select * from jsonb_array_elements(v_exercise->'sets')
    loop
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

    select * into v_promo from advance_ladder(v_existing.tier, v_existing.division, v_existing.lp, v_set_count * 9);

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

create or replace function add_study_session(
  p_subject text,
  p_duration_minutes integer,
  p_topics text[],
  p_notes text
)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_xp_gain integer;
  v_old_xp integer;
  v_old_level integer;
  v_new_xp integer;
  v_new_level integer;
  v_old_char_level integer;
  v_new_char_level integer;
  v_old_rank text;
  v_new_rank text;
  v_existing subject_ranks%rowtype;
  v_promo record;
  v_promotion jsonb := null;
  v_new_achievements jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_subject is null or trim(p_subject) = '' then
    raise exception 'A study session needs a subject';
  end if;

  insert into study_sessions (user_id, subject, duration_minutes, topics, notes)
    values (v_user_id, trim(p_subject), coalesce(p_duration_minutes, 0), coalesce(p_topics, '{}'), p_notes)
    returning id into v_session_id;

  v_xp_gain := greatest(15, round(coalesce(p_duration_minutes, 0) / 2.0)::integer);

  select xp into v_old_xp from stats where user_id = v_user_id and stat_type = 'discipline';
  v_old_level := level_from_xp(v_old_xp);
  v_old_char_level := character_level_for_user(v_user_id);
  v_old_rank := rank_from_level(v_old_char_level);

  update stats set xp = xp + v_xp_gain
    where user_id = v_user_id and stat_type = 'discipline'
    returning xp into v_new_xp;

  insert into xp_events (user_id, stat_type, amount, source_type, source_id)
    values (v_user_id, 'discipline', v_xp_gain, 'study', v_session_id);

  select * into v_existing from subject_ranks
    where user_id = v_user_id and lower(subject_name) = lower(trim(p_subject));

  if found then
    select * into v_promo from advance_ladder(
      v_existing.tier, v_existing.division, v_existing.lp, round(coalesce(p_duration_minutes, 0) / 3.0)::integer
    );

    update subject_ranks
      set tier = v_promo.new_tier,
          division = v_promo.new_division,
          lp = v_promo.new_lp,
          total_hours = total_hours + (coalesce(p_duration_minutes, 0) / 60.0),
          updated_at = now()
      where id = v_existing.id;

    if v_promo.promoted then
      v_promotion := jsonb_build_object(
        'name', v_existing.subject_name, 'tier', v_promo.new_tier, 'division', v_promo.new_division
      );
    end if;
  else
    insert into subject_ranks (user_id, subject_name, tier, division, lp, total_hours)
      values (v_user_id, trim(p_subject), 'Wood', 3, 10, coalesce(p_duration_minutes, 0) / 60.0);
  end if;

  v_new_level := level_from_xp(v_new_xp);
  v_new_char_level := character_level_for_user(v_user_id);
  v_new_rank := rank_from_level(v_new_char_level);

  select coalesce(jsonb_agg(jsonb_build_object('title', title, 'icon', icon)), '[]'::jsonb)
    into v_new_achievements
    from check_and_unlock_achievements(v_user_id);

  return jsonb_build_object(
    'sessionId', v_session_id,
    'xpGained', v_xp_gain,
    'statType', 'discipline',
    'newStatLevel', v_new_level,
    'leveledUp', v_new_level > v_old_level,
    'newCharacterLevel', v_new_char_level,
    'rankChanged', v_new_rank <> v_old_rank,
    'newRank', v_new_rank,
    'promotion', v_promotion,
    'newAchievements', v_new_achievements
  );
end;
$$;
