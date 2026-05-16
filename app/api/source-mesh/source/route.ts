import { NextResponse } from "next/server";
import { sourceRegistry } from "@/lib/sourcemesh/registry";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ sources: sourceRegistry() });
}
