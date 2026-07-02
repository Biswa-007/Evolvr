"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { useEvolvrStore } from "@/lib/store";
import { levelFromXp, STAT_LABELS } from "@/lib/xp-engine";
import { StatType } from "@/lib/types";
import {
  fetchHabitConsistencyByWeekday,
  fetchWorkoutFrequencyWeekly,
  fetchXpGrowthWeekly,
  WeeklyPoint,
} from "@/lib/supabase/queries";

const STAT_ORDER: StatType[] = ["strength", "discipline", "endurance", "physique", "recovery"];

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--text-hi)",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h2 className="font-display font-bold text-sm text-text-hi mb-4">{title}</h2>
      {children}
    </div>
  );
}

function formatWeekLabel(weekStart: string) {
  const d = new Date(weekStart + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartSkeleton() {
  return <div className="h-[200px] rounded-lg bg-bg-elevated animate-pulse" />;
}

export default function AnalyticsPage() {
  const stats = useEvolvrStore((s) => s.stats);
  const radarData = STAT_ORDER.map((key) => ({
    stat: STAT_LABELS[key],
    level: levelFromXp(stats[key].xp).level,
  }));

  const [xpGrowth, setXpGrowth] = useState<WeeklyPoint[] | null>(null);
  const [workoutFrequency, setWorkoutFrequency] = useState<WeeklyPoint[] | null>(null);
  const [habitConsistency, setHabitConsistency] = useState<{ day: string; pct: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchXpGrowthWeekly(8), fetchWorkoutFrequencyWeekly(6), fetchHabitConsistencyByWeekday(28)])
      .then(([xp, workouts, habits]) => {
        if (cancelled) return;
        setXpGrowth(xp);
        setWorkoutFrequency(workouts);
        setHabitConsistency(habits);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const xpGrowthData = xpGrowth?.map((p) => ({ week: formatWeekLabel(p.weekStart), xp: p.value })) ?? [];
  const workoutFrequencyData = workoutFrequency?.map((p) => ({ week: formatWeekLabel(p.weekStart), sessions: p.value })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display font-bold text-2xl text-text-hi">Analytics</h1>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid md:grid-cols-2 gap-5">
        <ChartCard title="XP growth (last 8 weeks)">
          {xpGrowth === null ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={xpGrowthData}>
                <defs>
                  <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="var(--text-low)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="xp" stroke="var(--primary)" strokeWidth={2} fill="url(#xpFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Stat balance">
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="stat" stroke="var(--text-low)" fontSize={11} />
              <Radar dataKey="level" stroke="var(--xp-gold)" fill="var(--xp-gold)" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Habit consistency (last 28 days)">
          {habitConsistency === null ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={habitConsistency}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-low)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Completion"]} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]} fill="var(--success)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Workout frequency (last 6 weeks)">
          {workoutFrequency === null ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workoutFrequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--text-low)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sessions" radius={[4, 4, 0, 0]} fill="var(--danger)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
