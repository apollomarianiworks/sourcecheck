"use client";

/**
 * Firestore CRUD for ProofMedia community content.
 *
 * Collections:
 *   - users     (uid)            — managed in lib/firebase/user-profile.ts
 *   - claims    (claimId)        — top-level claim threads
 *   - comments  (commentId)      — comments / rebuttals / context notes
 *   - saves     (autoId)         — userId + targetType + targetId
 *   - votes     (compound autoId)— userId + targetType + targetId + voteType
 *   - reports   (autoId)         — reporter + target + reason
 *
 * All writes require a signed-in user. Security rules in firestore.rules
 * mirror the validation here so writes can't bypass via the SDK.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp, Timestamp,
  type DocumentSnapshot, type QueryDocumentSnapshot, type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase/client";
import { readProfile } from "@/lib/firebase/user-profile";
import { guardClientAction } from "@/lib/security/guard";
import { sanitizeTag, sanitizeUserText } from "@/lib/security/sanitize";
import { validateCommentInput, validatePostInput } from "@/lib/security/validators";
import type {
  ClaimCategoryId, CommentType, ClaimVisibility,
} from "./validation";
import { validateClaim, validateComment, validateReport } from "./validation";
import { recordAction } from "./restrictions";
import { slugify } from "@/lib/proofmedia/slug";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface ClaimDoc {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  title: string;
  body: string;
  category: ClaimCategoryId;
  tags: string[];
  evidenceUrls: string[];
  sourceMeshSummary: SourceMeshSnapshot | null;
  visibility: ClaimVisibility;
  createdAt: string;
  updatedAt: string;
  score: number;
  commentCount: number;
  evidenceCount: number;
  status: "active" | "removed" | "flagged";
}

export interface SourceMeshSnapshot {
  verdict: "supports" | "disputes" | "mixed" | "related-only" | "none";
  sourceQualityScore: number | null;
  confidenceLevel: "high" | "medium" | "low" | "insufficient";
  coverageLevel: "low" | "medium" | "high";
  category: string;
  adaptersOk: number;
  evidenceCount: number;
  checkedAt: string;
}

export interface CommentDoc {
  id: string;
  claimId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  body: string;
  type: CommentType;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
  score: number;
  status: "active" | "removed";
}

export interface SaveDoc {
  id: string;
  userId: string;
  targetType: "claim" | "comment";
  targetId: string;
  createdAt: string;
}

export interface VoteDoc {
  id: string;        // userId_targetType_targetId
  userId: string;
  targetType: "claim" | "comment";
  targetId: string;
  voteType: "up" | "down";
  createdAt: string;
}

export interface ReportDoc {
  id: string;
  reporterId: string;
  targetType: "claim" | "comment" | "user";
  targetId: string;
  reason: string;
  details: string;
  createdAt: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
}

interface ComposeClaimInput {
  title: string;
  body: string;
  category: ClaimCategoryId;
  tags: string[];
  evidenceUrls: string[];
  visibility: ClaimVisibility;
}

interface ComposeCommentInput {
  claimId: string;
  body: string;
  type: CommentType;
  evidenceUrls: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

class ClientError extends Error {
  constructor(public reason: string, public field?: string) {
    super(reason);
  }
}

function db() {
  const d = getFirebaseDb();
  if (!d) throw new ClientError("Firebase is not configured.");
  return d;
}

function requireUser() {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new ClientError("You must be signed in.");
  return user;
}

async function restrictionsFor(uid: string): Promise<string[]> {
  const profile = await readProfile(uid);
  return profile?.restrictions ?? [];
}

function toIso(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try { return (v as { toDate: () => Date }).toDate().toISOString(); } catch { /* */ }
  }
  return new Date().toISOString();
}

function claimSlug(title: string, uid: string): string {
  const base = slugify(title, "claim");
  const suffix = Date.now().toString(36).slice(-4) + uid.slice(0, 3).toLowerCase();
  return `${base}-${suffix}`;
}

// ────────────────────────────────────────────────────────────────────────────
// CLAIMS
// ────────────────────────────────────────────────────────────────────────────

interface CreateClaimOpts {
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
}

