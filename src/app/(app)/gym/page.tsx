"use client";

import { useState } from "react";
import { useEvolvrStore } from "@/lib/store";
import { WorkoutCard } from "@/components/gym/WorkoutCard";
import { WorkoutEditor } from "@/components/gym/WorkoutEditor";
import { MuscleHeatmap } from "@/components/gym/MuscleHeatmap";
import { LadderRankCard } from "@/components/progression/LadderRankCard";
import { MUSCLE_VOLUME } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Dumbbell, Plus } from "lucide-react";

const TABS = ["Workouts", "Exercise ranks", "Body"] as const;
type Tab = (typeof TABS)[number];

export default function GymPage() {
  const [tab, setTab] = useState<Tab>("Workouts");
  const [editorOpen, setEditorOpen] = useState(false);
  const workouts = useEvolvrStore((s) => s.workouts);
  const prs = useEvolvrStore((s) => s.prs);
  const exerciseRanks = useEvolvrStore((s) => s.exerciseRanks);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-text-hi">Gym</h1>
        <button
          onClick={() => setEditorOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
        >
          <Plus size={15} />
          Log a workout
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-text-mid hover:text-text-hi"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Workouts" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}

      {tab === "Exercise ranks" && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-text-mid -mt-2">
            Each lift climbs its own ladder — Wood through Olympian — independent of your overall Strength stat.
            Logging a workout with a matching exercise name advances that ladder.
          </p>
          <div className="flex flex-wrap gap-4">
            {exerciseRanks.map((r) => (
              <LadderRankCard
                key={r.exerciseName}
                name={r.exerciseName}
                tier={r.tier}
                division={r.division}
                lp={r.lp}
                subtitle={r.bestEstimated1RM != null ? `${r.bestEstimated1RM}kg best` : "No weighted PR yet"}
                icon={<Dumbbell size={24} />}
              />
            ))}
          </div>

          <div>
            <h2 className="font-display font-bold text-lg text-text-hi mb-3">Personal records</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {prs.map((pr) => (
                <div
                  key={pr.exerciseName}
                  className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3"
                >
                  <span className="text-sm text-text-hi">{pr.exerciseName}</span>
                  <span className="font-mono-tabular text-sm text-xp-gold font-medium">
                    {pr.value}
                    {pr.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Body" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-sm text-text-mid mb-5">Rolling 4-week training volume per muscle group.</p>
          <MuscleHeatmap volume={MUSCLE_VOLUME} />
        </div>
      )}

      <WorkoutEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
