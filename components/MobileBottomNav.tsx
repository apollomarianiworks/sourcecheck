"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Search" },
  { href: "/community", label: "Feed" },
  { href: "/spaces", label: "Spaces" },
  { href: "/collections", label: "Library" },
  { href: "/notifications", label: "Alerts" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line bg-page/95 backdrop-blur" aria-label="Mobile primary navigation">
      <div className="grid grid-cols-5">
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`py-2 text-center text-[11px] hover:no-underline ${active ? "text-brand font-bold" : "text-ink-muted"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
