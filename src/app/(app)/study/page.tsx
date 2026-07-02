"use client";

import { useState } from "react";
import { useEvolvrStore } from "@/lib/store";
import { StudySessionCard } from "@/components/study/StudySessionCard";
import { StudySessionEditor } from "@/components/study/StudySessionEditor";
import { FocusHeatmap } from "@/components/study/FocusHeatmap";
import { LadderRankCard } from "@/components/progression/LadderRankCard";
import { cn } from "@/lib/utils";
import { BookOpen, Plus } from "lucide-react";

const TABS = ["Sessions", "Subject ranks", "Focus"] as const;
type Tab = (typeof TABS)[number];

export default function StudyPage() {
  const [tab, setTab] = useState<Tab>("Sessions");
  const [editorOpen, setEditorOpen] = useState(false);
  const studySessions = useEvolvrStore((s) => s.studySessions);
  const subjectRanks = useEvolvrStore((s) => s.subjectRanks);
  const focusHeatmap = useEvolvrStore((s) => s.focusHeatmap);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-text-hi">Study</h1>
        <button
          onClick={() => setEditorOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
        >
          <Plus size={15} />
          Log a session
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

      {tab === "Sessions" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {studySessions.map((s) => (
            <StudySessionCard key={s.id} session={s} />
          ))}
        </div>
      )}

      {tab === "Subject ranks" && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-text-mid -mt-2">
            Each subject climbs its own ladder — the same Wood-through-Olympian system as your lifts — independent
            of your overall Discipline stat.
          </p>
          <div className="flex flex-wrap gap-4">
            {subjectRanks.map((r) => (
              <LadderRankCard
                key={r.subjectName}
                name={r.subjectName}
                tier={r.tier}
                division={r.division}
                lp={r.lp}
                subtitle={`${r.totalHours.toFixed(0)}h logged`}
                icon={<BookOpen size={24} />}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "Focus" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-sm text-text-mid mb-5">Daily study minutes over the last 4 weeks.</p>
          <FocusHeatmap data={focusHeatmap} />
        </div>
      )}

      <StudySessionEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
