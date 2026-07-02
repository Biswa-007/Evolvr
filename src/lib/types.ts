export type StatType =
  | "strength"
  | "discipline"
  | "endurance"
  | "physique"
  | "recovery";

export interface StatBlock {
  type: StatType;
  level: number;
  xp: number;
}

export type Rank =
  | "Novice"
  | "Iron Disciple"
  | "Bronze Hunter"
  | "Silver Warrior"
  | "Gold Titan"
  | "Ascended Alpha";

export interface Profile {
  name: string;
  characterLevel: number;
  rank: Rank;
  currentStreak: number;
  longestStreak: number;
}

export type TaskType = "habit" | "quest";
export type Difficulty = "small" | "medium" | "hard" | "major";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  difficulty: Difficulty;
  xpReward: number;
  statType: StatType;
  streak?: number;
  successRate?: number;
  completedToday: boolean;
}

export interface ExerciseSet {
  weightType: "kg" | "bodyweight";
  weight: number; // ignored/0 when weightType is "bodyweight"
  reps: number;
}

export interface Workout {
  id: string;
  name: string;
  date: string;
  durationMinutes: number;
  exercises: {
    name: string;
    sets: ExerciseSet[];
  }[];
}

export type LadderTier =
  | "Wood"
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Champion"
  | "Titan"
  | "Olympian";

export interface ExerciseRank {
  id?: string;
  exerciseName: string;
  tier: LadderTier;
  division: number | null; // 1 (I) - 3 (III), null for Olympian
  lp: number;
  bestEstimated1RM: number | null;
}

export interface StudySession {
  id: string;
  subject: string;
  date: string;
  durationMinutes: number;
  topics: string[];
  notes?: string;
}

export interface SubjectRank {
  id?: string;
  subjectName: string;
  tier: LadderTier;
  division: number | null;
  lp: number;
  totalHours: number;
}

export interface PersonalRecord {
  id?: string;
  exerciseName: string;
  value: number;
  unit: "kg" | "lb";
  achievedAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface XPGainEvent {
  amount: number;
  statType: StatType;
  source: string;
}

export interface DailyXpRecord {
  date: string; // YYYY-MM-DD
  xp: number;
}
