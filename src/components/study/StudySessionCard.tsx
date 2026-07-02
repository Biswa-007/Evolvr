"use client";

import { StudySession } from "@/lib/types";
import { Clock, BookOpen } from "lucide-react";

export function StudySessionCard({ session }: { session: StudySession }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-text-hi">{session.subject}</h3>
        <span className="flex items-center gap-1 text-xs text-text-mid">
          <Clock size={13} />
          {session.durationMinutes}m
        </span>
      </div>
      {session.topics.length > 0 && (
        <div className="flex items-start gap-2 mb-2">
          <BookOpen size={14} className="text-text-low mt-0.5 shrink-0" />
          <p className="text-sm text-text-hi">{session.topics.join(", ")}</p>
        </div>
      )}
      {session.notes && <p className="text-xs text-text-mid leading-relaxed mb-1">{session.notes}</p>}
      <p className="text-[11px] text-text-low mt-2">
        {new Date(session.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}
