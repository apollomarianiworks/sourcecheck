"use client";

/**
 * Local-only auth — backed by localStorage. Acts as a "demo mode" account so
 * users can post claims, save collections, and run debates entirely in this
 * browser. Nothing is sent anywhere.
 *
 * Public API is shaped to match what a Firebase / Auth.js / Clerk provider
 * would expose, so a future pass can swap providers without touching UI.
 */

import { slugify } from "@/lib/proofmedia/slug";

export interface LocalAccount {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  providerId: "local";
}

const KEY = "proofmedia.auth.local.v1";

type Listener = (acc: LocalAccount | null) => void;
const listeners = new Set<Listener>();

function safeLS(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function read(): LocalAccount | null {
  const ls = safeLS();
  if (!ls) return null;
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalAccount;
  } catch { return null; }
}

function write(acc: LocalAccount | null): void {
  const ls = safeLS();
  if (!ls) return;
  try {
    if (!acc) ls.removeItem(KEY);
    else ls.setItem(KEY, JSON.stringify(acc));
  } catch { /* ignore quota */ }
  for (const l of listeners) l(acc);
}

export function getLocalAccount(): LocalAccount | null {
  return read();
}

export function subscribeLocalAccount(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function signInLocal(displayName: string): LocalAccount {
  const name = (displayName || "").trim() || "You";
  const username = slugify(name, "you");
  const acc: LocalAccount = {
    uid: "local_" + Math.random().toString(36).slice(2, 10),
    username,
    displayName: name,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    providerId: "local",
  };
  write(acc);
  return acc;
}

export function signOutLocal(): void {
  write(null);
}

export function updateLocalProfile(patch: Partial<Pick<LocalAccount, "displayName" | "avatarUrl">>): LocalAccount | null {
  const current = read();
  if (!current) return null;
  const next: LocalAccount = {
    ...current,
    displayName: (patch.displayName ?? current.displayName).trim() || current.displayName,
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : current.avatarUrl,
  };
  write(next);
  return next;
}
