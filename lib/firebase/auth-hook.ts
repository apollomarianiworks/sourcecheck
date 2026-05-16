"use client";

import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile as fbUpdateProfile,
  sendPasswordResetEmail,
  type User, type AuthError,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./client";
import { ensureProfile, readProfile, type UserProfile } from "./user-profile";

export interface AuthState {
  status: "loading" | "signed-in" | "signed-out" | "not-configured";
  user: User | null;
  profile: UserProfile | null;
  error: string | null;
}

export function useAuth(): AuthState & {
  signUpEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutNow: () => Promise<void>;
  reload: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>(() => ({
    status: typeof window === "undefined"
      ? "loading"
      : isFirebaseConfigured() ? "loading" : "not-configured",
    user: null,
    profile: null,
    error: null,
  }));

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState({ status: "not-configured", user: null, profile: null, error: null });
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setState({ status: "not-configured", user: null, profile: null, error: null });
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ status: "signed-out", user: null, profile: null, error: null });
        return;
      }
      const profile = await ensureProfile(user);
      setState({ status: "signed-in", user, profile, error: null });
    });
    return () => unsub();
  }, []);

  const reload = useCallback(async () => {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser ?? null;
    if (!user) return;
    const profile = await readProfile(user.uid);
    setState((s) => ({ ...s, profile }));
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string, displayName: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not configured.");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const name = displayName.trim();
      if (name) await fbUpdateProfile(cred.user, { displayName: name });
      await ensureProfile(cred.user);
    } catch (e) {
      throw mapAuthError(e);
    }
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not configured.");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      throw mapAuthError(e);
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not configured.");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (e) {
      throw mapAuthError(e);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not configured.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      throw mapAuthError(e);
    }
  }, []);

  const signOutNow = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
  }, []);

  return { ...state, signUpEmail, signInEmail, signInGoogle, resetPassword, signOutNow, reload };
}

function mapAuthError(e: unknown): Error {
  const ae = e as AuthError;
  const code = ae?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":     return new Error("That email is already registered. Try signing in.");
    case "auth/invalid-email":             return new Error("That email looks invalid.");
    case "auth/weak-password":             return new Error("Password must be at least 6 characters.");
    case "auth/wrong-password":            return new Error("Incorrect password.");
    case "auth/user-not-found":            return new Error("No account with that email.");
    case "auth/popup-closed-by-user":      return new Error("Sign-in popup was closed before completing.");
    case "auth/cancelled-popup-request":   return new Error("Sign-in popup was cancelled.");
    case "auth/popup-blocked":             return new Error("Your browser blocked the sign-in popup.");
    case "auth/network-request-failed":    return new Error("Network error reaching Firebase. Check your connection.");
    case "auth/too-many-requests":         return new Error("Too many attempts. Wait a minute and try again.");
    case "auth/unauthorized-domain":       return new Error("This domain is not authorized for Firebase sign-in.");
    default: return new Error("Authentication failed. Check your details and try again.");
  }
}