export async function createClaim(input: ComposeClaimInput, opts: CreateClaimOpts): Promise<string> {
  const user = requireUser();
  const restrictions = await restrictionsFor(user.uid);
  guardClientAction({
    user,
    action: "post",
    requireVerifiedEmail: input.visibility === "public",
    restrictions,
  });
  const v = validateClaim(input);
  if (!v.ok) throw new ClientError(v.message ?? "Invalid claim.", v.field);
  const guarded = validatePostInput(input);
  if (!guarded.ok || !guarded.value) throw new ClientError(guarded.message ?? "Invalid claim.", guarded.field);

  const id = claimSlug(guarded.value.title, user.uid);
  const docRef = doc(db(), "claims", id);
  const payload = {
    authorId:          user.uid,
    authorUsername:    sanitizeUserText(opts.authorUsername, 24),
    authorDisplayName: sanitizeUserText(opts.authorDisplayName, 50),
    authorPhotoURL:    opts.authorPhotoURL,
    title:             guarded.value.title,
    body:              guarded.value.body,
    category:          input.category,
    tags:              guarded.value.tags.map(sanitizeTag),
    evidenceUrls:      guarded.value.evidenceUrls,
    sourceMeshSummary: null,
    visibility:        input.visibility,
    createdAt:         serverTimestamp(),
    updatedAt:         serverTimestamp(),
    score:             0,
    commentCount:      0,
    evidenceCount:     input.evidenceUrls.length,
    status:            guarded.value.needsReview ? "flagged" : "active",
    moderationStatus:  guarded.value.needsReview ? "needs-review" : "clear",
  };
  await setDoc(docRef, payload);
  recordAction("create-claim");
  return id;
}

export async function attachSourceMeshSummary(claimId: string, summary: SourceMeshSnapshot): Promise<void> {
  requireUser();
  await updateDoc(doc(db(), "claims", claimId), {
    sourceMeshSummary: summary,
    updatedAt: serverTimestamp(),
  });
}

export async function readClaim(claimId: string): Promise<ClaimDoc | null> {
  const snap = await getDoc(doc(db(), "claims", claimId));
  if (!snap.exists()) return null;
  return snapToClaim(snap);
}

export interface FeedOpts {
  pageSize?: number;
  category?: ClaimCategoryId | null;
  tag?: string | null;
  sort?: "newest" | "top" | "active";
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}

