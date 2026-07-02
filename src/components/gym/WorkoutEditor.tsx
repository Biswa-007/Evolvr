"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, History } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useEvolvrStore } from "@/lib/store";
import { ExerciseSet } from "@/lib/types";
import { fetchKnownExerciseNames, fetchLastExercisePerformance } from "@/lib/supabase/queries";

interface DraftExercise {
  key: string;
  name: string;
  sets: (ExerciseSet & { key: string })[];
}

let uid = 0;
const nextId = () => `id-${Date.now()}-${uid++}`;

function emptySet(): ExerciseSet & { key: string } {
  return { key: nextId(), weightType: "kg", weight: 0, reps: 8 };
}

function emptyExercise(): DraftExercise {
  return { key: nextId(), name: "", sets: [emptySet()] };
}

function formatSet(set: ExerciseSet) {
  return set.weightType === "bodyweight" ? `Bodyweight×${set.reps}` : `${set.weight}kg×${set.reps}`;
}

const inputClass =
  "w-full bg-bg-elevated border border-border-soft rounded-lg px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:outline-none focus:border-primary/50 transition-colors";

export function WorkoutEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addWorkout = useEvolvrStore((s) => s.addWorkout);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(45);
  const [exercises, setExercises] = useState<DraftExercise[]>([emptyExercise()]);
  const [error, setError] = useState<string | null>(null);
  const [knownExercises, setKnownExercises] = useState<string[]>([]);
  const [lastPerformance, setLastPerformance] = useState<Record<string, { date: string; sets: ExerciseSet[] } | null>>({});

  useEffect(() => {
    if (!open) return;
    fetchKnownExerciseNames()
      .then(setKnownExercises)
      .catch(() => setKnownExercises([]));
  }, [open]);

  function reset() {
    setName("");
    setDuration(45);
    setExercises([emptyExercise()]);
    setError(null);
    setLastPerformance({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  function lookupLastPerformance(exerciseName: string) {
    const trimmed = exerciseName.trim();
    if (!trimmed || lastPerformance[trimmed.toLowerCase()] !== undefined) return;
    fetchLastExercisePerformance(trimmed)
      .then((result) => setLastPerformance((prev) => ({ ...prev, [trimmed.toLowerCase()]: result })))
      .catch(() => setLastPerformance((prev) => ({ ...prev, [trimmed.toLowerCase()]: null })));
  }

  function updateExercise(key: string, patch: Partial<DraftExercise>) {
    setExercises((prev) => prev.map((ex) => (ex.key === key ? { ...ex, ...patch } : ex)));
  }

  function updateSet(exKey: string, setKey: string, patch: Partial<ExerciseSet>) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.key === exKey ? { ...ex, sets: ex.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) } : ex
      )
    );
  }

  function addSet(exKey: string) {
    setExercises((prev) => prev.map((ex) => (ex.key === exKey ? { ...ex, sets: [...ex.sets, emptySet()] } : ex)));
  }

  function removeSet(exKey: string, setKey: string) {
    setExercises((prev) =>
      prev.map((ex) => (ex.key === exKey ? { ...ex, sets: ex.sets.filter((s) => s.key !== setKey) } : ex))
    );
  }

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
  }

  function removeExercise(key: string) {
    setExercises((prev) => prev.filter((ex) => ex.key !== key));
  }

  function handleSubmit() {
    const trimmedName = name.trim() || "Workout";
    const validExercises = exercises
      .filter((ex) => ex.name.trim().length > 0 && ex.sets.length > 0)
      .map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets.map((s) => ({ weightType: s.weightType, weight: s.weightType === "kg" ? s.weight : 0, reps: s.reps })),
      }));

    if (validExercises.length === 0) {
      setError("Add at least one exercise with a name before saving.");
      return;
    }

    addWorkout({
      name: trimmedName,
      durationMinutes: duration,
      exercises: validExercises,
    });

    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Log a workout">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-text-mid mb-1 block">Workout name</label>
            <input
              className={inputClass}
              placeholder="Push Day"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-text-mid mb-1 block">Duration (min)</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {exercises.map((ex) => {
            const last = lastPerformance[ex.name.trim().toLowerCase()];
            return (
              <div key={ex.key} className="border border-border-soft rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    className={inputClass}
                    placeholder="Exercise name — e.g. Bench Press"
                    value={ex.name}
                    list="known-exercises"
                    onChange={(e) => updateExercise(ex.key, { name: e.target.value })}
                    onBlur={(e) => lookupLastPerformance(e.target.value)}
                  />
                  <button
                    onClick={() => removeExercise(ex.key)}
                    className="shrink-0 text-text-low hover:text-danger p-2"
                    aria-label="Remove exercise"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {last && (
                  <p className="flex items-center gap-1.5 text-[11px] text-text-low mb-2.5">
                    <History size={11} className="shrink-0" />
                    Last time ({new Date(last.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}):{" "}
                    <span className="text-text-mid font-mono-tabular">{last.sets.map(formatSet).join(", ")}</span>
                  </p>
                )}

                <div className="flex flex-col gap-2 mt-2">
                  {ex.sets.map((set, i) => (
                    <div key={set.key} className="grid grid-cols-[18px_auto_1fr_1fr_28px] items-center gap-1.5">
                      <span className="font-mono-tabular text-xs text-text-low">{i + 1}</span>

                      <div className="flex rounded-lg border border-border-soft overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => updateSet(ex.key, set.key, { weightType: "kg" })}
                          className={
                            "px-2 py-2 text-xs font-medium transition-colors " +
                            (set.weightType === "kg" ? "bg-primary/15 text-primary" : "bg-bg-elevated text-text-low hover:text-text-mid")
                          }
                        >
                          Kg
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSet(ex.key, set.key, { weightType: "bodyweight" })}
                          className={
                            "px-2 py-2 text-xs font-medium border-l border-border-soft transition-colors " +
                            (set.weightType === "bodyweight" ? "bg-primary/15 text-primary" : "bg-bg-elevated text-text-low hover:text-text-mid")
                          }
                        >
                          BW
                        </button>
                      </div>

                      {set.weightType === "kg" ? (
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          className={inputClass}
                          placeholder="kg"
                          value={set.weight || ""}
                          onChange={(e) => updateSet(ex.key, set.key, { weight: Number(e.target.value) || 0 })}
                        />
                      ) : (
                        <div className="text-xs text-text-low flex items-center justify-center">—</div>
                      )}

                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        placeholder="reps"
                        value={set.reps || ""}
                        onChange={(e) => updateSet(ex.key, set.key, { reps: Number(e.target.value) || 0 })}
                      />

                      <button
                        onClick={() => removeSet(ex.key, set.key)}
                        className="text-text-low hover:text-danger p-1 justify-self-end"
                        aria-label="Remove set"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

              <button
                onClick={() => addSet(ex.key)}
                className="mt-2.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80"
              >
                <Plus size={13} /> Add set
              </button>
              </div>
            );
          })}
        </div>

        <datalist id="known-exercises">
          {knownExercises.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <button
          onClick={addExercise}
          className="flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg border border-dashed border-border-soft text-text-mid hover:text-primary hover:border-primary/40 transition-colors"
        >
          <Plus size={15} /> Add exercise
        </button>

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
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
          >
            Save workout
          </button>
        </div>
      </div>
    </Modal>
  );
}
