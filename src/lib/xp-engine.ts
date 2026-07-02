import { LadderTier, Rank, StatType } from "./types";

/** xp_required_for_level(n) = round(100 * n^1.5) — from the implementation plan */
export function xpRequiredForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

/** Given total accumulated xp for a stat, derive its level + progress into the next level. */
export function levelFromXp(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  let level = 1;
  let remaining = totalXp;
  let needed = xpRequiredForLevel(level);
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpRequiredForLevel(level);
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: needed };
}

export const RANK_TIERS: { min: number; max: number; rank: Rank; color: string }[] = [
  { min: 1, max: 5, rank: "Novice", color: "var(--rank-novice)" },
  { min: 6, max: 10, rank: "Iron Disciple", color: "var(--rank-iron)" },
  { min: 11, max: 20, rank: "Bronze Hunter", color: "var(--rank-bronze)" },
  { min: 21, max: 35, rank: "Silver Warrior", color: "var(--rank-silver)" },
  { min: 36, max: 50, rank: "Gold Titan", color: "var(--rank-gold)" },
  { min: 51, max: Infinity, rank: "Ascended Alpha", color: "var(--rank-ascended)" },
];

export function rankFromLevel(level: number): { rank: Rank; color: string } {
  const tier = RANK_TIERS.find((t) => level >= t.min && level <= t.max)!;
  return { rank: tier.rank, color: tier.color };
}

export function characterLevelFromStats(statLevels: number[]): number {
  if (statLevels.length === 0) return 1;
  const avg = statLevels.reduce((a, b) => a + b, 0) / statLevels.length;
  return Math.max(1, Math.floor(avg));
}

export const STAT_LABELS: Record<StatType, string> = {
  strength: "Strength",
  discipline: "Discipline",
  endurance: "Endurance",
  physique: "Physique",
  recovery: "Recovery",
};

export const STAT_COLORS: Record<StatType, string> = {
  strength: "var(--danger)",
  discipline: "var(--primary)",
  endurance: "var(--success)",
  physique: "var(--xp-gold)",
  recovery: "var(--rank-ascended)",
};

export const XP_REWARDS = {
  small: 10,
  medium: 30,
  hard: 75,
  major: 150,
};

/* ---------------- Exercise Rank Ladder (Section 6B) ---------------- */

export const LADDER_TIERS: { tier: LadderTier; color: string; hasDivisions: boolean }[] = [
  { tier: "Wood", color: "var(--tier-wood)", hasDivisions: true },
  { tier: "Bronze", color: "var(--tier-bronze)", hasDivisions: true },
  { tier: "Silver", color: "var(--tier-silver)", hasDivisions: true },
  { tier: "Gold", color: "var(--tier-gold)", hasDivisions: true },
  { tier: "Platinum", color: "var(--tier-platinum)", hasDivisions: true },
  { tier: "Diamond", color: "var(--tier-diamond)", hasDivisions: true },
  { tier: "Champion", color: "var(--tier-champion)", hasDivisions: true },
  { tier: "Titan", color: "var(--tier-titan)", hasDivisions: true },
  { tier: "Olympian", color: "var(--tier-olympian)", hasDivisions: false },
];

export function ladderTierColor(tier: LadderTier): string {
  return LADDER_TIERS.find((t) => t.tier === tier)?.color ?? "var(--text-low)";
}

export function divisionLabel(division: number | null): string {
  if (division === null) return "";
  return ["", "III", "II", "I"][division] ?? "";
}

/* ---------------- Daily minimum / slacking detection ---------------- */

/** The "bare minimum" daily XP a user should hit to be considered on track. */
export const DAILY_XP_MINIMUM = 50;

/**
 * Counts consecutive days (most recent first, walking backward) where xp fell
 * below the daily minimum. `history` should be ordered oldest -> newest and
 * should NOT include today (today is still in progress and shouldn't count
 * as a slack day yet).
 */
export function countConsecutiveSlackDays(history: { date: string; xp: number }[], minimum = DAILY_XP_MINIMUM): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].xp < minimum) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

export type SlackSeverity = "none" | "caution" | "danger";

export function slackSeverity(consecutiveDays: number): SlackSeverity {
  if (consecutiveDays >= 3) return "danger";
  if (consecutiveDays >= 2) return "caution";
  return "none";
}
