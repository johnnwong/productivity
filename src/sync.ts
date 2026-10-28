import { createClient } from "@supabase/supabase-js";
import { parseBackup, type AppState } from "./model";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloud = url && key ? createClient(url, key) : null;
export interface CloudDocument {
  revision: number;
  state: AppState;
}
export interface SyncBase {
  revision: number;
  fingerprint: string;
}
export type SyncAction = "setup" | "equal" | "pull" | "push" | "conflict";
export function fingerprint(state: AppState): string {
  const { revision: _, ...data } = state;
  void _;
  return JSON.stringify(data);
}
export function syncAction(
  local: string,
  remote: string | null,
  base: SyncBase | null,
  remoteRevision: number,
): SyncAction {
  if (!base) return "setup";
  if (remote === null) return "conflict";
  if (local === remote) return "equal";
  const localChanged = local !== base.fingerprint;
  const remoteChanged = remoteRevision !== base.revision;
  if (localChanged && remoteChanged) return "conflict";
  return localChanged ? "push" : "pull";
}
export async function readCloud(owner: string): Promise<CloudDocument | null> {
  if (!cloud) throw new Error("Cloud sync is not configured.");
  if (navigator.onLine === false)
    throw new Error(
      "You're offline. Changes are saved on this device and will sync when reconnected.",
    );
  const { data, error } = await cloud
    .from("habit_spaces")
    .select("revision,document")
    .eq("owner_id", owner)
    .abortSignal(AbortSignal.timeout(10_000))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (!Number.isSafeInteger(data.revision) || data.revision < 1)
    throw new Error("Invalid cloud revision.");
  return {
    revision: data.revision,
    state: parseBackup(JSON.stringify(data.document)),
  };
}
export async function pushCloud(
  state: AppState,
  expected: number,
  owner: string,
): Promise<number> {
  if (!cloud) throw new Error("Cloud sync is not configured.");
  if (navigator.onLine === false)
    throw new Error(
      "You're offline. Changes are saved on this device and will sync when reconnected.",
    );
  const { data, error } = await cloud
    .rpc("save_habit_space", {
      expected_owner: owner,
      expected_revision: expected,
      next_document: state,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error(error.message);
  if (!Number.isSafeInteger(data) || data < 1)
    throw new Error("Cloud save returned an invalid revision.");
  return data;
}
