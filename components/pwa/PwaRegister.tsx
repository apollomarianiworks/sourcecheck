"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {
        // PWA registration is progressive; the web app should keep working.
      });
    });
  }, []);

  return null;
}
