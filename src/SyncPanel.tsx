import { useState, type FormEvent } from "react";
import { Cloud, RefreshCw } from "lucide-react";
import { cloud } from "./sync";
import type { useSync } from "./useSync";

export function SyncPanel({ sync }: { sync: ReturnType<typeof useSync> }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cloud) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const email = String(new FormData(event.currentTarget).get("email"));
      const { error } = await cloud.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: location.origin, shouldCreateUser: false },
      });
      if (error) throw error;
      setMessage(
        "Check your email for a sign-in link. Open it on this device.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not send sign-in email.",
      );
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="form-stack sync-panel">
      <h3>
        <Cloud size={18} /> Across your devices
      </h3>
      {!sync.configured ? (
        <div className="callout">
          <strong>Cloud sync needs one-time setup.</strong>
          <p>
            The app currently saves only on this device. Connect a Supabase
            project using the setup instructions in PRD.md. Use only its public
            publishable key, never an admin/service-role key.
          </p>
        </div>
      ) : !sync.session ? (
        <>
          <p className="muted">
            Sign in with the same email on each device. Your private cloud copy
            is separated from other accounts. This sends your habit data to your
            configured Supabase project only after you choose to connect it.
          </p>
          <form className="form-stack" onSubmit={(event) => void login(event)}>
            <label>
              Email
              <input type="email" name="email" required autoComplete="email" />
            </label>
            <button className="button primary" disabled={working}>
              Send sign-in link
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="muted">
            {sync.session.user.email} · {sync.status}. After initial connection,
            changes sync automatically, including when you reconnect. Concurrent
            edits pause for review rather than silently overwriting.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => void sync.synchronize()}
            >
              <RefreshCw size={15} />
              Sync now
            </button>
            <button
              className="text-button"
              onClick={async () => {
                setError("");
                const { error } = await cloud!.auth.signOut({ scope: "local" });
                if (error) setError(error.message);
              }}
            >
              Sign out on this device
            </button>
          </div>
          <p className="field-hint">
            Signing out keeps local records on this device. Don't use a shared
            browser for private habits.
          </p>
          {sync.pending && (
            <div className="callout">
              <strong>Choose which copy to keep</strong>
              <p>
                Device and cloud records are not automatically merged. Export a
                backup first. Choosing a copy replaces the other copy, including
                deletions. A local recovery snapshot is also kept before
                replacement.
              </p>
              <p>
                {sync.pending.remote
                  ? `Cloud: ${sync.pending.remote.state.habits.length} habits, ${sync.pending.remote.state.entries.length} entries.`
                  : "No cloud copy yet."}
              </p>
              <div className="button-row">
                {sync.pending.remote && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Replace this device's data with the cloud copy? Export a backup first.",
                        )
                      )
                        void sync.choose("cloud");
                    }}
                  >
                    Use cloud on this device
                  </button>
                )}
                <button
                  className="button danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Publish this device's data? This replaces any cloud copy. Other devices will receive it.",
                      )
                    )
                      void sync.choose("device");
                  }}
                >
                  Use this device's copy
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {(error || sync.error) && (
        <p role="alert" className="form-error">
          {error || sync.error}
        </p>
      )}
      {message && (
        <p role="status" className="success-text">
          {message}
        </p>
      )}
    </section>
  );
}
