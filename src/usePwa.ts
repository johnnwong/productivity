import { useEffect, useState } from "react";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function usePwa() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          setWaiting(registration.waiting);
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setWaiting(worker);
            });
          });
          return navigator.serviceWorker.ready;
        })
        .then(() => setOfflineReady(true))
        .catch(() =>
          setError(
            "Offline setup failed. You can still use the app online; reload to retry.",
          ),
        );
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  async function installApp() {
    if (!install) return;
    try {
      await install.prompt();
      const choice = await install.userChoice;
      if (choice.outcome === "accepted") setInstall(null);
    } catch {
      setError(
        "Installation could not start. Try your browser's install menu instead.",
      );
    }
  }
  function update() {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    waiting.postMessage("SKIP_WAITING");
  }
  return {
    canInstall: !!install,
    installApp,
    update,
    waiting: !!waiting,
    offlineReady,
    error,
  };
}
