"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Flame, X } from "lucide-react";
import { useConsecutiveSlackDays } from "@/lib/store";
import { DAILY_XP_MINIMUM, slackSeverity } from "@/lib/xp-engine";

export function SlackWarningBanner() {
  const consecutiveDays = useConsecutiveSlackDays();
  const severity = slackSeverity(consecutiveDays);
  const [dismissed, setDismissed] = useState(false);

  if (severity === "none" || dismissed) return null;

  const isDanger = severity === "danger";
  const color = isDanger ? "var(--danger)" : "var(--xp-gold)";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex items-start gap-3 rounded-xl border px-4 py-3.5"
        style={{ borderColor: `${color}40`, background: `${color}0f` }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${color}1f`, color }}
        >
          {isDanger ? <AlertTriangle size={17} /> : <Flame size={17} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-hi">
            {isDanger
              ? `${consecutiveDays} days under your daily minimum`
              : `${consecutiveDays} days under your daily minimum — keep an eye on it`}
          </p>
          <p className="text-xs text-text-mid mt-0.5">
            {isDanger
              ? `You've been below ${DAILY_XP_MINIMUM} XP/day for ${consecutiveDays} days straight. Your streak and stat progress are at real risk — knock out a quest today to get back on track.`
              : `You've been below ${DAILY_XP_MINIMUM} XP/day for ${consecutiveDays} days. One more slack day and this becomes a bigger problem.`}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-text-low hover:text-text-hi shrink-0"
          aria-label="Dismiss warning"
        >
          <X size={15} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
