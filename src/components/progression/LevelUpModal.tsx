"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEvolvrStore } from "@/lib/store";
import { STAT_COLORS, STAT_LABELS } from "@/lib/xp-engine";
import { Sparkles } from "lucide-react";

export function LevelUpModal() {
  const event = useEvolvrStore((s) => s.levelUpEvent);
  const dismiss = useEvolvrStore((s) => s.dismissLevelUp);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/70 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="relative bg-card border rounded-2xl px-8 py-8 flex flex-col items-center text-center max-w-sm"
            style={{ borderColor: `${STAT_COLORS[event.statType]}55` }}
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: `${STAT_COLORS[event.statType]}1a`,
                boxShadow: `0 0 24px ${STAT_COLORS[event.statType]}55`,
              }}
            >
              <Sparkles size={28} style={{ color: STAT_COLORS[event.statType] }} />
            </div>
            <p className="text-xs uppercase tracking-widest text-text-low mb-1">Level up</p>
            <h2 className="font-display font-bold text-2xl text-text-hi mb-1">
              {STAT_LABELS[event.statType]} reached level {event.newLevel}
            </h2>
            <p className="text-sm text-text-mid mb-6">Keep stacking consistent wins.</p>
            <button
              onClick={dismiss}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
