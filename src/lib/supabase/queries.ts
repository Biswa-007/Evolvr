import { createClient } from "@/lib/supabase/client";
import {
  Achievement,
  DailyXpRecord,
  ExerciseRank,
  ExerciseSet,
  PersonalRecord,
  StatType,
  StudySession,
  SubjectRank,
  Task,
  Workout,
} from "@/lib/types";

const STAT_TYPES: StatType[] = ["strength", "discipline", "endurance", "physique", "recovery"];

export async function fetchProfile() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { displayName: "Player", userId: null as string | null };

  const { data, error } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
  if (error) throw error;
  return { displayName: data.display_name as string, userId };
}

export async function fetchStats(): Promise<Record<StatType, { xp: number }>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("stats").select("stat_type, xp");
  if (error) throw error;

  const out = {} as Record<StatType, { xp: number }>;
  for (const t of STAT_TYPES) out[t] = { xp: 0 };
  for (const row of data ?? []) {
    out[row.stat_type as StatType] = { xp: row.xp };
  }
  return out;
}

export async function fetchStreaks(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
  const supabase = createClient();
  const [{ data: current, error: e1 }, { data: longest, error: e2 }] = await Promise.all([
    supabase.rpc("profile_current_streak", { p_user_id: userId }),
    supabase.rpc("profile_longest_streak", { p_user_id: userId }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { currentStreak: current ?? 0, longestStreak: longest ?? 0 };
}

export async function fetchTasks(): Promise<Task[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, type, difficulty, xp_reward, stat_type")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!tasks || tasks.length === 0) return [];

  const { data: logs, error: logsError } = await supabase
    .from("task_logs")
    .select("task_id")
    .eq("log_date", today);
  if (logsError) throw logsError;
  const completedTodayIds = new Set((logs ?? []).map((l) => l.task_id));

  // streak/success-rate per task — small per-user task counts make this fine as parallel RPC calls.
  const streakResults = await Promise.all(
    tasks
      .filter((t) => t.type === "habit")
      .map(async (t) => {
        const [{ data: streak }, { data: rate }] = await Promise.all([
          supabase.rpc("task_current_streak", { p_task_id: t.id }),
          supabase.rpc("task_success_rate", { p_task_id: t.id }),
        ]);
        return { id: t.id, streak: streak ?? 0, rate: rate ?? 0 };
      })
  );
  const streakById = new Map(streakResults.map((s) => [s.id, s]));

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    difficulty: t.difficulty,
    xpReward: t.xp_reward,
    statType: t.stat_type,
    completedToday: completedTodayIds.has(t.id),
    streak: streakById.get(t.id)?.streak,
    successRate: streakById.get(t.id)?.rate,
  }));
}

/**
 * xp_reward is computed here from XP_REWARDS (xp-engine.ts), never accepted
 * as a raw input — the database also enforces this match via a CHECK
 * constraint (0010_task_xp_integrity.sql) as defense in depth, so even a
 * direct API call bypassing this function can't insert an inflated reward.
 */
export async function createTask(input: {
  title: string;
  type: "habit" | "quest";
  difficulty: "small" | "medium" | "hard" | "major";
  statType: StatType;
}): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");

  const xpReward = { small: 10, medium: 30, hard: 75, major: 150 }[input.difficulty];

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title: input.title.trim(),
    type: input.type,
    difficulty: input.difficulty,
    xp_reward: xpReward,
    stat_type: input.statType,
  });
  if (error) throw error;
}

export async function deactivateTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").update({ is_active: false }).eq("id", taskId);
  if (error) throw error;
}

export async function fetchWorkouts(): Promise<Workout[]> {
  const supabase = createClient();
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("id, name, workout_date, duration_minutes")
    .order("workout_date", { ascending: false })
    .limit(30);
  if (error) throw error;
  if (!workouts || workouts.length === 0) return [];

  const { data: exercises, error: exError } = await supabase
    .from("workout_exercises")
    .select("workout_id, name, sets")
    .in("workout_id", workouts.map((w) => w.id));
  if (exError) throw exError;

  return workouts.map((w) => ({
    id: w.id,
    name: w.name,
    date: w.workout_date,
    durationMinutes: w.duration_minutes,
    exercises: (exercises ?? [])
      .filter((e) => e.workout_id === w.id)
      .map((e) => ({ name: e.name, sets: e.sets })),
  }));
}

export async function fetchExerciseRanks(): Promise<ExerciseRank[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exercise_ranks")
    .select("id, exercise_name, tier, division, lp, best_estimated_1rm")
    .order("exercise_name");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    exerciseName: r.exercise_name,
    tier: r.tier,
    division: r.division,
    lp: r.lp,
    bestEstimated1RM: r.best_estimated_1rm,
  }));
}

export async function fetchPersonalRecords(): Promise<PersonalRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("personal_records")
    .select("id, exercise_name, value, unit, achieved_at")
    .order("achieved_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    exerciseName: r.exercise_name,
    value: Number(r.value),
    unit: r.unit,
    achievedAt: r.achieved_at,
  }));
}

