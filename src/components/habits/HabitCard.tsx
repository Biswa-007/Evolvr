"use client";

import { useRef } from "react";
import { Check, Flame } from "lucide-react";
import { Task } from "@/lib/types";
import { useEvolvrStore } from "@/lib/store";
import { STAT_COLORS, STAT_LABELS } from "@/lib/xp-engine";
import { cn } from "@/lib/utils";

export function HabitCard({ task }: { task: Task }) {
  const completeTask = useEvolvrStore((s) => s.completeTask);
  const ref = useRef<HTMLButtonElement>(null);
  const color = STAT_COLORS[task.statType];

  function handleComplete() {
    if (task.completedToday) return;
    const rect = ref.current?.getBoundingClientRect();
    const origin = rect
      ? { x: ((rect.left + rect.width / 2) / window.innerWidth) * 100, y: (rect.top / window.innerHeight) * 100 }
      : undefined;
    completeTask(task.id, origin);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <button
        ref={ref}
        onClick={handleComplete}
        disabled={task.completedToday}
        className={cn(
          "shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors",
          task.completedToday ? "bg-success/15 border-success/50" : "border-border-soft hover:border-primary/50"
        )}
        style={!task.completedToday ? { borderColor: `${color}40` } : undefined}
      >
        {task.completedToday ? <Check size={18} className="text-success" /> : <Flame size={18} style={{ color }} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-hi">{task.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs" style={{ color }}>
            {STAT_LABELS[task.statType]}
          </span>
          <span className="font-mono-tabular text-xs text-text-mid">Streak: {task.streak ?? 0}d</span>
          {task.successRate !== undefined && (
            <span className="font-mono-tabular text-xs text-text-low">{task.successRate}% success</span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-bg-elevated border border-border-soft overflow-hidden mt-2 max-w-[160px]">
          <div className="h-full rounded-full" style={{ width: `${task.successRate ?? 0}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}
