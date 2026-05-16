"use client";

/**
 * Firebase client init — singleton, lazy, build-safe.
 *
 * If any required NEXT_PUBLIC_FIREBASE_* env var is missing, the helpers all
 * return `null` and `isFirebaseConfigured()` returns false. The UI is expected
 * to render a clean setup message in that case — we NEVER throw on import.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const REQUIRED_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export function isFirebaseConfigured(): boolean {
  return !!(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function firebaseMissingEnv(): string[] {
  const missing: string[] = [];
  if (!config.apiKey)     missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!config.authDomain) missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!config.projectId)  missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!config.appId)      missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  return missing;
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _persistenceRequested = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (_app) return _app;
  const existing = getApps()[0];
  if (existing) { _app = existing; return _app; }
  _app = initializeApp({
    apiKey:            config.apiKey!,
    authDomain:        config.authDomain!,
    projectId:         config.projectId!,
    storageBucket:     config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId:             config.appId!,
  });
  return _app;
}

export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) return null;
  _auth = getAuth(app);
  // Browser session persistence — fire-and-forget; failures here are non-fatal.
  if (!_persistenceRequested) {
    _persistenceRequested = true;
    setPersistence(_auth, browserLocalPersistence).catch(() => { /* ignore */ });
  }
  return _auth;
}

export function getFirebaseDb(): Firestore | null {
  if (_db) return _db;
  const app = getFirebaseApp();
  if (!app) return null;
  _db = getFirestore(app);
  return _db;
}

export function firebaseProjectId(): string | null {
  return config.projectId ?? null;
}
