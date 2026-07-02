"use client";

import { motion } from "framer-motion";
import { Flame, Crown } from "lucide-react";
import { useEvolvrStore } from "@/lib/store";
import { RankBadge } from "@/components/progression/RankBadge";
import { levelFromXp, xpRequiredForLevel } from "@/lib/xp-engine";

export function HeroCard() {
  const characterLevel = useEvolvrStore((s) => s.characterLevel);
  const rank = useEvolvrStore((s) => s.rank);
  const rankColor = useEvolvrStore((s) => s.rankColor);
  const currentStreak = useEvolvrStore((s) => s.currentStreak);
  const stats = useEvolvrStore((s) => s.stats);

  // aggregate xp bar = average progress-into-level across stats, for a single satisfying headline bar
  const progressValues = Object.values(stats).map((s) => {
    const { xpIntoLevel, xpForNextLevel } = levelFromXp(s.xp);
    return xpIntoLevel / xpForNextLevel;
  });
  const avgPct = (progressValues.reduce((a, b) => a + b, 0) / progressValues.length) * 100;
  const totalIntoLevel = Math.round((avgPct / 100) * xpRequiredForLevel(characterLevel));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-7">
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: rankColor }}
      />
      <div className="relative flex items-center gap-5">
        <RankBadge color={rankColor} size={72}>
          <Crown size={28} />
        </RankBadge>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: rankColor }}>
              {rank}
            </p>
          </div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-text-hi mb-3">
            Level {characterLevel}
          </h1>

          <div className="h-2.5 rounded-full bg-bg-elevated border border-border-soft overflow-hidden mb-1.5">
            <motion.div
              className="h-full rounded-full"
              style={{ background: rankColor, boxShadow: `0 0 10px ${rankColor}66` }}
              initial={{ width: 0 }}
              animate={{ width: `${avgPct}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="font-mono-tabular text-xs text-text-mid">
            {totalIntoLevel} / {xpRequiredForLevel(characterLevel)} XP
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-center gap-1 pl-5 border-l border-border-soft">
          <div className="flex items-center gap-1 text-xp-gold">
            <Flame size={20} />
            <span className="font-display font-bold text-xl">{currentStreak}</span>
          </div>
          <span className="text-[11px] text-text-low">day streak</span>
        </div>
      </div>
    </div>
  );
}
