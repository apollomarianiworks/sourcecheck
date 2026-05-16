"use client";

import type { NotificationKind, ProofmediaNotification } from "./types";

const KEY = "proofmedia.notifications.v1";

function safeLS(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function read(): ProofmediaNotification[] {
  const ls = safeLS();
  if (!ls) return [];
  try {
    const raw = ls.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as ProofmediaNotification[] : [];
  } catch {
    return [];
  }
}

function write(items: ProofmediaNotification[]) {
  const ls = safeLS();
  if (!ls) return;
  try { ls.setItem(KEY, JSON.stringify(items.slice(0, 200))); } catch { /* ignore quota */ }
}

export const NotificationStore = {
  list: read,
  add(input: Omit<ProofmediaNotification, "id" | "createdAt" | "readAt" | "isRealEvent"> & { kind: NotificationKind }) {
    const item: ProofmediaNotification = {
      ...input,
      id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      readAt: null,
      isRealEvent: true,
    };
    write([item, ...read()]);
    return item;
  },
  markRead(id: string) {
    write(read().map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
  },
  markAllRead() {
    const now = new Date().toISOString();
    write(read().map((item) => item.readAt ? item : { ...item, readAt: now }));
  },
  clear() {
    write([]);
  },
};
