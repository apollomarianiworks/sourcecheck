"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COMMANDS = [
  { label: "Search evidence", href: "/" },
  { label: "Open Spaces", href: "/spaces" },
  { label: "Start investigation", href: "/investigations" },
  { label: "View notifications", href: "/notifications" },
  { label: "Export packet", href: "/exports" },
  { label: "Open digests", href: "/digests" },
  { label: "Team workspace", href: "/teams" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex text-[12px] rounded border border-line px-2 py-1 text-ink-muted hover:bg-section"
      >
        Cmd/Ctrl K
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/20 p-4" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-20 max-w-lg card p-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-2">Quick switch</div>
            <div className="space-y-1">
              {COMMANDS.map((command) => (
                <Link
                  key={command.href}
                  href={command.href}
                  onClick={() => setOpen(false)}
                  className="block rounded px-3 py-2 text-[14px] text-ink-body hover:bg-section no-underline"
                >
                  {command.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
