"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, Flame, TrendingUp, Shield, Crown, Award, X } from "lucide-react";
import { useEvolvrStore } from "@/lib/store";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  dumbbell: Dumbbell,
  flame: Flame,
  "trending-up": TrendingUp,
  shield: Shield,
  crown: Crown,
  scale: Award,
};

export function AchievementToast() {
  const event = useEvolvrStore((s) => s.achievementUnlockEvent);
  const dismiss = useEvolvrStore((s) => s.dismissAchievementUnlock);

  const Icon = event ? ICONS[event.icon] ?? Award : Award;

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed top-20 inset-x-0 z-[65] flex justify-center px-4"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div
            className="flex items-center gap-3 bg-card border rounded-xl pl-3 pr-4 py-2.5 shadow-lg"
            style={{ borderColor: "#ffd54a55", boxShadow: "0 0 24px #ffd54a33" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-xp-gold/15 text-xp-gold"
            >
              <Icon size={16} />
            </div>
            <div>
              <p className="text-xs text-text-low leading-none mb-0.5">Achievement unlocked</p>
              <p className="font-display font-bold text-sm leading-none text-xp-gold">{event.title}</p>
            </div>
            <button onClick={dismiss} className="ml-2 text-text-low hover:text-text-hi" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
