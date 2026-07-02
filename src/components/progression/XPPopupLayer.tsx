"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEvolvrStore } from "@/lib/store";
import { STAT_COLORS, STAT_LABELS } from "@/lib/xp-engine";

export function XPPopupLayer() {
  const popups = useEvolvrStore((s) => s.xpPopups);
  const removeXpPopup = useEvolvrStore((s) => s.removeXpPopup);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      <AnimatePresence>
        {popups.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -60, scale: 1 }}
            exit={{ opacity: 0, y: -90 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            onAnimationComplete={() => removeXpPopup(p.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${p.originX}%`, top: `${p.originY}%` }}
          >
            <span
              className="font-display font-bold text-base px-3 py-1 rounded-full border"
              style={{
                color: STAT_COLORS[p.statType],
                borderColor: `${STAT_COLORS[p.statType]}55`,
                background: "var(--card)",
                boxShadow: `0 0 16px ${STAT_COLORS[p.statType]}40`,
              }}
            >
              +{p.amount} XP
            </span>
            <span className="text-[11px] text-text-mid mt-1">{STAT_LABELS[p.statType]}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
