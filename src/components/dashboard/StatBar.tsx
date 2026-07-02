"use client";

import { motion } from "framer-motion";
import { levelFromXp } from "@/lib/xp-engine";
import { StatType } from "@/lib/types";
import { STAT_COLORS, STAT_LABELS } from "@/lib/xp-engine";

export function StatBar({ statType, xp }: { statType: StatType; xp: number }) {
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(xp);
  const pct = Math.min(100, (xpIntoLevel / xpForNextLevel) * 100);
  const color = STAT_COLORS[statType];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-text-hi">{STAT_LABELS[statType]}</span>
        <span className="font-mono-tabular text-xs text-text-mid">Lv {level}</span>
      </div>
      <div className="h-2 rounded-full bg-bg-elevated border border-border-soft overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}66` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
