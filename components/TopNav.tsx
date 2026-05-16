"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",              label: "Home" },
  { href: "/debate",        label: "Debate" },
  { href: "/explorer",      label: "Research" },
  { href: "/collections",   label: "Collections" },
  { href: "/compare",       label: "Compare" },
  { href: "/data-sources",  label: "Sources" },
  { href: "/history",       label: "Recent checks" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-page sticky top-0 z-50">
      <nav className="max-w-page mx-auto px-4 md:px-6 h-12 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-1.5 hover:no-underline" aria-label="Proofbase home">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-brand text-white font-bold rounded-sm text-xs leading-none">
            ✓
          </span>
          <span className="font-display text-[18px] font-bold tracking-tight text-ink">
            <span className="text-brand">Proof</span>base
          </span>
        </Link>

        <ul className="flex items-center gap-0.5 text-[13px]">
          {LINKS.map((l) => {
            const isActive = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`
                    px-2.5 md:px-3 py-1.5 rounded-sm transition-colors
                    ${isActive
                      ? "text-brand bg-brand-soft font-medium"
                      : "text-ink-muted hover:text-ink hover:bg-section"
                    }
                  `}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
