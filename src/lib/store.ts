import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import {
  createTask,
  deactivateTask,
  fetchAchievements,
  fetchDailyXpHistory,
  fetchExerciseRanks,
  fetchFocusHeatmap,
  fetchPersonalRecords,
  fetchProfile,
  fetchStats,
  fetchStreaks,
  fetchStudySessions,
  fetchSubjectRanks,
  fetchTasks,
  fetchWorkouts,
} from "@/lib/supabase/queries";
import { characterLevelFromStats, countConsecutiveSlackDays, divisionLabel, ladderTierColor, levelFromXp, rankFromLevel } from "./xp-engine";
import {
  Achievement,
  DailyXpRecord,
  ExerciseRank,
  ExerciseSet,
  LadderTier,
  PersonalRecord,
  Rank,
  StatType,
  StudySession,
  SubjectRank,
  Task,
  Workout,
} from "./types";

export interface XPPopup {
  id: string;
  amount: number;
  statType: StatType;
  originX: number;
  originY: number;
}

export interface LevelUpEvent {
  statType: StatType;
  newLevel: number;
}

export interface RankUpEvent {
  rank: Rank;
  color: string;
}

export interface LadderPromotionEvent {
  name: string;
  tier: string;
  division: number | null;
  color: string;
}

export interface UnlockedAchievement {
  title: string;
  icon: string;
}

interface CompleteTaskResponse {
  xpGained: number;
  statType: StatType;
  newStatLevel: number;
  leveledUp: boolean;
  newCharacterLevel: number;
  rankChanged: boolean;
  newRank: Rank;
  newAchievements: UnlockedAchievement[];
}

interface LadderPromotionResponse {
  name: string;
  tier: LadderTier;
  division: number | null;
}

interface AddWorkoutResponse {
  workoutId: string;
  xpGained: number;
  newStatLevel: number;
  leveledUp: boolean;
  newCharacterLevel: number;
  rankChanged: boolean;
  newRank: Rank;
  promotion: LadderPromotionResponse | null;
  newPr: { exerciseName: string; value: number } | null;
  newAchievements: UnlockedAchievement[];
}

interface AddStudySessionResponse {
  sessionId: string;
  xpGained: number;
  newStatLevel: number;
  leveledUp: boolean;
  newCharacterLevel: number;
  rankChanged: boolean;
  newRank: Rank;
  promotion: LadderPromotionResponse | null;
  newAchievements: UnlockedAchievement[];
}

interface EvolvrState {
  isHydrated: boolean;
  isLoading: boolean;
  hydrationError: string | null;
  userId: string | null;
  displayName: string;

  characterLevel: number;
  rank: Rank;
  rankColor: string;
  currentStreak: number;
  longestStreak: number;

  stats: Record<StatType, { xp: number }>;
  tasks: Task[];
  exerciseRanks: ExerciseRank[];
  subjectRanks: SubjectRank[];
  workouts: Workout[];
  studySessions: StudySession[];
  prs: PersonalRecord[];
  achievements: Achievement[];
  dailyXpHistory: DailyXpRecord[];
  focusHeatmap: { date: string; minutes: number }[];

  xpPopups: XPPopup[];
  levelUpEvent: LevelUpEvent | null;
  rankUpEvent: RankUpEvent | null;
  ladderPromotionEvent: LadderPromotionEvent | null;
  achievementUnlockEvent: UnlockedAchievement | null;

  hydrate: () => Promise<void>;
  completeTask: (taskId: string, origin?: { x: number; y: number }) => Promise<void>;
  createNewTask: (input: {
    title: string;
    type: "habit" | "quest";
    difficulty: "small" | "medium" | "hard" | "major";
    statType: StatType;
  }) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  addWorkout: (workout: {
    name: string;
    durationMinutes: number;
    exercises: { name: string; sets: ExerciseSet[] }[];
  }) => Promise<void>;
  addStudySession: (session: { subject: string; durationMinutes: number; topics: string[]; notes?: string }) => Promise<void>;
  dismissLevelUp: () => void;
  dismissRankUp: () => void;
  dismissLadderPromotion: () => void;
  dismissAchievementUnlock: () => void;
  removeXpPopup: (id: string) => void;
  signOut: () => Promise<void>;
}

