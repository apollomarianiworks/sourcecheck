export interface ProofbaseUserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  provider: "local" | "firebase" | "clerk" | "authjs";
}

export interface AuthProviderAdapter {
  id: ProofbaseUserProfile["provider"];
  getCurrentUser: () => Promise<ProofbaseUserProfile | null>;
}

export const LOCAL_USER_PROFILE: ProofbaseUserProfile = {
  id: "local",
  displayName: "Local user",
  email: null,
  photoUrl: null,
  provider: "local",
};

export const ACCOUNT_SYSTEM_TODO = [
  "Firebase Auth + Firestore free tier adapter",
  "Clerk free auth + Cloudflare D1/KV adapter",
  "Auth.js GitHub/Google login + D1/KV adapter",
];
