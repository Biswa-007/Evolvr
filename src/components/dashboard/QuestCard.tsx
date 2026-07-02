"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Flame, X } from "lucide-react";
import { Task } from "@/lib/types";
import { useEvolvrStore } from "@/lib/store";
import { STAT_COLORS, STAT_LABELS } from "@/lib/xp-engine";
import { cn } from "@/lib/utils";

const DIFFICULTY_PIPS: Record<Task["difficulty"], number> = {
  small: 1,
  medium: 2,
  hard: 3,
  major: 4,
};

export function QuestCard({ task }: { task: Task }) {
  const completeTask = useEvolvrStore((s) => s.completeTask);
  const removeTask = useEvolvrStore((s) => s.removeTask);
  const ref = useRef<HTMLButtonElement>(null);
  const color = STAT_COLORS[task.statType];
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleComplete() {
    if (task.completedToday) return;
    const rect = ref.current?.getBoundingClientRect();
    const origin = rect
      ? {
          x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
          y: ((rect.top) / window.innerHeight) * 100,
        }
      : undefined;
    completeTask(task.id, origin);
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 transition-colors",
        task.completedToday ? "border-border-soft opacity-60" : "border-border hover:border-border-soft"
      )}
    >
      <button
        ref={ref}
        onClick={handleComplete}
        aria-label={task.completedToday ? `${task.title} completed` : `Complete ${task.title}`}
        disabled={task.completedToday}
        className={cn(
          "shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-all",
          task.completedToday ? "bg-success/15 border-success/40" : "border-border-soft hover:border-primary/50"
        )}
      >
        {task.completedToday ? (
          <Check size={16} className="text-success" />
        ) : (
          <motion.div whileTap={{ scale: 0.85 }} className="w-3 h-3 rounded-full" style={{ background: color }} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium text-text-hi truncate", task.completedToday && "line-through")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px]" style={{ color }}>
            {STAT_LABELS[task.statType]}
          </span>
          <span className="flex gap-0.5">
            {Array.from({ length: 4 }, (_, i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ background: i < DIFFICULTY_PIPS[task.difficulty] ? color : "var(--border)" }}
              />
            ))}
          </span>
          {task.type === "habit" && task.streak !== undefined && (
            <span className="flex items-center gap-0.5 text-[11px] text-xp-gold">
              <Flame size={11} />
              {task.streak}
            </span>
          )}
        </div>
      </div>

      <span className="font-mono-tabular text-xs text-text-mid shrink-0">+{task.xpReward} XP</span>

      {confirmingDelete ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => removeTask(task.id)}
            className="text-[11px] font-medium text-danger px-2 py-1 rounded hover:bg-danger/10"
          >
            Remove
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="text-[11px] text-text-low px-2 py-1 rounded hover:bg-bg-elevated"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDelete(true)}
          className="shrink-0 text-text-low hover:text-danger opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1"
          aria-label={`Remove ${task.title}`}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
