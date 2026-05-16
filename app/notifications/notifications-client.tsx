"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NotificationStore } from "@/lib/proofmedia/notifications";
import type { NotificationKind, ProofmediaNotification } from "@/lib/proofmedia/types";

const TYPES: { kind: NotificationKind; label: string }[] = [
  { kind: "new-follower", label: "New follower" },
  { kind: "post-liked", label: "Post liked" },
  { kind: "post-saved", label: "Post saved" },
  { kind: "comment-reply", label: "Post reply" },
  { kind: "rebuttal-added", label: "Rebuttal received" },
  { kind: "evidence-added", label: "Evidence added" },
  { kind: "context-note-added", label: "Context note added" },
  { kind: "collection-followed", label: "Collection followed" },
  { kind: "debate-update", label: "Debate update" },
  { kind: "routine-result-ready", label: "Routine completed" },
  { kind: "collaborator-invite", label: "Collaborator invite" },
];

export default function NotificationsClient() {
  const [items, setItems] = useState<ProofmediaNotification[]>([]);

  useEffect(() => { setItems(NotificationStore.list()); }, []);

  function markAllRead() {
    NotificationStore.markAllRead();
    setItems(NotificationStore.list());
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Notification center</div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-[30px] md:text-[38px] font-bold text-ink">Evidence updates, not fake pings</h1>
          <button type="button" onClick={markAllRead} className="text-[12px] rounded border border-line px-3 py-1.5 hover:bg-section">
            Mark real notifications read
          </button>
        </div>
        <p className="text-[14px] text-ink-body max-w-3xl">
          This center is wired for real events only: replies, rebuttals, evidence additions, context notes, routine results, and collaborator invites. It does not show fake unread notifications.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="card p-4">
          {items.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <h2 className="text-[18px] font-bold text-ink">No notifications yet</h2>
              <p className="text-[13px] text-ink-muted max-w-prose mx-auto">
                When real people reply, add evidence, send collaborator invites, or when a routine completes, those events can appear here.
              </p>
              <Link href="/community" className="inline-block text-link hover:underline text-[13px]">Go to ProofMedia</Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="rounded border border-line-soft p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-[14px] text-ink">{item.title}</strong>
                    <span className="text-[11px] text-ink-dim">{item.createdAt.slice(0, 10)}</span>
                  </div>
                  <p className="text-[12.5px] text-ink-muted mt-1">{item.body}</p>
                  {item.targetUrl && <Link href={item.targetUrl} className="text-[12px] text-link hover:underline">Open</Link>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="card p-4 space-y-3">
          <h2 className="text-[16px] font-bold text-ink">Supported event types</h2>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((type) => (
              <span key={type.label} className="text-[11px] rounded bg-section px-2 py-1 text-ink-body">{type.label}</span>
            ))}
          </div>
          <p className="text-[12px] text-ink-muted">
            Backend fan-out, email delivery, and push notifications are future work. The current architecture stays Spark-plan friendly.
          </p>
        </aside>
      </section>
    </div>
  );
}
