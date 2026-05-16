"use client";

import { useEffect, useState } from "react";
import { ActionStore } from "@/lib/proofmedia/engagement";
import { trackProofmediaEvent } from "@/lib/proofmedia/analytics";

interface Props {
  targetId: string;
}

const ACTIONS = [
  { kind: "like", label: "Like" },
  { kind: "helpful", label: "Helpful" },
  { kind: "save", label: "Save" },
  { kind: "report", label: "Report" },
] as const;

export default function SocialActionBar({ targetId }: Props) {
  const [active, setActive] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActive(new Set(ACTIONS.filter((a) => ActionStore.has(a.kind, "claim", targetId)).map((a) => a.kind)));
  }, [targetId]);

  function press(kind: (typeof ACTIONS)[number]["kind"]) {
    if (active.has(kind)) return;
    ActionStore.record(kind, "claim", targetId);
    setActive(new Set(ActionStore.list().filter((a) => a.targetType === "claim" && a.targetId === targetId).map((a) => a.kind)));
    if (kind === "save") trackProofmediaEvent("save_clicked", { targetType: "claim" });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTIONS.map((action) => (
        <button
          key={action.kind}
          type="button"
          onClick={() => press(action.kind)}
          disabled={active.has(action.kind)}
          className={`text-[11px] px-2 py-0.5 rounded border ${
            active.has(action.kind)
              ? "border-brand bg-brand-soft text-brand"
              : "border-line text-ink-body hover:bg-section"
          }`}
        >
          {active.has(action.kind) ? `${action.label}ed` : action.label}
        </button>
      ))}
    </div>
  );
}
