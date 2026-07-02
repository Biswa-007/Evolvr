"use client";

import { cn } from "@/lib/utils";

export function RankBadge({
  color,
  size = 56,
  glow = true,
  children,
  className,
}: {
  color: string;
  size?: number;
  glow?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0", className)}
      style={{
        width: size,
        height: size,
        filter: glow ? `drop-shadow(0 0 10px ${color}80)` : undefined,
      }}
    >
      <svg viewBox="0 0 100 110" width={size} height={size} className="absolute inset-0">
        <polygon
          points="50,2 95,27 95,82 50,108 5,82 5,27"
          fill="var(--card)"
          stroke={color}
          strokeWidth="3"
        />
        <polygon
          points="50,12 87,32 87,78 50,98 13,78 13,32"
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center" style={{ color }}>
        {children}
      </div>
    </div>
  );
}