export async function fetchStudySessions(): Promise<StudySession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("id, subject, session_date, duration_minutes, topics, notes")
    .order("session_date", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    subject: s.subject,
    date: s.session_date,
    durationMinutes: s.duration_minutes,
    topics: s.topics ?? [],
    notes: s.notes ?? undefined,
  }));
}

export async function fetchSubjectRanks(): Promise<SubjectRank[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subject_ranks")
    .select("id, subject_name, tier, division, lp, total_hours")
    .order("subject_name");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    subjectName: r.subject_name,
    tier: r.tier,
    division: r.division,
    lp: r.lp,
    totalHours: Number(r.total_hours),
  }));
}

export async function fetchAchievements(userId: string): Promise<Achievement[]> {
  const supabase = createClient();
  const [{ data: all, error: e1 }, { data: unlocked, error: e2 }] = await Promise.all([
    supabase.from("achievements").select("id, slug, title, description, icon"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", userId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const unlockedMap = new Map((unlocked ?? []).map((u) => [u.achievement_id, u.unlocked_at]));

  return (all ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? undefined,
  }));
}

/** Last 7 full days (not including today) of total XP, bucketed by date — feeds the slacking-warning banner. */
export async function fetchDailyXpHistory(): Promise<DailyXpRecord[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data, error } = await supabase
    .from("xp_events")
    .select("amount, created_at")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const todayStr = new Date().toISOString().slice(0, 10);
  const buckets = new Map<string, number>();
  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    if (day === todayStr) continue; // today is still in progress, doesn't count as a slack day yet
    buckets.set(day, (buckets.get(day) ?? 0) + row.amount);
  }

  const out: DailyXpRecord[] = [];
  for (let i = 7; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, xp: buckets.get(key) ?? 0 });
  }
  return out;
}

/** Last 28 days of study minutes, bucketed by date — feeds the Study > Focus heatmap. */
export async function fetchFocusHeatmap(): Promise<{ date: string; minutes: number }[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 27);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("session_date, duration_minutes")
    .gte("session_date", sinceStr);
  if (error) throw error;

  const buckets = new Map<string, number>();
  for (const row of data ?? []) {
    buckets.set(row.session_date, (buckets.get(row.session_date) ?? 0) + row.duration_minutes);
  }

  const out: { date: string; minutes: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, minutes: buckets.get(key) ?? 0 });
  }
  return out;
}

/* ---------------- Analytics (real data, replacing the old mock series) ---------------- */

export interface WeeklyPoint {
  weekStart: string;
  value: number;
}

export async function fetchXpGrowthWeekly(weeks = 8): Promise<WeeklyPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("xp_growth_weekly", { p_weeks: weeks });
  if (error) throw error;
  return (data ?? []).map((r: { week_start: string; xp: number }) => ({ weekStart: r.week_start, value: r.xp }));
}

export async function fetchWorkoutFrequencyWeekly(weeks = 6): Promise<WeeklyPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("workout_frequency_weekly", { p_weeks: weeks });
  if (error) throw error;
  return (data ?? []).map((r: { week_start: string; sessions: number }) => ({ weekStart: r.week_start, value: r.sessions }));
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function fetchHabitConsistencyByWeekday(days = 28): Promise<{ day: string; pct: number }[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("habit_consistency_by_weekday", { p_days: days });
  if (error) throw error;
  // reorder Postgres's Sun-first (0-6) into a Mon-first week for display
  const byWeekday = new Map((data ?? []).map((r: { weekday: number; pct: number }) => [r.weekday, r.pct]));
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((w) => ({ day: WEEKDAY_LABELS[w], pct: (byWeekday.get(w) as number) ?? 0 }));
}

/* ---------------- Workout logging UX helpers (exercise suggestions + history) ---------------- */

/** Exercise names this user has already logged at least once — feeds the autocomplete in WorkoutEditor. */
export async function fetchKnownExerciseNames(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("exercise_ranks").select("exercise_name").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.exercise_name);
}

/** The most recent logged sets for a given exercise name, shown as a "last time" hint while logging. */
export async function fetchLastExercisePerformance(
  exerciseName: string
): Promise<{ date: string; sets: ExerciseSet[] } | null> {
  if (!exerciseName.trim()) return null;
  const supabase = createClient();

  const { data: exerciseRows, error } = await supabase
    .from("workout_exercises")
    .select("sets, workout_id, workouts!inner(workout_date)")
    .ilike("name", exerciseName.trim())
    .order("workout_date", { referencedTable: "workouts", ascending: false })
    .limit(1);

  if (error || !exerciseRows || exerciseRows.length === 0) return null;

  const row = exerciseRows[0] as unknown as { sets: ExerciseSet[]; workouts: { workout_date: string } };
  return { date: row.workouts.workout_date, sets: row.sets };
}
