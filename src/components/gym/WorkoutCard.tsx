"use client";

import { Workout } from "@/lib/types";
import { Clock, Dumbbell } from "lucide-react";

function formatSet(set: Workout["exercises"][number]["sets"][number]) {
  const weightLabel = set.weightType === "bodyweight" ? "Bodyweight" : `${set.weight}kg`;
  return `${weightLabel}×${set.reps}`;
}

export function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-text-hi">{workout.name}</h3>
        <span className="flex items-center gap-1 text-xs text-text-mid">
          <Clock size={13} />
          {workout.durationMinutes}m
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {workout.exercises.map((ex) => (
          <div key={ex.name} className="flex items-start gap-2.5">
            <Dumbbell size={14} className="text-text-low mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-text-hi">{ex.name}</p>
              <p className="font-mono-tabular text-xs text-text-mid">
                {ex.sets.map(formatSet).join("  ·  ")}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text-low mt-3">{new Date(workout.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
    </div>
  );
}
