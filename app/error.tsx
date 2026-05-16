"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-12">
      <div className="max-w-result mx-auto card p-6 space-y-3">
        <h1 className="text-[24px] font-bold text-verdict-red">Something went wrong</h1>
        <p className="text-[14px] text-ink-body leading-relaxed">
          An unexpected error occurred while rendering this page. Nothing was lost — your
          local history is intact.
        </p>
        {error.digest && (
          <div className="text-[12px] text-ink-dim font-mono-tight">Error ID: {error.digest}</div>
        )}
        <div className="flex gap-2 flex-wrap pt-1">
          <button
            type="button"
            onClick={reset}
            className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded text-[14px] font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-line text-ink-body hover:bg-section hover:no-underline px-4 py-2 rounded text-[14px]"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
