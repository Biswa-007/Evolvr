-- 0003_math_functions.sql
-- Mirrors src/lib/xp-engine.ts exactly so client display and server truth never disagree.

-- xp_required_for_level(n) = round(100 * n^1.5)
create or replace function xp_required_for_level(p_level integer)
returns integer
language sql
immutable
as $$
  select round(100 * power(p_level::numeric, 1.5))::integer;
$$;

-- Walks the curve to find the level for a given total stat XP.
create or replace function level_from_xp(p_xp integer)
returns integer
language plpgsql
immutable
as $$
declare
  v_level integer := 1;
  v_remaining integer := coalesce(p_xp, 0);
  v_needed integer;
begin
  loop
    v_needed := xp_required_for_level(v_level);
    if v_remaining < v_needed then
      exit;
    end if;
    v_remaining := v_remaining - v_needed;
    v_level := v_level + 1;
  end loop;
  return v_level;
end;
$$;

-- Same walk, but also returns progress into the current level (for progress bars).
create or replace function level_progress_from_xp(p_xp integer)
returns table(level integer, xp_into_level integer, xp_for_next_level integer)
language plpgsql
immutable
as $$
declare
  v_level integer := 1;
  v_remaining integer := coalesce(p_xp, 0);
  v_needed integer;
begin
  loop
    v_needed := xp_required_for_level(v_level);
    if v_remaining < v_needed then
      exit;
    end if;
    v_remaining := v_remaining - v_needed;
    v_level := v_level + 1;
  end loop;
  return query select v_level, v_remaining, xp_required_for_level(v_level);
end;
$$;

-- Character rank tiers, matching Section 4.4 of the implementation plan.
create or replace function rank_from_level(p_level integer)
returns text
language sql
immutable
as $$
  select case
    when p_level between 1 and 5 then 'Novice'
    when p_level between 6 and 10 then 'Iron Disciple'
    when p_level between 11 and 20 then 'Bronze Hunter'
    when p_level between 21 and 35 then 'Silver Warrior'
    when p_level between 36 and 50 then 'Gold Titan'
    else 'Ascended Alpha'
  end;
$$;

-- Character level = floor(average of the 5 stat levels). Defaults to 1 if a user
-- somehow has no stats rows yet (shouldn't happen — handle_new_user seeds them).
create or replace function character_level_for_user(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(floor(avg(level_from_xp(xp)))::integer, 1)
  from stats
  where user_id = p_user_id;
$$;

-- Generic ladder promotion math, shared by exercise_ranks and subject_ranks.
-- Mirrors gainLadderLp() in src/lib/store.ts exactly.
create or replace function advance_ladder(p_tier text, p_division smallint, p_lp integer, p_lp_gain integer)
returns table(new_tier text, new_division smallint, new_lp integer, promoted boolean)
language plpgsql
as $$
declare
  v_tier text := p_tier;
  v_division smallint := p_division;
  v_lp integer := coalesce(p_lp, 0) + coalesce(p_lp_gain, 0);
  v_promoted boolean := false;
  v_cur_order smallint;
  v_max_order smallint;
  v_next_tier text;
  v_next_has_divisions boolean;
begin
  select max(sort_order) into v_max_order from ladder_tiers;

  loop
    if v_lp < 100 then
      exit;
    end if;

    select sort_order into v_cur_order from ladder_tiers where tier = v_tier;

    if v_division is not null and v_division > 1 then
      v_lp := v_lp - 100;
      v_division := v_division - 1;
      v_promoted := true;
    elsif v_cur_order < v_max_order then
      v_lp := v_lp - 100;
      select tier, has_divisions into v_next_tier, v_next_has_divisions
        from ladder_tiers where sort_order = v_cur_order + 1;
      v_tier := v_next_tier;
      v_division := case when v_next_has_divisions then 3 else null end;
      v_promoted := true;
    else
      v_lp := least(v_lp, 99); -- capped at the apex tier (Olympian)
      exit;
    end if;
  end loop;

  return query select v_tier, v_division, v_lp, v_promoted;
end;
$$;
