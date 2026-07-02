-- 0002_tables.sql
-- All user-data tables. Every table with a user_id column gets RLS in 0005_rls.sql.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stat_type text not null check (stat_type in ('strength', 'discipline', 'endurance', 'physique', 'recovery')),
  xp integer not null default 0 check (xp >= 0),
  unique (user_id, stat_type)
);
create index if not exists idx_stats_user on stats(user_id);

-- Append-only ledger — the source of truth for "how much XP, from what, and when".
-- Dashboard XP charts, the slacking-warning banner, and the Rank-Up Ceremony's
-- stat snapshot can all be derived from this table alone (Section 7 of the plan).
create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stat_type text not null check (stat_type in ('strength', 'discipline', 'endurance', 'physique', 'recovery')),
  amount integer not null,
  source_type text not null check (source_type in ('task', 'workout', 'study', 'adjustment')),
  source_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_xp_events_user_date on xp_events(user_id, created_at);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('habit', 'quest')),
  difficulty text not null check (difficulty in ('small', 'medium', 'hard', 'major')),
  xp_reward integer not null check (xp_reward > 0),
  stat_type text not null check (stat_type in ('strength', 'discipline', 'endurance', 'physique', 'recovery')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_tasks_user on tasks(user_id) where is_active;

-- One row per completed day. The unique constraint is what stops a habit
-- being completed twice in one day for double XP (a gap in the original plan doc).
create table if not exists task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (task_id, log_date)
);
create index if not exists idx_task_logs_user_date on task_logs(user_id, log_date);
create index if not exists idx_task_logs_task on task_logs(task_id);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  workout_date date not null default current_date,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_workouts_user_date on workouts(user_id, workout_date desc);

create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- sets shape: [{"weightType": "kg" | "bodyweight", "weight": number, "reps": number}, ...]
  sets jsonb not null default '[]'::jsonb
);
create index if not exists idx_workout_exercises_workout on workout_exercises(workout_id);
create index if not exists idx_workout_exercises_user on workout_exercises(user_id);

create table if not exists exercise_ranks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  tier text not null default 'Wood' references ladder_tiers(tier),
  division smallint check (division between 1 and 3),
  lp integer not null default 0 check (lp >= 0 and lp < 100),
  best_estimated_1rm numeric,
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_name)
);
create index if not exists idx_exercise_ranks_user on exercise_ranks(user_id);

create table if not exists personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  value numeric not null,
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  achieved_at timestamptz not null default now()
);
create index if not exists idx_personal_records_user on personal_records(user_id);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  session_date date not null default current_date,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  topics text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_study_sessions_user_date on study_sessions(user_id, session_date desc);

create table if not exists subject_ranks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  tier text not null default 'Wood' references ladder_tiers(tier),
  division smallint check (division between 1 and 3),
  lp integer not null default 0 check (lp >= 0 and lp < 100),
  total_hours numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, subject_name)
);
create index if not exists idx_subject_ranks_user on subject_ranks(user_id);

-- Global catalog — not user-scoped, every signed-in user can read it.
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  icon text not null
);

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);
create index if not exists idx_user_achievements_user on user_achievements(user_id);
