"use client";

import { useEvolvrStore } from "@/lib/store";
import { RankBadge } from "@/components/progression/RankBadge";
import { levelFromXp, STAT_COLORS, STAT_LABELS } from "@/lib/xp-engine";
import { StatType } from "@/lib/types";
import { Crown, Dumbbell, Flame, TrendingUp, Shield, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const STAT_ORDER: StatType[] = ["strength", "discipline", "endurance", "physique", "recovery"];

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  dumbbell: Dumbbell,
  flame: Flame,
  "trending-up": TrendingUp,
  shield: Shield,
  crown: Crown,
  scale: Award,
};

export default function ProfilePage() {
  const rank = useEvolvrStore((s) => s.rank);
  const rankColor = useEvolvrStore((s) => s.rankColor);
  const characterLevel = useEvolvrStore((s) => s.characterLevel);
  const stats = useEvolvrStore((s) => s.stats);
  const achievements = useEvolvrStore((s) => s.achievements);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center text-center bg-card border border-border rounded-2xl py-8 px-6">
        <RankBadge color={rankColor} size={88}>
          <Crown size={36} />
        </RankBadge>
        <h1 className="font-display font-bold text-xl text-text-hi mt-4">Player</h1>
        <p className="text-sm" style={{ color: rankColor }}>
          {rank} · Level {characterLevel}
        </p>
      </div>

      <section>
        <h2 className="font-display font-bold text-lg text-text-hi mb-3">Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {STAT_ORDER.map((key) => (
            <div key={key} className="bg-card border border-border rounded-xl px-3 py-3 text-center">
              <p className="font-mono-tabular font-bold text-xl" style={{ color: STAT_COLORS[key] }}>
                {levelFromXp(stats[key].xp).level}
              </p>
              <p className="text-[11px] text-text-mid mt-0.5">{STAT_LABELS[key]}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-lg text-text-hi mb-3">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map((a) => {
            const Icon = ICONS[a.icon] ?? Award;
            return (
              <div
                key={a.id}
                className={cn(
                  "flex flex-col items-center text-center gap-2 rounded-xl border px-3 py-4",
                  a.unlocked ? "bg-card border-border" : "bg-card/40 border-border-soft opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center",
                    a.unlocked ? "bg-xp-gold/15 text-xp-gold" : "bg-bg-elevated text-text-low"
                  )}
                >
                  <Icon size={20} />
                </div>
                <p className="text-xs font-medium text-text-hi">{a.title}</p>
                <p className="text-[11px] text-text-low leading-snug">{a.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
