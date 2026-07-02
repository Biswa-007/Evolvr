-- 0005_rls.sql
-- Every table that holds personal data is locked to auth.uid() = user_id.
-- Without this, any signed-in friend/family member could read or edit anyone
-- else's stats, workouts, or journal-style notes — so this file gets the most
-- scrutiny of anything in the schema.

alter table profiles enable row level security;
alter table stats enable row level security;
alter table xp_events enable row level security;
alter table tasks enable row level security;
alter table task_logs enable row level security;
alter table workouts enable row level security;
alter table workout_exercises enable row level security;
alter table exercise_ranks enable row level security;
alter table personal_records enable row level security;
alter table study_sessions enable row level security;
alter table subject_ranks enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table ladder_tiers enable row level security;

-- ladder_tiers: static reference data, readable by any signed-in user, writable by nobody from the client.
create policy "ladder_tiers_select_all" on ladder_tiers for select using (auth.role() = 'authenticated');

-- profiles: a user can read/update only their own profile row.
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
-- no insert policy: rows are created exclusively by the handle_new_user trigger.
-- no delete policy: profile rows are removed via the auth.users cascade, not directly.

-- stats: read/update own rows only. No insert/delete policy — rows are seeded once
-- by handle_new_user and only ever updated by the RPC functions afterward.
create policy "stats_select_own" on stats for select using (auth.uid() = user_id);
create policy "stats_update_own" on stats for update using (auth.uid() = user_id);

-- xp_events: read-only ledger from the client's perspective. Only the RPC
-- functions insert into it (running as the calling user, so the WITH CHECK
-- still applies, but there's deliberately no UPDATE/DELETE policy at all —
-- the ledger should never be edited after the fact).
create policy "xp_events_select_own" on xp_events for select using (auth.uid() = user_id);
create policy "xp_events_insert_own" on xp_events for insert with check (auth.uid() = user_id);

-- tasks: full CRUD on your own tasks only.
create policy "tasks_select_own" on tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on tasks for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on tasks for delete using (auth.uid() = user_id);

-- task_logs: insert/select only, and only your own. No update/delete — a completed
-- day is a fact of record, not something to be edited (prevents "uncompleting"
-- a habit retroactively to game streak math).
create policy "task_logs_select_own" on task_logs for select using (auth.uid() = user_id);
create policy "task_logs_insert_own" on task_logs for insert with check (auth.uid() = user_id);

create policy "workouts_select_own" on workouts for select using (auth.uid() = user_id);
create policy "workouts_insert_own" on workouts for insert with check (auth.uid() = user_id);
create policy "workouts_delete_own" on workouts for delete using (auth.uid() = user_id);

create policy "workout_exercises_select_own" on workout_exercises for select using (auth.uid() = user_id);
create policy "workout_exercises_insert_own" on workout_exercises for insert with check (auth.uid() = user_id);
create policy "workout_exercises_delete_own" on workout_exercises for delete using (auth.uid() = user_id);

create policy "exercise_ranks_select_own" on exercise_ranks for select using (auth.uid() = user_id);
create policy "exercise_ranks_update_own" on exercise_ranks for update using (auth.uid() = user_id);
create policy "exercise_ranks_insert_own" on exercise_ranks for insert with check (auth.uid() = user_id);

create policy "personal_records_select_own" on personal_records for select using (auth.uid() = user_id);
create policy "personal_records_insert_own" on personal_records for insert with check (auth.uid() = user_id);

create policy "study_sessions_select_own" on study_sessions for select using (auth.uid() = user_id);
create policy "study_sessions_insert_own" on study_sessions for insert with check (auth.uid() = user_id);
create policy "study_sessions_delete_own" on study_sessions for delete using (auth.uid() = user_id);

create policy "subject_ranks_select_own" on subject_ranks for select using (auth.uid() = user_id);
create policy "subject_ranks_update_own" on subject_ranks for update using (auth.uid() = user_id);
create policy "subject_ranks_insert_own" on subject_ranks for insert with check (auth.uid() = user_id);

-- achievements: a shared, public catalog — every signed-in user can read it,
-- nobody can write to it from the client (it's managed via migrations only).
create policy "achievements_select_all" on achievements for select using (auth.role() = 'authenticated');

create policy "user_achievements_select_own" on user_achievements for select using (auth.uid() = user_id);
create policy "user_achievements_insert_own" on user_achievements for insert with check (auth.uid() = user_id);
