"use client";

import Link from "next/link";

interface Props {
  icon?: string;
  title: string;
  body: string;
  cta?: { href?: string; onClick?: () => void; label: string };
}

export default function EmptyState({ icon = "·", title, body, cta }: Props) {
  return (
    <div className="card p-6 text-center space-y-3">
      <div aria-hidden="true" className="text-3xl text-ink-deep">{icon}</div>
      <h3 className="text-[16px] font-bold text-ink">{title}</h3>
      <p className="text-[13px] text-ink-body max-w-prose mx-auto leading-relaxed">{body}</p>
      {cta && (cta.href
        ? (
          <Link
            href={cta.href}
            className="inline-block bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded text-[13px] font-medium no-underline"
          >
            {cta.label}
          </Link>
        )
        : (
          <button
            type="button"
            onClick={cta.onClick}
            className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded text-[13px] font-medium"
          >
            {cta.label}
          </button>
        )
      )}
    </div>
  );
}
