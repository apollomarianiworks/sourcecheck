import { LOCAL_USER_PROFILE, type AuthProviderAdapter, type ProofbaseUserProfile } from "./types";

export const localAuthProvider: AuthProviderAdapter = {
  id: "local",
  getCurrentUser: async () => LOCAL_USER_PROFILE,
};

export function getAuthProvider(): AuthProviderAdapter {
  return localAuthProvider;
}

export async function getCurrentProofbaseUser(): Promise<ProofbaseUserProfile | null> {
  return getAuthProvider().getCurrentUser();
}

export const FUTURE_AUTH_PROVIDERS = [
  "Firebase Auth + Firestore",
  "Clerk + Cloudflare D1/KV",
  "Auth.js + lightweight storage",
];
