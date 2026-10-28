import { useRef, useState } from "react";
import {
  parseBackup,
  starterState,
  STORAGE_KEY,
  writeState,
  type AppState,
} from "./model";

function message(error: unknown): string {
  if (error instanceof Error && error.name === "ZodError")
    return "Some data is invalid. Check the values or choose a valid Little by Little backup.";
  return error instanceof Error
    ? error.message
    : "Something went wrong. Your change was not saved.";
}
function load(): { data: AppState | null; raw: string | null; error: string } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) raw = writeState(localStorage, null, starterState());
    return { data: parseBackup(raw), raw, error: "" };
  } catch (error) {
    return {
      data: null,
      raw,
      error: `Could not open your saved space. ${message(error)} Your existing data has not been replaced.`,
    };
  }
}
export function useStore() {
  const [snapshot, setSnapshot] = useState(load);
  const current = useRef(snapshot);
  function commit(change: (data: AppState | null) => AppState): boolean {
    try {
      const next = change(current.current.data);
      const raw = writeState(localStorage, current.current.raw, next);
      current.current = { data: parseBackup(raw), raw, error: "" };
      setSnapshot(current.current);
      return true;
    } catch (error) {
      current.current = {
        ...current.current,
        error: `Not saved: ${message(error)}`,
      };
      setSnapshot(current.current);
      return false;
    }
  }
  return { ...snapshot, commit };
}
