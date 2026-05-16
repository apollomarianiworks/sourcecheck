"use client";

import type { AnalyticsEventName } from "./types";

export interface ProofmediaAnalyticsEvent {
  name: AnalyticsEventName;
  createdAt: string;
  properties?: Record<string, string | number | boolean | null>;
}

type AnalyticsHandler = (event: ProofmediaAnalyticsEvent) => void;

let handler: AnalyticsHandler | null = null;

export function configureProofmediaAnalytics(nextHandler: AnalyticsHandler | null) {
  handler = nextHandler;
}

export function trackProofmediaEvent(
  name: AnalyticsEventName,
  properties?: Record<string, string | number | boolean | null>,
) {
  const event: ProofmediaAnalyticsEvent = {
    name,
    properties,
    createdAt: new Date().toISOString(),
  };

  try {
    handler?.(event);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("proofmedia:analytics", { detail: event }));
    }
  } catch {
    // Analytics must never break research, posting, or browsing.
  }
}
