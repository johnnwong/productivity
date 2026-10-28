import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  cloud,
  fingerprint,
  pushCloud,
  readCloud,
  syncAction,
  type CloudDocument,
  type SyncBase,
} from "./sync";
import type { AppState } from "./model";
import type { Commit } from "./HabitForms";

const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Cloud sync failed. Your local records are unchanged.";
const baseKey = (owner: string) => `little-sync-base.${owner}`;
function getBase(owner: string): SyncBase | null {
  if (localStorage.getItem("little-sync-owner") !== owner) return null;
  const raw = localStorage.getItem(baseKey(owner));
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("revision" in parsed) ||
    !("fingerprint" in parsed) ||
    !Number.isSafeInteger(parsed.revision) ||
    typeof parsed.fingerprint !== "string"
  )
    throw new Error(
      "Sync metadata is unreadable. Export a backup before reconnecting.",
    );
  return parsed as SyncBase;
}
export function useSync(
  state: AppState | null,
  commit: Commit,
  paused = false,
) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState(
    cloud ? "Sign in to sync" : "Local only",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{
    remote: CloudDocument | null;
    owner: string;
  } | null>(null);
  const busy = useRef(false);
  const latest = useRef({ state, commit, session, paused });
  latest.current = { state, commit, session, paused };
  function remember(owner: string, revision: number, state: AppState) {
    localStorage.setItem(
      baseKey(owner),
      JSON.stringify({ revision, fingerprint: fingerprint(state) }),
    );
    localStorage.setItem("little-sync-owner", owner);
  }
  async function synchronize(automatic = false) {
    const { state: local, session: activeSession } = latest.current;
    if (!cloud || !local || !activeSession || busy.current) return;
    if (automatic && latest.current.paused) return;
    busy.current = true;
    setError("");
    setStatus("Syncing...");
    const owner = activeSession.user.id;
    try {
      const base = getBase(owner);
      const remote = await readCloud(owner);
      if (latest.current.session?.user.id !== owner) return;
      if (automatic && latest.current.paused) {
        setStatus("Sync paused while editing");
        return;
      }
      const current = latest.current.state;
      if (!current) throw new Error("Restore your local data before syncing.");
      const action = syncAction(
        fingerprint(current),
        remote ? fingerprint(remote.state) : null,
        base,
        remote?.revision ?? 0,
      );
      if (action === "setup" || action === "conflict") {
        setPending({ remote, owner });
        setStatus(
          action === "setup" ? "Choose initial data" : "Changes need review",
        );
        return;
      }
      if (action === "equal") remember(owner, remote!.revision, current);
      if (action === "pull") {
        if (!latest.current.commit(() => remote!.state))
          throw new Error(
            "Cloud data could not be saved on this device. Your local data is unchanged.",
          );
        remember(owner, remote!.revision, remote!.state);
      }
      if (action === "push") {
        const revision = await pushCloud(current, remote!.revision, owner);
        if (latest.current.session?.user.id !== owner) return;
        remember(owner, revision, current);
      }
      setPending(null);
      setStatus("Synced");
    } catch (error) {
      setError(errorText(error));
      setStatus("Not synced");
    } finally {
      busy.current = false;
    }
  }
  async function choose(source: "device" | "cloud") {
    const local = latest.current.state;
    if (
      !pending ||
      !local ||
      busy.current ||
      latest.current.session?.user.id !== pending.owner
    )
      return;
    busy.current = true;
    setError("");
    try {
      // Keep a durable recovery copy before either side is explicitly replaced.
      localStorage.setItem(
        `little-before-sync.${pending.owner}`,
        JSON.stringify(local),
      );
      if (source === "cloud") {
        if (!pending.remote) throw new Error("There is no cloud copy yet.");
        const fresh = await readCloud(pending.owner);
        if (latest.current.session?.user.id !== pending.owner)
          throw new Error(
            "Account changed during sync. Local records are unchanged.",
          );
        if (!fresh || fresh.revision !== pending.remote.revision)
          throw new Error(
            "Cloud data changed again. Refresh sync and review the new copy.",
          );
        if (!latest.current.commit(() => fresh.state))
          throw new Error("Could not save cloud data locally.");
        remember(pending.owner, fresh.revision, fresh.state);
      } else {
        const revision = await pushCloud(
          local,
          pending.remote?.revision ?? 0,
          pending.owner,
        );
        if (latest.current.session?.user.id !== pending.owner) return;
        remember(pending.owner, revision, local);
      }
      setPending(null);
      setStatus("Synced");
    } catch (error) {
      setError(errorText(error));
      setStatus("Not synced");
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    if (!cloud) return;
    cloud.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        setSession(data.session);
      })
      .catch((error: unknown) => setError(errorText(error)));
    const { data } = cloud.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setPending(null);
      setStatus(session ? "Ready to sync" : "Sign in to sync");
    });
    return () => data.subscription.unsubscribe();
  }, []);
  // Only resume automatic sync after the user has explicitly selected a base.
  const syncRef = useRef(synchronize);
  syncRef.current = synchronize;
  useEffect(() => {
    if (!session || pending || paused) return;
    const run = () => {
      try {
        if (getBase(session.user.id)) void syncRef.current(true);
      } catch (error) {
        setError(errorText(error));
      }
    };
    const saveTimer = setTimeout(run, 1200);
    const poll = setInterval(run, 30_000);
    window.addEventListener("online", run);
    window.addEventListener("focus", run);
    return () => {
      clearTimeout(saveTimer);
      clearInterval(poll);
      window.removeEventListener("online", run);
      window.removeEventListener("focus", run);
    };
  }, [session, state, pending, paused]);
  return {
    configured: !!cloud,
    session,
    status,
    error,
    pending,
    synchronize,
    choose,
  };
}
