"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { resultToMarkdown } from "@/lib/export";

interface Props { result: CheckResult; }

export default function ExportButton({ result }: Props) {
  const [copied, setCopied] = useState<"idle" | "ok" | "err">("idle");

  async function copy() {
    const text = resultToMarkdown(result);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied("ok");
    } catch { setCopied("err"); }
    finally { setTimeout(() => setCopied("idle"), 1500); }
  }

  function download() {
    const text = resultToMarkdown(result);
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = result.checkedAt.replace(/[:.]/g, "-");
    a.href = url;
    a.download = `sourcecheck-${result.mode}-${ts}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const label = copied === "ok" ? "✓ Copied" : copied === "err" ? "Copy failed" : "Copy report";

  return (
    <div className="flex gap-1.5 items-center">
      <button
        type="button"
        onClick={copy}
        className="text-[12px] px-2.5 py-1 border border-line rounded text-ink-body hover:bg-section transition-colors"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={download}
        className="text-[12px] px-2.5 py-1 border border-line rounded text-ink-body hover:bg-section transition-colors"
      >
        Download .md
      </button>
    </div>
  );
}
