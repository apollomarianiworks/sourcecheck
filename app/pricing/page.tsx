import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Future Proofbase plan structure. No payments are active.",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    items: ["Basic checks", "Limited deep scans", "Local saved history", "Basic debate briefs", "Local collections"],
  },
  {
    name: "Pro",
    price: "Future",
    items: ["Unlimited deep research", "Cloud collections", "AI assistant upgrades", "Report exports", "Routines and source monitoring"],
  },
  {
    name: "Teams/Schools",
    price: "Future",
    items: ["Shared collections", "Classrooms and debate clubs", "Moderation tools", "Admin controls", "Evidence room workflows"],
  },
];

export default function PricingPage() {
  return (
    <main className="max-w-page mx-auto px-4 md:px-6 py-8 space-y-8">
      <section className="space-y-2">
        <div className="text-[12px] uppercase tracking-wide text-ink-muted">Pricing-ready architecture</div>
        <h1 className="text-[32px] font-bold text-ink leading-tight">Core research stays useful free</h1>
        <p className="text-[15px] text-ink-body max-w-3xl">
          No payment processing is active. This page defines future product packaging without locking current core functionality behind a paywall.
        </p>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((tier) => (
          <section key={tier.name} className="card p-5 space-y-4">
            <div>
              <h2 className="text-[20px] font-bold text-ink">{tier.name}</h2>
              <div className="text-[26px] font-bold text-brand">{tier.price}</div>
            </div>
            <ul className="space-y-2 text-[13px] text-ink-body">
              {tier.items.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
