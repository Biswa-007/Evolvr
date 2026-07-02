"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEvolvrStore } from "@/lib/store";
import { divisionLabel } from "@/lib/xp-engine";
import { TrendingUp, X } from "lucide-react";

export function LadderPromotionToast() {
  const event = useEvolvrStore((s) => s.ladderPromotionEvent);
  const dismiss = useEvolvrStore((s) => s.dismissLadderPromotion);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed top-6 inset-x-0 z-[65] flex justify-center px-4"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div
            className="flex items-center gap-3 bg-card border rounded-xl pl-3 pr-4 py-2.5 shadow-lg"
            style={{ borderColor: `${event.color}55`, boxShadow: `0 0 24px ${event.color}33` }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${event.color}1f`, color: event.color }}
            >
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-xs text-text-low leading-none mb-0.5">{event.name} promoted</p>
              <p className="font-display font-bold text-sm leading-none" style={{ color: event.color }}>
                {event.tier} {divisionLabel(event.division)}
              </p>
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
