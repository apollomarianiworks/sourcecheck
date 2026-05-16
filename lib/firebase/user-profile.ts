"use client";

import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp, type Firestore,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "./client";
import { slugify } from "@/lib/proofmedia/slug";

/** Public-readable user profile document at `users/{uid}`. */
export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  email: string | null;          // optional — never displayed publicly
  emailVerified: boolean;
  createdAt: string;             // ISO
  updatedAt: string;             // ISO
  reputationScore: number;       // simple running sum; never used to gate access yet
  role: "user" | "moderator" | "admin";
  restrictions: string[];        // e.g. "no-post", "no-comment" — server enforces via rules
}

function usernameFromUser(u: User): string {
  const seed =
    u.displayName?.trim() ||
    u.email?.split("@")[0] ||
    "user";
  const base = slugify(seed, "user");
  // Add a stable short suffix from the uid so collisions across users
  // are unlikely without a separate usernames-index collection.
  const suffix = (u.uid.replace(/[^a-z0-9]/gi, "") || "x").slice(0, 4).toLowerCase();
  return `${base}-${suffix}`;
}

/**
 * Read the profile doc. Returns null if missing OR Firestore not configured.
 */
export async function readProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<UserProfile> & { createdAt?: unknown; updatedAt?: unknown };
    return {
      uid,
      username:        (data.username as string) ?? usernameFromUid(uid),
      displayName:     (data.displayName as string) ?? "Unknown",
      photoURL:        (data.photoURL as string | null) ?? null,
      bio:             (data.bio as string) ?? "",
      email:           (data.email as string | null) ?? null,
      emailVerified:   Boolean(data.emailVerified),
      createdAt:       stampToIso(data.createdAt) ?? new Date().toISOString(),
      updatedAt:       stampToIso(data.updatedAt) ?? new Date().toISOString(),
      reputationScore: typeof data.reputationScore === "number" ? data.reputationScore : 0,
      role:            (data.role as UserProfile["role"]) ?? "user",
      restrictions:    Array.isArray(data.restrictions) ? data.restrictions.filter((r): r is string => typeof r === "string") : [],
    };
  } catch {
    return null;
  }
}

/**
 * Ensure a user profile exists for the freshly-signed-in Firebase user.
 * Called from the auth state observer after sign-in.
 *
 * Creates the doc on first sign-in with sensible defaults. NEVER overwrites
 * existing profile fields the user customised.
 */
export async function ensureProfile(u: User): Promise<UserProfile | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  const existing = await readProfile(u.uid);
  if (existing) return existing;
  const profile: UserProfile = {
    uid:             u.uid,
    username:        usernameFromUser(u),
    displayName:     u.displayName?.trim() || u.email?.split("@")[0] || "Anonymous",
    photoURL:        u.photoURL ?? null,
    bio:             "",
    email:           u.email ?? null,
    emailVerified:   Boolean(u.emailVerified),
    createdAt:       new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
    reputationScore: 0,
    role:            "user",
    restrictions:    [],
  };
  try {
    await setDoc(doc(db, "users", u.uid), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch { /* security rules might block first-write race — UI will retry on next render */ }
  return profile;
}

/** Update editable profile fields. Role / restrictions / reputation are NOT writable from the client. */
export async function updateProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, "displayName" | "bio" | "photoURL" | "username">>
): Promise<UserProfile | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.displayName !== undefined) update.displayName = patch.displayName.trim().slice(0, 60);
  if (patch.bio         !== undefined) update.bio         = patch.bio.trim().slice(0, 400);
  if (patch.photoURL    !== undefined) update.photoURL    = patch.photoURL || null;
  if (patch.username    !== undefined) update.username    = slugify(patch.username, "user").slice(0, 40);
  await updateDoc(doc(db, "users", uid), update);
  return readProfile(uid);
}

function usernameFromUid(uid: string): string {
  return `user-${uid.slice(0, 6).toLowerCase()}`;
}

function stampToIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate: unknown }).toDate === "function") {
    try { return (v as { toDate: () => Date }).toDate().toISOString(); } catch { return null; }
  }
  return null;
}

// Re-export Firestore for callers that want it
export type { Firestore };
