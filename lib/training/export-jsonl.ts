import type { ProofbaseTrainingEvent } from "./types";

export function trainingEventsToJsonl(events: ProofbaseTrainingEvent[]): string {
  return events
    .map((event) => JSON.stringify({
      ...event,
      correctionNotes: event.correctionNotes.slice(0, 2000),
      query: event.query.slice(0, 1000),
      finalSummary: event.finalSummary.slice(0, 2000),
    }))
    .join("\n");
}
