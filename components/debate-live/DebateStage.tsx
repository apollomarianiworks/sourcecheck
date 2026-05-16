import AudienceResponsePanel from "./AudienceResponsePanel";
import DebateRounds from "./DebateRounds";
import DebateTimer from "./DebateTimer";
import EvidenceQueue from "./EvidenceQueue";
import LiveClaimPanel from "./LiveClaimPanel";

export default function DebateStage() {
  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">Live debate infrastructure</div>
          <h2 className="text-[18px] font-bold text-ink">Manual stage architecture</h2>
        </div>
        <span className="text-[11px] rounded bg-section px-2 py-1 text-ink-muted">No websocket yet</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <DebateTimer />
        <LiveClaimPanel />
        <EvidenceQueue />
        <DebateRounds />
        <AudienceResponsePanel />
      </div>
    </section>
  );
}
