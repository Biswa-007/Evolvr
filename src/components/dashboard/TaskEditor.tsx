"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useEvolvrStore } from "@/lib/store";
import { Difficulty, StatType, TaskType } from "@/lib/types";
import { STAT_COLORS, STAT_LABELS, XP_REWARDS } from "@/lib/xp-engine";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full bg-bg-elevated border border-border-soft rounded-lg px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:outline-none focus:border-primary/50 transition-colors";

const TYPE_OPTIONS: { value: TaskType; label: string; hint: string }[] = [
  { value: "habit", label: "Habit", hint: "Recurring daily, builds a streak" },
  { value: "quest", label: "Quest", hint: "One-off or occasional task" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "major", label: "Major" },
];

const STAT_OPTIONS: StatType[] = ["strength", "discipline", "endurance", "physique", "recovery"];

export function TaskEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createNewTask = useEvolvrStore((s) => s.createNewTask);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("habit");
  const [difficulty, setDifficulty] = useState<Difficulty>("small");
  const [statType, setStatType] = useState<StatType>("discipline");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setType("habit");
    setDifficulty("small");
    setStatType("discipline");
    setError(null);
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Give it a name first — e.g. \"Drink 5L water\".");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createNewTask({ title: title.trim(), type, difficulty, statType });
      handleClose();
    } catch {
      setSaving(false);
      setError("Couldn't save that — try again.");
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New task">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-text-mid mb-1 block">What do you want to track?</label>
          <input
            className={inputClass}
            placeholder='e.g. "Drink 5L water" or "Read 20 pages"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-text-mid mb-1.5 block">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cn(
                  "text-left rounded-lg border px-3 py-2.5 transition-colors",
                  type === opt.value ? "border-primary/50 bg-primary/10" : "border-border-soft hover:border-border"
                )}
              >
                <p className={cn("text-sm font-medium", type === opt.value ? "text-primary" : "text-text-hi")}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-text-low mt-0.5">{opt.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-text-mid mb-1.5 block">Difficulty</label>
          <div className="grid grid-cols-4 gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDifficulty(opt.value)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-center transition-colors",
                  difficulty === opt.value ? "border-primary/50 bg-primary/10" : "border-border-soft hover:border-border"
                )}
              >
                <p className={cn("text-xs font-medium", difficulty === opt.value ? "text-primary" : "text-text-hi")}>
                  {opt.label}
                </p>
                <p className="font-mono-tabular text-[10px] text-text-low mt-0.5">+{XP_REWARDS[opt.value]} XP</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-text-mid mb-1.5 block">Which stat does this build?</label>
          <div className="flex flex-wrap gap-2">
            {STAT_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatType(s)}
                className="px-3 py-1.5 rounded-full border text-xs font-medium transition-colors"
                style={
                  statType === s
                    ? { borderColor: `${STAT_COLORS[s]}66`, background: `${STAT_COLORS[s]}1a`, color: STAT_COLORS[s] }
                    : { borderColor: "var(--border-soft)", color: "var(--text-mid)" }
                }
              >
                {STAT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-mid hover:text-text-hi"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add task"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
