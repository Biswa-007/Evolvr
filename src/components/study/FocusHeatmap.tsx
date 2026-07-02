"use client";

import { colorForIntensity } from "@/lib/heatmap-color";

export function FocusHeatmap({ data }: { data: { date: string; minutes: number }[] }) {
  const maxMinutes = Math.max(60, ...data.map((d) => d.minutes));

  // pad the front so the grid starts on a Sunday, like a contributions calendar
  const firstDate = new Date(data[0].date);
  const leadingEmpty = firstDate.getDay();
  const cells: ({ date: string; minutes: number } | null)[] = [
    ...Array.from({ length: leadingEmpty }, () => null),
    ...data,
  ];

  const weeks: ({ date: string; minutes: number } | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const totalMinutes = data.reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = data.filter((d) => d.minutes > 0).length;

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) =>
              day ? (
                <div
                  key={day.date}
                  title={`${day.date} — ${day.minutes}m`}
                  className="w-4 h-4 rounded-sm"
                  style={{ background: day.minutes > 0 ? colorForIntensity(day.minutes, maxMinutes) : "var(--bg-elevated)" }}
                />
              ) : (
                <div key={`empty-${wi}-${di}`} className="w-4 h-4 rounded-sm" />
              )
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-mid mt-3">
        <span className="font-mono-tabular text-text-hi">{Math.round(totalMinutes / 60)}h</span> studied across{" "}
        <span className="font-mono-tabular text-text-hi">{activeDays}</span> of the last {data.length} days
      </p>
    </div>
  );
}
