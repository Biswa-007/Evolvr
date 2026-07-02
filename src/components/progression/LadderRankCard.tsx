"use client";

import { LadderTier } from "@/lib/types";
import { ladderTierColor, divisionLabel } from "@/lib/xp-engine";
import { RankBadge } from "@/components/progression/RankBadge";

export function LadderRankCard({
  name,
  tier,
  division,
  lp,
  subtitle,
  icon,
}: {
  name: string;
  tier: LadderTier;
  division: number | null;
  lp: number;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  const color = ladderTierColor(tier);

  return (
    <div className="flex flex-col items-center gap-3 bg-card border border-border rounded-xl px-4 py-5 min-w-[150px]">
      <RankBadge color={color} size={64}>
        {icon}
      </RankBadge>
      <div className="text-center">
        <p className="font-display font-bold text-sm" style={{ color }}>
          {tier} {divisionLabel(division)}
        </p>
        <p className="text-xs text-text-mid mt-0.5">{name}</p>
        {subtitle && <p className="text-[11px] text-text-low mt-0.5">{subtitle}</p>}
      </div>
      <div className="w-full">
        <div className="h-1.5 rounded-full bg-bg-elevated border border-border-soft overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${lp}%`, background: color }} />
        </div>
        <p className="font-mono-tabular text-[11px] text-text-low mt-1 text-center">{lp} LP</p>
      </div>
    </div>
  );
}
