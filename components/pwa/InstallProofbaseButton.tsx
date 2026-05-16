"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function InstallProofbaseButton({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => null);
    setPromptEvent(null);
  }

  if (installed) {
    return (
      <span className={compact ? "hidden md:inline text-[12px] text-ink-muted" : "text-[12px] text-ink-muted"}>
        Installed app
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={install}
      disabled={!promptEvent}
      className={
        compact
          ? "hidden sm:inline-flex items-center rounded border border-line px-2.5 py-1.5 text-[12px] text-ink-muted hover:text-brand hover:border-brand disabled:opacity-60"
          : "inline-flex items-center justify-center rounded border border-brand bg-brand px-3 py-2 text-[13px] font-medium text-white hover:bg-brand-hover disabled:border-line disabled:bg-section disabled:text-ink-muted"
      }
      title={promptEvent ? "Install Proofbase as an app" : "Install appears when your browser confirms PWA eligibility"}
    >
      Install Proofbase
    </button>
  );
}
