/**
 * Firebase auth stub.
 *
 * PASS 16 ships the architecture without pulling the firebase SDK as a hard
 * dependency. When the user is ready to enable Google sign-in / Firestore,
 * they:
 *   1. `npm i firebase`
 *   2. Set the NEXT_PUBLIC_FIREBASE_* env vars listed below
 *   3. Replace the `notConfigured()` helpers here with real Firebase calls
 *      that mirror the contract in `lib/auth/local.ts`.
 *
 * Until then, `isFirebaseConfigured()` returns false and the UI silently
 * keeps using the local provider.
 */

export const REQUIRED_FIREBASE_ENV = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export function isFirebaseConfigured(): boolean {
  if (typeof process === "undefined") return false;
  return REQUIRED_FIREBASE_ENV.every((k) => {
    const v = process.env[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

export function firebaseConfigGaps(): string[] {
  if (typeof process === "undefined") return REQUIRED_FIREBASE_ENV.slice() as string[];
  return REQUIRED_FIREBASE_ENV.filter((k) => {
    const v = process.env[k];
    return !v || v.trim().length === 0;
  });
}

/**
 * Placeholder until firebase SDK is installed. Returns a transparent error
 * rather than ever returning a fake user.
 */
export async function signInWithGoogleStub(): Promise<{ ok: false; reason: string }> {
  return {
    ok: false,
    reason: isFirebaseConfigured()
      ? "Firebase SDK not installed. Run `npm i firebase` and replace the stub in lib/auth/firebase.ts with real calls."
      : `Firebase env vars not set: missing ${firebaseConfigGaps().join(", ")}`,
  };
}
