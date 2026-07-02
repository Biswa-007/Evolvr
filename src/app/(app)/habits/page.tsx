"use client";

import { useEvolvrStore } from "@/lib/store";
import { HabitCard } from "@/components/habits/HabitCard";

export default function HabitsPage() {
  const tasks = useEvolvrStore((s) => s.tasks);
  const habits = tasks.filter((t) => t.type === "habit");
  const currentStreak = useEvolvrStore((s) => s.currentStreak);
  const longestStreak = useEvolvrStore((s) => s.longestStreak);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-text-hi">Habits</h1>
        <div className="flex gap-4 text-right">
          <div>
            <p className="font-mono-tabular text-lg font-bold text-xp-gold leading-none">{currentStreak}</p>
            <p className="text-[11px] text-text-low">current</p>
          </div>
          <div>
            <p className="font-mono-tabular text-lg font-bold text-text-hi leading-none">{longestStreak}</p>
            <p className="text-[11px] text-text-low">longest</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {habits.map((h) => (
          <HabitCard key={h.id} task={h} />
        ))}
      </div>
    </div>
  );
}
