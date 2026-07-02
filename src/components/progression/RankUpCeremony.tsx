"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEvolvrStore } from "@/lib/store";
import { Crown } from "lucide-react";
import { STAT_LABELS, STAT_COLORS } from "@/lib/xp-engine";
import { levelFromXp } from "@/lib/xp-engine";

const PARTICLE_COUNT = 24;

export function RankUpCeremony() {
  const event = useEvolvrStore((s) => s.rankUpEvent);
  const dismiss = useEvolvrStore((s) => s.dismissRankUp);

  return <AnimatePresence>{event && <CeremonyContent event={event} onDismiss={dismiss} />}</AnimatePresence>;
}

function CeremonyContent({ event, onDismiss }: { event: RankUpEventLike; onDismiss: () => void }) {
  const stats = useEvolvrStore((s) => s.stats);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 1000);
    return () => clearTimeout(t);
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        return {
          id: i,
          dx: Math.cos(angle) * (120 + (i % 3) * 30),
          dy: Math.sin(angle) * (120 + (i % 3) * 30),
          delay: 0.3 + (i % 4) * 0.04,
        };
      }),
    []
  );

  const rankName = event.rank;
  const letters = rankName.split("");

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-4"
      style={{ background: "rgba(7, 17, 31, 0.94)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => canSkip && onDismiss()}
    >
      {/* charge: radial glow pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 10,
          height: 10,
          background: event.color,
        }}
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 60, opacity: 0 }}
        transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
      />

      {/* particle burst on reveal */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ background: event.color }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0 }}
          transition={{ duration: 0.9, delay: p.delay, ease: "easeOut" }}
        />
      ))}

      {/* badge reveal */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: [0, 1.15, 1], rotate: 0 }}
        transition={{ duration: 0.7, delay: 1.0, times: [0, 0.7, 1], ease: "easeOut" }}
        className="relative mb-6"
        style={{ filter: `drop-shadow(0 0 28px ${event.color}aa)` }}
      >
        <svg viewBox="0 0 100 110" width={120} height={132}>
          <polygon points="50,2 95,27 95,82 50,108 5,82 5,27" fill="var(--card)" stroke={event.color} strokeWidth="3" />
          <polygon
            points="50,12 87,32 87,78 50,98 13,78 13,32"
            fill="none"
            stroke={event.color}
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: event.color }}>
          <Crown size={40} />
        </div>
      </motion.div>

      {/* rank name, letter by letter */}
      <p className="text-xs uppercase tracking-[0.3em] text-text-low mb-2">Rank up</p>
      <h1 className="font-display font-bold text-3xl md:text-4xl flex mb-6" style={{ color: event.color }}>
        {letters.map((l, i) => (
          <motion.span key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 + i * 0.045 }}>
            {l === " " ? "\u00A0" : l}
          </motion.span>
        ))}
      </h1>

      {/* stat snapshot */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-8 text-sm text-text-mid"
      >
        {(Object.keys(stats) as Array<keyof typeof stats>).map((key) => (
          <span key={key} className="font-mono-tabular">
            <span style={{ color: STAT_COLORS[key] }}>{STAT_LABELS[key]}</span> {levelFromXp(stats[key].xp).level}
          </span>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: canSkip ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        onClick={onDismiss}
        disabled={!canSkip}
        className="px-6 py-2.5 rounded-lg text-sm font-medium border transition-colors"
        style={{
          borderColor: `${event.color}55`,
          color: event.color,
          background: `${event.color}14`,
        }}
      >
        Continue
      </motion.button>
    </motion.div>
  );
}

type RankUpEventLike = { rank: string; color: string };
