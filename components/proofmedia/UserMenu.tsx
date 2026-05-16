"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocalAccount, subscribeLocalAccount, type LocalAccount } from "@/lib/auth/local";
import { localCounts } from "@/lib/proofmedia/store";
import Avatar from "./Avatar";

export default function UserMenu() {
  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [counts, setCounts] = useState({ claims: 0, collections: 0, debates: 0, follows: 0, profileSet: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAccount(getLocalAccount());
    setCounts(localCounts());
    setMounted(true);
    return subscribeLocalAccount((a) => {
      setAccount(a);
      setCounts(localCounts());
    });
  }, []);

  if (!mounted || !account) return null;

  return (
    <aside className="card p-3.5 space-y-2.5">
      <header className="flex items-center gap-2.5">
        <Avatar name={account.displayName} size={36} />
        <div className="min-w-0">
          <Link
            href={`/profile/${account.username}`}
            className="block text-[14px] font-bold text-ink hover:underline truncate"
          >
            {account.displayName}
          </Link>
          <div className="text-[11px] text-ink-muted">@{account.username} · local account</div>
        </div>
      </header>
      <dl className="grid grid-cols-2 gap-y-1 text-[12px]">
        <Stat label="Claims"      n={counts.claims} />
        <Stat label="Collections" n={counts.collections} />
        <Stat label="Debates"     n={counts.debates} />
        <Stat label="Follows"     n={counts.follows} />
      </dl>
      <nav className="flex flex-col gap-1 text-[12px] border-t border-line-soft pt-2">
        <Link href={`/profile/${account.username}`} className="text-link hover:underline">View profile</Link>
        <Link href="/collections" className="text-link hover:underline">My collections</Link>
        <Link href="/community" className="text-link hover:underline">My claims</Link>
        <Link href="/debates" className="text-link hover:underline">My debates</Link>
      </nav>
    </aside>
  );
}

function Stat({ label, n }: { label: string; n: number }) {
  return (
    <div>
      <span className="font-bold text-ink">{n}</span>{" "}
      <span className="text-ink-muted">{label}</span>
    </div>
  );
}
