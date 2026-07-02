"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { StatBar } from "@/components/dashboard/StatBar";
import { QuestCard } from "@/components/dashboard/QuestCard";
import { SlackWarningBanner } from "@/components/dashboard/SlackWarningBanner";
import { TaskEditor } from "@/components/dashboard/TaskEditor";
import { useEvolvrStore } from "@/lib/store";
import { StatType } from "@/lib/types";

const STAT_ORDER: StatType[] = ["strength", "discipline", "endurance", "physique", "recovery"];

export default function DashboardPage() {
  const stats = useEvolvrStore((s) => s.stats);
  const tasks = useEvolvrStore((s) => s.tasks);
  const [editorOpen, setEditorOpen] = useState(false);

  const completedCount = tasks.filter((t) => t.completedToday).length;

  return (
    <div className="flex flex-col gap-8">
      <SlackWarningBanner />
      <HeroCard />

      <section>
        <h2 className="font-display font-bold text-lg text-text-hi mb-4">Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 bg-card border border-border rounded-2xl p-5">
          {STAT_ORDER.map((statType) => (
            <StatBar key={statType} statType={statType} xp={stats[statType].xp} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-text-hi">Daily quests</h2>
          <div className="flex items-center gap-3">
            <span className="font-mono-tabular text-xs text-text-mid">
              {completedCount} / {tasks.length} done
            </span>
            <button
              onClick={() => setEditorOpen(true)}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
            >
              <Plus size={13} />
              Add task
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {tasks.map((task) => (
            <QuestCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-text-low text-center py-6">
              No tasks yet — tap &quot;Add task&quot; to create your first one.
            </p>
          )}
        </div>
      </section>

      <TaskEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
