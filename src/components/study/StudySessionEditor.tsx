"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useEvolvrStore } from "@/lib/store";

const inputClass =
  "w-full bg-bg-elevated border border-border-soft rounded-lg px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:outline-none focus:border-primary/50 transition-colors";

export function StudySessionEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addStudySession = useEvolvrStore((s) => s.addStudySession);
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(30);
  const [topics, setTopics] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setSubject("");
    setDuration(30);
    setTopics("");
    setNotes("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!subject.trim()) {
      setError("Give the session a subject before saving.");
      return;
    }

    addStudySession({
      subject: subject.trim(),
      durationMinutes: duration,
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined,
    });

    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Log a study session">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-text-mid mb-1 block">Subject</label>
            <input
              className={inputClass}
              placeholder="e.g. Data Structures"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
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

        <div>
          <label className="text-xs text-text-mid mb-1 block">Topics covered (comma separated)</label>
          <input
            className={inputClass}
            placeholder="Binary trees, Heaps"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-text-mid mb-1 block">Notes (optional)</label>
          <textarea
            className={inputClass + " min-h-20 resize-none"}
            placeholder="Anything worth remembering..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
          >
            Save session
          </button>
        </div>
      </div>
    </Modal>
  );
}
