"use client";

import { colorForIntensity } from "@/lib/heatmap-color";

export function MuscleHeatmap({ volume }: { volume: Record<string, number> }) {
  const fill = (key: string) => colorForIntensity(volume[key] ?? 0);

  return (
    <div className="flex items-center justify-center gap-8">
      <svg viewBox="0 0 160 320" width="150" height="300" className="shrink-0">
        {/* head */}
        <circle cx="80" cy="22" r="16" fill="var(--border-soft)" />
        {/* neck */}
        <rect x="73" y="36" width="14" height="10" fill="var(--border-soft)" />
        {/* shoulders / traps */}
        <rect x="38" y="46" width="84" height="14" rx="7" fill={fill("shoulders")} />
        {/* chest */}
        <rect x="48" y="58" width="64" height="38" rx="10" fill={fill("chest")} />
        {/* abs */}
        <rect x="58" y="98" width="44" height="46" rx="8" fill={fill("abs")} />
        {/* biceps */}
        <rect x="26" y="60" width="16" height="46" rx="8" fill={fill("biceps")} />
        <rect x="118" y="60" width="16" height="46" rx="8" fill={fill("biceps")} />
        {/* forearms */}
        <rect x="24" y="108" width="13" height="42" rx="6" fill={fill("forearms")} />
        <rect x="123" y="108" width="13" height="42" rx="6" fill={fill("forearms")} />
        {/* quads */}
        <rect x="52" y="146" width="26" height="62" rx="10" fill={fill("quads")} />
        <rect x="82" y="146" width="26" height="62" rx="10" fill={fill("quads")} />
        {/* calves */}
        <rect x="54" y="212" width="22" height="50" rx="9" fill={fill("calves")} />
        <rect x="84" y="212" width="22" height="50" rx="9" fill={fill("calves")} />
      </svg>

      <div className="flex flex-col gap-2">
        {Object.entries(volume)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorForIntensity(val) }} />
              <span className="text-text-mid capitalize w-20">{key}</span>
              <span className="font-mono-tabular text-text-low">{val}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}
