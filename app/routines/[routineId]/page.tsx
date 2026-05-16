import type { Metadata } from "next";
import RoutineDetailClient from "./routine-detail-client";

export const metadata: Metadata = {
  title: "Routine",
  description: "Run and edit a local Proofbase routine.",
};

export default async function RoutineDetailPage({ params }: { params: Promise<{ routineId: string }> }) {
  const { routineId } = await params;
  return <RoutineDetailClient routineId={decodeURIComponent(routineId)} />;
}
