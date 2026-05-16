"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { localSavedChecks } from "@/lib/storage/saved-checks";

interface Props {
  result: CheckResult;
}

export default function SaveCheckButton({ result }: Props) {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        localSavedChecks.save(result);
        setSaved(true);
      }}
      className={`text-[12px] px-2.5 py-1 rounded border transition-colors ${
        saved
          ? "border-verdict-green text-verdict-green bg-verdict-greenSoft"
          : "border-line text-ink-body hover:border-brand hover:text-brand"
      }`}
    >
      {saved ? "Saved" : "Save check"}
    </button>
  );
}