function recomputeCharacter(stats: Record<StatType, { xp: number }>) {
  const levels = Object.values(stats).map((s) => levelFromXp(s.xp).level);
  const characterLevel = characterLevelFromStats(levels);
  const { rank, color } = rankFromLevel(characterLevel);
  return { characterLevel, rank, rankColor: color };
}

const EMPTY_STATS: Record<StatType, { xp: number }> = {
  strength: { xp: 0 },
  discipline: { xp: 0 },
  endurance: { xp: 0 },
  physique: { xp: 0 },
  recovery: { xp: 0 },
};

export const useEvolvrStore = create<EvolvrState>((set, get) => ({
  isHydrated: false,
  isLoading: false,
  hydrationError: null,
  userId: null,
  displayName: "Player",

  characterLevel: 1,
  rank: "Novice",
  rankColor: "var(--rank-novice)",
  currentStreak: 0,
  longestStreak: 0,

  stats: EMPTY_STATS,
  tasks: [],
  exerciseRanks: [],
  subjectRanks: [],
  workouts: [],
  studySessions: [],
  prs: [],
  achievements: [],
  dailyXpHistory: [],
  focusHeatmap: [],

  xpPopups: [],
  levelUpEvent: null,
  rankUpEvent: null,
  ladderPromotionEvent: null,
  achievementUnlockEvent: null,

  hydrate: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, hydrationError: null });
    try {
      const { displayName, userId } = await fetchProfile();
      if (!userId) {
        set({ isLoading: false, hydrationError: "Not signed in" });
        return;
      }

      const [stats, tasks, workouts, exerciseRanks, studySessions, subjectRanks, prs, achievements, dailyXpHistory, focusHeatmap, streaks] =
        await Promise.all([
          fetchStats(),
          fetchTasks(),
          fetchWorkouts(),
          fetchExerciseRanks(),
          fetchStudySessions(),
          fetchSubjectRanks(),
          fetchPersonalRecords(),
          fetchAchievements(userId),
          fetchDailyXpHistory(),
          fetchFocusHeatmap(),
          fetchStreaks(userId),
        ]);

      const { characterLevel, rank, rankColor } = recomputeCharacter(stats);

      set({
        isHydrated: true,
        isLoading: false,
        userId,
        displayName,
        stats,
        tasks,
        workouts,
        exerciseRanks,
        studySessions,
        subjectRanks,
        prs,
        achievements,
        dailyXpHistory,
        focusHeatmap,
        characterLevel,
        rank,
        rankColor,
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
      });
    } catch (err) {
      set({ isLoading: false, hydrationError: err instanceof Error ? err.message : "Failed to load your data" });
    }
  },

  completeTask: async (taskId, origin) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.completedToday) return;

    const supabase = createClient();
    const { data, error } = await supabase.rpc("complete_task", { p_task_id: taskId });
    if (error) {
      console.error("complete_task failed", error);
      return;
    }
    const result = data as CompleteTaskResponse;

    const popup: XPPopup = {
      id: `${taskId}-${Date.now()}`,
      amount: result.xpGained,
      statType: result.statType,
      originX: origin?.x ?? 50,
      originY: origin?.y ?? 50,
    };

    const updatedTasks = state.tasks.map((t) =>
      t.id === taskId
        ? { ...t, completedToday: true, streak: t.type === "habit" ? (t.streak ?? 0) + 1 : t.streak }
        : t
    );

    const { rank: prevRank } = state;
    const newRankColor = rankFromLevel(result.newCharacterLevel).color;

    set({
      stats: { ...state.stats, [result.statType]: { xp: state.stats[result.statType].xp + result.xpGained } },
      tasks: updatedTasks,
      characterLevel: result.newCharacterLevel,
      rank: result.newRank,
      rankColor: newRankColor,
      xpPopups: [...state.xpPopups, popup],
      levelUpEvent: result.leveledUp ? { statType: result.statType, newLevel: result.newStatLevel } : state.levelUpEvent,
      rankUpEvent: result.rankChanged ? { rank: result.newRank, color: newRankColor } : state.rankUpEvent,
      achievementUnlockEvent: result.newAchievements?.[0] ?? state.achievementUnlockEvent,
    });

    if (result.rankChanged || prevRank !== result.newRank) {
      fetchStreaks(state.userId!).then((streaks) => set(streaks)).catch(() => {});
    }
  },

  createNewTask: async (input) => {
    await createTask(input);
    const tasks = await fetchTasks();
    set({ tasks });
  },

  removeTask: async (taskId) => {
    await deactivateTask(taskId);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  addWorkout: async (workout) => {
    const state = get();
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_workout", {
      p_name: workout.name,
      p_duration_minutes: workout.durationMinutes,
      p_exercises: workout.exercises,
    });
    if (error) {
      console.error("add_workout failed", error);
      return;
    }
    const result = data as AddWorkoutResponse;

    const newRankColor = rankFromLevel(result.newCharacterLevel).color;
    const promotion = result.promotion
      ? { name: result.promotion.name, tier: result.promotion.tier, division: result.promotion.division, color: ladderTierColor(result.promotion.tier) }
      : null;

    set({
      stats: { ...state.stats, strength: { xp: state.stats.strength.xp + result.xpGained } },
      characterLevel: result.newCharacterLevel,
      rank: result.newRank,
      rankColor: newRankColor,
      xpPopups: [...state.xpPopups, { id: `workout-${Date.now()}`, amount: result.xpGained, statType: "strength", originX: 50, originY: 18 }],
      levelUpEvent: result.leveledUp ? { statType: "strength", newLevel: result.newStatLevel } : state.levelUpEvent,
      rankUpEvent: result.rankChanged ? { rank: result.newRank, color: newRankColor } : state.rankUpEvent,
      achievementUnlockEvent: result.newAchievements?.[0] ?? state.achievementUnlockEvent,
      ladderPromotionEvent: promotion ?? state.ladderPromotionEvent,
    });

    // refetch the slices that the RPC may have touched, so IDs/derived fields stay correct
    const [workouts, exerciseRanks, prs] = await Promise.all([fetchWorkouts(), fetchExerciseRanks(), fetchPersonalRecords()]);
    set({ workouts, exerciseRanks, prs });
  },

  addStudySession: async (session) => {
    const state = get();
    const supabase = createClient();
    const { data, error } = await supabase.rpc("add_study_session", {
      p_subject: session.subject,
      p_duration_minutes: session.durationMinutes,
      p_topics: session.topics,
      p_notes: session.notes ?? null,
    });
    if (error) {
      console.error("add_study_session failed", error);
      return;
    }
    const result = data as AddStudySessionResponse;

    const newRankColor = rankFromLevel(result.newCharacterLevel).color;
    const promotion = result.promotion
      ? { name: result.promotion.name, tier: result.promotion.tier, division: result.promotion.division, color: ladderTierColor(result.promotion.tier) }
      : null;

    set({
      stats: { ...state.stats, discipline: { xp: state.stats.discipline.xp + result.xpGained } },
      characterLevel: result.newCharacterLevel,
      rank: result.newRank,
      rankColor: newRankColor,
      xpPopups: [...state.xpPopups, { id: `study-${Date.now()}`, amount: result.xpGained, statType: "discipline", originX: 50, originY: 18 }],
      levelUpEvent: result.leveledUp ? { statType: "discipline", newLevel: result.newStatLevel } : state.levelUpEvent,
      rankUpEvent: result.rankChanged ? { rank: result.newRank, color: newRankColor } : state.rankUpEvent,
      achievementUnlockEvent: result.newAchievements?.[0] ?? state.achievementUnlockEvent,
      ladderPromotionEvent: promotion ?? state.ladderPromotionEvent,
    });

    const [studySessions, subjectRanks, focusHeatmap] = await Promise.all([
      fetchStudySessions(),
      fetchSubjectRanks(),
      fetchFocusHeatmap(),
    ]);
    set({ studySessions, subjectRanks, focusHeatmap });
  },

  dismissLevelUp: () => set({ levelUpEvent: null }),
  dismissRankUp: () => set({ rankUpEvent: null }),
  dismissLadderPromotion: () => set({ ladderPromotionEvent: null }),
  dismissAchievementUnlock: () => set({ achievementUnlockEvent: null }),
  removeXpPopup: (id) => set((s) => ({ xpPopups: s.xpPopups.filter((p) => p.id !== id) })),

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  },
}));

export function useConsecutiveSlackDays(): number {
  const history = useEvolvrStore((s) => s.dailyXpHistory);
  return countConsecutiveSlackDays(history);
}

export { divisionLabel, ladderTierColor };
