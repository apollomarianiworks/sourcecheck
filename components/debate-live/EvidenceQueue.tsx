export default function EvidenceQueue() {
  const slots = ["Primary source", "Supporting evidence", "Opposing evidence", "Context note"];
  return (
    <section className="rounded border border-line-soft bg-section p-3 space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">Evidence queue</div>
      {slots.map((slot) => (
        <div key={slot} className="rounded bg-page border border-line-soft px-2 py-1.5 text-[12px] text-ink-body">
          {slot} slot - no live queue connected yet
        </div>
      ))}
    </section>
  );
}
