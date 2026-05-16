"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadHistory } from "@/lib/history";
import { historyToWorkspaceItems, loadRecentWorkspace, loadSavedSessions } from "@/lib/workspace/sessions";
import type { RecentWorkspaceItem, SavedSession } from "@/lib/workspace/sessions";

const WORKSPACE_LINKS = [
  { href: "/", label: "Proofbase Search" },
  { href: "/explorer", label: "Evidence explorer" },
  { href: "/collections", label: "Pinned collections" },
  { href: "/routines", label: "Active routines" },
  { href: "/debate", label: "Debate briefs" },
  { href: "/community", label: "ProofMedia" },
];

export default function WorkspaceSidebar() {
  const [saved, setSaved] = useState<SavedSession[]>([]);
  const [recent, setRecent] = useState<RecentWorkspaceItem[]>([]);

  useEffect(() => {
    setSaved(loadSavedSessions());
    const workspaceRecent = loadRecentWorkspace();
    setRecent(workspaceRecent.length > 0 ? workspaceRecent : historyToWorkspaceItems(loadHistory()));
  }, []);

  return (
    <aside className="hidden xl:block w-[248px] shrink-0 border-r border-line-soft bg-soft min-h-[calc(100vh-3rem)] sticky top-12">
      <div className="p-4 space-y-5">
        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-ink-dim">Workspace</div>
          <nav className="space-y-1">
            {WORKSPACE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded px-2 py-1.5 text-[13px] text-ink-muted hover:bg-page hover:text-ink hover:no-underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] uppercase tracking-wide text-ink-dim">Saved tabs</div>
            <span className="text-[11px] text-ink-dim">{saved.length}</span>
          </div>
          {saved.length > 0 ? (
            <ul className="space-y-1">
              {saved.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link href={`/?q=${encodeURIComponent(item.query)}&mode=${item.mode}`} className="block rounded px-2 py-1.5 text-[12px] text-ink-muted hover:bg-page hover:text-ink hover:no-underline">
                    <span className="block truncate">{item.title}</span>
                    <span className="text-[10px] uppercase tracking-wide text-ink-dim">{item.mode}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-ink-dim leading-relaxed">Save a search after running it to keep a local research tab.</p>
          )}
        </section>

        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-ink-dim">Recent research</div>
          {recent.length > 0 ? (
            <ul className="space-y-1">
              {recent.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link href={`/?q=${encodeURIComponent(item.query)}&mode=${item.mode}`} className="block rounded px-2 py-1.5 text-[12px] text-ink-muted hover:bg-page hover:text-ink hover:no-underline">
                    <span className="block truncate">{item.query}</span>
                    <span className="text-[10px] text-ink-dim">{item.evidenceCount} evidence items</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-ink-dim leading-relaxed">No local research history yet.</p>
          )}
        </section>
      </div>
    </aside>
  );
}
