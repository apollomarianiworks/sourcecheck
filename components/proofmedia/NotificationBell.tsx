"use client";

import type { ProofmediaNotification } from "@/lib/proofmedia/types";

interface Props {
  notifications?: ProofmediaNotification[];
}

export default function NotificationBell({ notifications = [] }: Props) {
  const unread = notifications.filter((n) => !n.readAt).length;
  return (
    <div className="card p-3.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">Notifications</div>
        <span className="text-[11px] rounded border border-line px-1.5 py-0.5 text-ink-muted">{unread}</span>
      </div>
      <p className="text-[12px] text-ink-muted">
        Notification types are ready for real backend events. No fake unread notifications are shown.
      </p>
    </div>
  );
}
