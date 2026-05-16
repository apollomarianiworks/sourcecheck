# Proofbase Security Checklist

Manual tests for PASS 24 hardening. The expected result is "blocked with a clean user-facing message" unless noted otherwise.

## Auth and Ownership

- Logged-out user tries to post a claim.
- Logged-out user tries to comment, save, vote, follow, or report.
- Unverified email user tries to publish a public claim.
- Unverified email user browses public content.
- User A tries to edit User B's profile document.
- User A tries to update User B's claim or comment.

## Protected Fields

- Client write attempts to set `role: "admin"` on a user profile.
- Client write attempts to change `restrictions`, `reputationScore`, `followerCount`, `followingCount`, `postCount`, or `likeCount`.
- Client write attempts to change claim `authorId`, `status`, `moderationStatus`, `score`, `commentCount`, or `createdAt`.
- Client write attempts to create a save, like, vote, or follow for another `userId`.

## XSS and Unsafe Input

- Post title contains `<script>alert(1)</script>`.
- Comment contains HTML tags or event attributes such as `<img onerror=alert(1)>`.
- Profile bio contains HTML markup.
- Evidence URL uses `javascript:alert(1)`.
- Evidence URL uses `data:text/html,...`.
- Evidence URL uses `file:///etc/passwd`, `chrome://settings`, or `extension://...`.
- URL contains invisible/bidi control characters.

## SSRF and Fetch Safety

- URL extractor request for `http://localhost:3000`.
- URL extractor request for `http://127.0.0.1`.
- URL extractor request for `http://0.0.0.0`.
- URL extractor request for `http://169.254.169.254/latest/meta-data`.
- URL extractor request for a private LAN IP such as `http://192.168.1.1`.
- URL extractor request for `http://[::1]`.
- URL extractor request that redirects to a blocked private IP.
- URL extractor request for a large HTML response over the configured byte cap.

## Abuse and Rate Limits

- Submit six posts from one account within an hour.
- Submit repeated identical comments.
- Submit more than five evidence URLs on a claim.
- Submit duplicate evidence URLs.
- Submit many links from the same low-quality source in one post.
- Submit more than twenty reports in one day.
- Hammer `/api/source-mesh/check`, `/api/check`, `/api/extract-url`, `/api/routines/run`, and `/api/ai/assist`.

## Visibility and Moderation

- Logged-out user reads a public active claim.
- Logged-out user reads a private claim.
- Logged-out user reads a removed claim.
- Author reads their own private claim.
- Non-admin reads `reports`, `auditLogs`, or `moderationActions`.
- Admin/moderator token reads report queue.

## Error UX

- Trigger a Firestore missing-index error and confirm the app hides the raw Firebase index URL.
- Trigger a Firestore permission denial and confirm the UI says "You cannot edit this content."
- Trigger a blocked URL and confirm the UI says "This link type is not allowed."
- Trigger rate limiting and confirm the UI says "This action is temporarily limited."

## Deployment and Secrets

- Confirm `.env.local` and `.env.*.local` are ignored by Git.
- Confirm `env.example` contains placeholders only.
- Confirm no Firebase service account JSON, private key, or `.pem` file is committed.
- Confirm Firebase Web keys only use `NEXT_PUBLIC_` variables.
- Confirm production Firebase authorized domains include the Vercel production domain.
