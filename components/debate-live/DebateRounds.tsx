export default function DebateRounds() {
  const rounds = ["Opening sources", "Cross-examination", "Rebuttal evidence", "Open questions"];
  return (
    <section className="rounded border border-line-soft bg-section p-3 space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">Debate rounds</div>
      <ol className="space-y-1">
        {rounds.map((round, index) => (
          <li key={round} className="text-[12px] text-ink-body">{index + 1}. {round}</li>
        ))}
      </ol>
    </section>
  );
}
