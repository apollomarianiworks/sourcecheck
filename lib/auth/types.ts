export interface SourceCheckUserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  provider: "local" | "firebase" | "clerk" | "authjs";
}

export interface AuthProviderAdapter {
  id: SourceCheckUserProfile["provider"];
  getCurrentUser: () => Promise<SourceCheckUserProfile | null>;
}

export const LOCAL_USER_PROFILE: SourceCheckUserProfile = {
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
