import { NextResponse } from "next/server";
import { sourceRegistry, optionalIntegrationStatus } from "@/lib/sourcemesh/registry";

export const runtime = "nodejs";

export async function GET() {
  const sources = sourceRegistry();
  return NextResponse.json({
    totalSources: sources.length,
    availableNow: sources.filter((s) => s.available).length,
    noKeyRequired: sources.filter((s) => !s.requiresKey).map((s) => s.name),
    optional: optionalIntegrationStatus(),
    limitations: [
      "Private, paywalled, login-gated, or restricted social content is not fetched.",
      "Optional web/news APIs are disabled unless a user adds an API key.",
      "Evidence absence is not treated as truth or falsehood.",
    ],
  });
}