export interface FeedPage {
  items: ClaimDoc[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
}

/**
 * Public feed query — public claims, active status, newest first.
 * Cursored for "load more" pagination.
 */
export async function readFeed(opts: FeedOpts = {}): Promise<FeedPage> {
  const pageSize = Math.min(opts.pageSize ?? 20, 50);

  const orderField = opts.sort === "top" ? "score" : opts.sort === "active" ? "updatedAt" : "createdAt";

  // Build the constraint list piecewise so each constraint keeps its precise
  // type (`query()` is overloaded — a single mixed list breaks inference).
  const ref = collection(db(), "claims");
  let q = opts.category
    ? (opts.tag
        ? query(ref, where("visibility", "==", "public"), where("status", "==", "active"), where("category", "==", opts.category), where("tags", "array-contains", opts.tag.toLowerCase()), orderBy(orderField, "desc"), limit(pageSize))
        : query(ref, where("visibility", "==", "public"), where("status", "==", "active"), where("category", "==", opts.category), orderBy(orderField, "desc"), limit(pageSize)))
    : (opts.tag
        ? query(ref, where("visibility", "==", "public"), where("status", "==", "active"), where("tags", "array-contains", opts.tag.toLowerCase()), orderBy(orderField, "desc"), limit(pageSize))
        : query(ref, where("visibility", "==", "public"), where("status", "==", "active"), orderBy(orderField, "desc"), limit(pageSize)));
  if (opts.cursor) q = query(q, startAfter(opts.cursor));
  const snap = await getDocs(q);
  const items: ClaimDoc[] = [];
  let lastSnap: QueryDocumentSnapshot<DocumentData> | null = null;
  snap.forEach((s) => { items.push(snapToClaim(s)); lastSnap = s; });

  return {
    items,
    nextCursor: items.length === pageSize ? lastSnap : null,
  };
}

/** Read a user's authored claims. */
export async function readClaimsByAuthor(authorId: string, pageSize = 30): Promise<ClaimDoc[]> {
  const q = query(
    collection(db(), "claims"),
    where("authorId", "==", authorId),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  );
  const snap = await getDocs(q);
  const items: ClaimDoc[] = [];
  snap.forEach((s) => items.push(snapToClaim(s)));
  return items;
}

function snapToClaim(snap: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): ClaimDoc {
  const d = snap.data() ?? {};
  return {
    id:                snap.id,
    authorId:          (d.authorId as string) ?? "",
    authorUsername:    (d.authorUsername as string) ?? "user",
    authorDisplayName: (d.authorDisplayName as string) ?? "User",
    authorPhotoURL:    (d.authorPhotoURL as string | null) ?? null,
    title:             (d.title as string) ?? "",
    body:              (d.body as string) ?? "",
    category:          (d.category as ClaimCategoryId) ?? "general",
    tags:              Array.isArray(d.tags) ? d.tags.filter((t) => typeof t === "string") : [],
    evidenceUrls:      Array.isArray(d.evidenceUrls) ? d.evidenceUrls.filter((u) => typeof u === "string") : [],
    sourceMeshSummary: (d.sourceMeshSummary as SourceMeshSnapshot | null) ?? null,
    visibility:        (d.visibility as ClaimVisibility) ?? "public",
    createdAt:         toIso(d.createdAt),
    updatedAt:         toIso(d.updatedAt),
    score:             typeof d.score === "number" ? d.score : 0,
    commentCount:      typeof d.commentCount === "number" ? d.commentCount : 0,
    evidenceCount:     typeof d.evidenceCount === "number" ? d.evidenceCount : 0,
    status:            (d.status as ClaimDoc["status"]) ?? "active",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// COMMENTS
// ────────────────────────────────────────────────────────────────────────────

interface CreateCommentOpts {
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
}

export async function createComment(input: ComposeCommentInput, opts: CreateCommentOpts): Promise<string> {
  const user = requireUser();
  const restrictions = await restrictionsFor(user.uid);
  guardClientAction({ user, action: "comment", requireVerifiedEmail: true, restrictions });
  const v = validateComment(input);
  if (!v.ok) throw new ClientError(v.message ?? "Invalid comment.", v.field);
  const guarded = validateCommentInput(input);
  if (!guarded.ok || !guarded.value) throw new ClientError(guarded.message ?? "Invalid comment.", guarded.field);

  const ref = await addDoc(collection(db(), "comments"), {
    claimId:           input.claimId,
    authorId:          user.uid,
    authorUsername:    sanitizeUserText(opts.authorUsername, 24),
    authorDisplayName: sanitizeUserText(opts.authorDisplayName, 50),
    authorPhotoURL:    opts.authorPhotoURL,
    body:              guarded.value.body,
    type:              input.type,
    evidenceUrls:      guarded.value.evidenceUrls,
    createdAt:         serverTimestamp(),
    updatedAt:         serverTimestamp(),
    score:             0,
    status:            "active",
  });
  recordAction("create-comment");
  return ref.id;
}

export async function readCommentsForClaim(claimId: string): Promise<CommentDoc[]> {
  const q = query(
    collection(db(), "comments"),
    where("claimId", "==", claimId),
    where("status", "==", "active"),
    orderBy("createdAt", "asc"),
    limit(200),
  );
  const snap = await getDocs(q);
  const out: CommentDoc[] = [];
  snap.forEach((s) => {
    const d = s.data();
    out.push({
      id:                s.id,
      claimId:           d.claimId,
      authorId:          d.authorId,
      authorUsername:    d.authorUsername,
      authorDisplayName: d.authorDisplayName,
      authorPhotoURL:    d.authorPhotoURL ?? null,
      body:              d.body,
      type:              d.type,
      evidenceUrls:      Array.isArray(d.evidenceUrls) ? d.evidenceUrls : [],
      createdAt:         toIso(d.createdAt),
      updatedAt:         toIso(d.updatedAt),
      score:             typeof d.score === "number" ? d.score : 0,
      status:            d.status ?? "active",
    });
  });
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// SAVES
// ────────────────────────────────────────────────────────────────────────────

function saveId(uid: string, targetType: SaveDoc["targetType"], targetId: string): string {
  return `${uid}_${targetType}_${targetId}`;
}

export async function isSaved(targetType: SaveDoc["targetType"], targetId: string): Promise<boolean> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return false;
  const snap = await getDoc(doc(db(), "saves", saveId(user.uid, targetType, targetId)));
  return snap.exists();
}

export async function toggleSave(targetType: SaveDoc["targetType"], targetId: string): Promise<boolean> {
  const user = requireUser();
  const restrictions = await restrictionsFor(user.uid);
  guardClientAction({ user, action: "save", restrictions });
  const id = saveId(user.uid, targetType, targetId);
  const ref = doc(db(), "saves", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, {
    userId: user.uid,
    targetType,
    targetId,
    createdAt: serverTimestamp(),
  });
  recordAction("save");
  return true;
}

export async function readUserSaves(uid: string): Promise<SaveDoc[]> {
  const q = query(collection(db(), "saves"), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  const out: SaveDoc[] = [];
  snap.forEach((s) => {
    const d = s.data();
    out.push({
      id: s.id,
      userId: d.userId,
      targetType: d.targetType,
      targetId: d.targetId,
      createdAt: toIso(d.createdAt),
    });
  });
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// VOTES
// ────────────────────────────────────────────────────────────────────────────

function voteId(uid: string, targetType: VoteDoc["targetType"], targetId: string): string {
  return `${uid}_${targetType}_${targetId}`;
}

export async function readMyVote(targetType: VoteDoc["targetType"], targetId: string): Promise<"up" | "down" | null> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db(), "votes", voteId(user.uid, targetType, targetId)));
  if (!snap.exists()) return null;
  return (snap.data().voteType as "up" | "down") ?? null;
}

/**
 * Cast or clear a vote.
 *
 * If the user clicks the same vote they already cast → vote is cleared.
 * If they switch sides → previous vote replaced.
 *
 * We do NOT increment the parent claim's `score` field client-side — that
 * would require special security rules and isn't necessary for an MVP.
 * The feed sort by "top" still works once score is updated by a future
 * Cloud Function aggregator. For now, score remains at create-time default.
 */
export async function castVote(
  targetType: VoteDoc["targetType"],
  targetId: string,
  voteType: "up" | "down",
): Promise<"up" | "down" | null> {
  const user = requireUser();
  const restrictions = await restrictionsFor(user.uid);
  guardClientAction({ user, action: "like", restrictions });
  const id = voteId(user.uid, targetType, targetId);
  const ref = doc(db(), "votes", id);
  const snap = await getDoc(ref);
  const current = snap.exists() ? (snap.data().voteType as "up" | "down") : null;
  if (current === voteType) {
    await deleteDoc(ref);
    recordAction("vote");
    return null;
  }
  await setDoc(ref, {
    userId: user.uid,
    targetType,
    targetId,
    voteType,
    createdAt: serverTimestamp(),
  });
  recordAction("vote");
  return voteType;
}

// ────────────────────────────────────────────────────────────────────────────
// REPORTS
// ────────────────────────────────────────────────────────────────────────────

export async function createReport(input: {
  targetType: ReportDoc["targetType"];
  targetId: string;
  reason: string;
  details: string;
}): Promise<string> {
  const user = requireUser();
  const restrictions = await restrictionsFor(user.uid);
  guardClientAction({ user, action: "report", restrictions });
  const v = validateReport(input.reason, input.details);
  if (!v.ok) throw new ClientError(v.message ?? "Invalid report.", v.field);
  if (input.targetType === "user") {
    const target = await getDoc(doc(db(), "users", input.targetId));
    if (!target.exists()) throw new ClientError("That user could not be reported.");
  }
  const ref = await addDoc(collection(db(), "reports"), {
    reporterId: user.uid,
    targetType: input.targetType,
    targetId:   input.targetId,
    reason:     sanitizeUserText(input.reason, 80),
    details:    sanitizeUserText(input.details, 1000),
    createdAt:  serverTimestamp(),
    status:     "open",
  });
  recordAction("report");
  return ref.id;
}

export { ClientError };
