import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code2,
  Download,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sprout,
  Sun,
  Upload,
  X,
} from "lucide-react";
import {
  chartMetrics,
  dateLabel,
  dayInZone,
  fieldValue,
  metricOn,
  parseBackup,
  progress,
  saveEntry,
  shiftDay,
  timeInZone,
  trackingFields,
  type AppState,
  type Entry,
  type Habit,
} from "./model";
import { EntryForm, HabitForm } from "./HabitForms";
import { useStore } from "./useStore";
import { usePwa } from "./usePwa";
import { useSync } from "./useSync";
import { SyncPanel } from "./SyncPanel";

type Dialog =
  | { kind: "entry"; habit: Habit; entry?: Entry }
  | { kind: "habit"; habit?: Habit }
  | { kind: "settings" }
  | null;
const fmt = (n: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
const icons = {
  check: Heart,
  count: Droplets,
  leetcode: Code2,
  custom: BookOpen,
  lift: Dumbbell,
};
function habitIcon(habit: Habit) {
  return habit.unit === "steps" ? Footprints : icons[habit.kind];
}
function download(content: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      aria-labelledby="modal-title"
      className="modal"
    >
      <header className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-btn" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Settings({
  store,
  sync,
  pwa,
}: {
  store: ReturnType<typeof useStore>;
  sync: ReturnType<typeof useSync>;
  pwa: ReturnType<typeof usePwa>;
}) {
  const [incoming, setIncoming] = useState<AppState | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="form-stack">
      <SyncPanel sync={sync} />
      <details className="settings-section">
        <summary>Backups & recovery</summary>
        <div className="form-stack">
          <p className="muted">
            Export before restoring or switching devices. Cloud sync is not an
            immutable backup; edits and deletions sync too.
          </p>
          <button
            className="button secondary wide"
            disabled={!store.raw}
            onClick={() => {
              download(
                store.raw!,
                `little-by-little-${new Date().toISOString().slice(0, 10)}.json`,
              );
              setMessage("Backup downloaded.");
            }}
          >
            <Download size={17} />
            Export {store.data ? "a backup" : "original data for recovery"}
          </button>
          <button
            className="text-button"
            onClick={() => {
              try {
                const owner = sync.session?.user.id;
                const raw = owner
                  ? localStorage.getItem(`little-before-sync.${owner}`)
                  : null;
                if (!raw) {
                  setError(
                    "No pre-sync recovery snapshot is available for this account on this device.",
                  );
                  return;
                }
                download(raw, "little-before-sync.json");
                setMessage("Pre-sync recovery snapshot downloaded.");
              } catch {
                setError(
                  "Could not read the recovery snapshot from browser storage.",
                );
              }
            }}
          >
            Download pre-sync recovery snapshot
          </button>
          <label className="upload-zone">
            <Upload size={20} />
            <strong>Restore a backup</strong>
            <input
              type="file"
              accept=".json,application/json"
              aria-label="Choose backup file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                const input = event.target;
                setIncoming(null);
                setError("");
                setMessage("");
                if (!file) return;
                try {
                  if (file.size > 20_000_000) throw new Error("Too large");
                  setIncoming(parseBackup(await file.text()));
                } catch {
                  setError(
                    "This backup couldn't be read. Choose a valid JSON backup under 20 MB. Nothing has been replaced.",
                  );
                }
                input.value = "";
              }}
            />
          </label>
          {incoming && (
            <div className="callout">
              <strong>Replace this device's data?</strong>
              <p>
                {incoming.habits.length} habits, {incoming.entries.length}{" "}
                entries. This replaces, not merges. If connected, this change
                may also sync to the cloud.
              </p>
              <div className="button-row">
                <button
                  className="button danger"
                  onClick={() => {
                    if (store.commit(() => incoming)) {
                      setIncoming(null);
                      setMessage("Backup restored.");
                    } else
                      setError("Restore failed. Check the storage message.");
                  }}
                >
                  Replace and restore
                </button>
                <button
                  className="button secondary"
                  onClick={() => setIncoming(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </details>
      <details className="settings-section">
        <summary>Install as an app</summary>
        <div className="form-stack">
          <p className="muted">Open in its own window, out of your tabs.</p>
          {pwa.canInstall ? (
            <button
              className="button primary"
              onClick={() => void pwa.installApp()}
            >
              <ArrowDownToLine size={17} />
              Install app
            </button>
          ) : (
            <p className="callout">
              Chrome / Edge: use the install icon or app menu. Safari on Mac:
              File &gt; Add to Dock. On iPhone: Share &gt; Add to Home Screen.
            </p>
          )}
          <p className="field-hint">
            {pwa.offlineReady
              ? "Offline shell ready."
              : "Offline support is available after the production build's first online load."}
          </p>
        </div>
      </details>
      <p className="field-hint">
        Reporting time zone: {store.data?.timeZone ?? "Unavailable"}. Local
        records are browser-managed and not encrypted. Export backups regularly.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success-text">
          {message}
        </p>
      )}
    </div>
  );
}
function HabitItem({
  habit,
  state,
  date,
  view,
  record,
  edit,
  toggle,
  inspect,
}: {
  habit: Habit;
  state: AppState;
  date: string;
  view: string;
  record: () => void;
  edit: () => void;
  toggle: () => void;
  inspect: () => void;
}) {
  const p = progress(state, habit, date);
  const Icon = habitIcon(habit);
  const ratio = Math.min(1, p.value / p.target);
  return (
    <article
      className={`habit-card ${view === "list" ? "habit-list-row" : ""} ${habit.color} ${p.done ? "is-done" : ""}`}
      style={{ "--fill": `${ratio * 100}%` } as CSSProperties}
    >
      <span className="habit-icon">
        <Icon size={20} strokeWidth={1.7} />
      </span>
      <div className="habit-identity">
        <h3>{habit.name}</h3>
        <span className="habit-subtitle">
          {habit.kind === "count"
            ? "Counter"
            : habit.kind === "check"
              ? "Check-in"
              : habit.kind === "lift"
                ? "Lifting"
                : habit.kind === "leetcode"
                  ? "Practice"
                  : "Custom log"}
          {p.done ? " · Target met" : ""}
        </span>
      </div>
      <div className="card-progress">
        <div className="progress-number">
          <strong key={p.value}>{fmt(p.value)}</strong>
          <span>
            / {fmt(p.target)} {habit.unit || "check-in"}
          </span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
      <div className="habit-actions">
        {habit.kind === "check" &&
        !trackingFields(habit).some((f) => f.active) ? (
          <button
            className={`ritual-check ${p.done ? "checked" : ""}`}
            onClick={toggle}
            aria-label={`${p.done ? "Uncheck" : "Complete"} ${habit.name}`}
            aria-pressed={p.done}
          >
            {p.done ? <Check size={19} /> : <Heart size={19} />}
          </button>
        ) : (
          <button className="small-action" onClick={record}>
            <Plus size={15} />
            {habit.kind === "leetcode"
              ? "Log problem"
              : habit.kind === "count"
                ? "Add progress"
                : "Log entry"}
          </button>
        )}
        <button
          className="icon-btn"
          aria-label={`View charts for ${habit.name}`}
          onClick={inspect}
        >
          <BarChart3 size={17} />
        </button>
        <button
          className="icon-btn"
          aria-label={`Edit ${habit.name}`}
          onClick={edit}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>
    </article>
  );
}
function EntryDetails({ entry, habit }: { entry: Entry; habit: Habit }) {
  return (
    <>
      {entry.sets && (
        <p className="entry-note">
          {entry.sets
            .map(
              (s, i) =>
                `Set ${i + 1}: ${fmt(s.weight)} ${habit.weightUnit} × ${s.reps}`,
            )
            .join(" · ")}
        </p>
      )}
      <dl className="entry-fields">
        {trackingFields(habit)
          .filter(
            (f) =>
              !["title", "url", "difficulty", "duration", "note"].includes(
                f.id,
              ),
          )
          .map((f) => {
            const value = fieldValue(entry, f.id);
            return value !== undefined && value !== "" ? (
              <div key={f.id}>
                <dt>
                  {f.label}
                  {f.active ? "" : " (hidden)"}
                </dt>
                <dd>
                  {f.type === "url" ? (
                    <a
                      href={String(value)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {String(value)}
                      <ArrowUpRight size={12} />
                    </a>
                  ) : (
                    `${value}${f.unit ? ` ${f.unit}` : ""}`
                  )}
                </dd>
              </div>
            ) : null;
          })}
      </dl>
      {entry.note && <p className="entry-note">{entry.note}</p>}
    </>
  );
}
function Insights({
  state,
  initialHabit,
  date,
}: {
  state: AppState;
  initialHabit?: string;
  date: string;
}) {
  const [habitId, setHabitId] = useState(
    initialHabit ?? state.habits[0]?.id ?? "",
  );
  const [range, setRange] = useState("7");
  const [start, setStart] = useState(shiftDay(date, -6));
  const [end, setEnd] = useState(date);
  const [metricId, setMetricId] = useState("progress");
  const [exercise, setExercise] = useState("");
  const habit = state.habits.find((h) => h.id === habitId) ?? state.habits[0];
  if (!habit)
    return <p className="empty-state">Add a habit to see its history.</p>;
  const metrics = chartMetrics(habit);
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];
  const from =
    range === "custom" ? start : shiftDay(date, -(Number(range) - 1));
  const to = range === "custom" ? end : date;
  const valid = from && to && from <= to && shiftDay(from, 365) >= to;
  const days: string[] = [];
  if (valid) for (let d = from; d <= to; d = shiftDay(d, 1)) days.push(d);
  const points = days.map((d) => ({
    date: d,
    ...metricOn(state, habit, d, metric.id, exercise),
    target: progress(state, habit, d).target,
  }));
  const showGoal = metric.id === "progress" && !exercise;
  const maximum = Math.max(
    1,
    ...points.flatMap((p) => [p.value, showGoal ? p.target : 0]),
  );
  const recorded = points.filter((p) => p.recorded);
  const total =
    metric.aggregate === "max"
      ? Math.max(0, ...recorded.map((p) => p.value))
      : recorded.reduce((sum, p) => sum + p.value, 0);
  const exercises = [
    ...new Set(
      state.entries
        .filter((e) => e.habitId === habit.id && e.exercise)
        .map((e) => e.exercise!),
    ),
  ].sort();
  return (
    <section className="insight-panel panel">
      <div className="section-top">
        <h2>Look how you're growing.</h2>
        <BarChart3 size={21} />
      </div>
      <div className="chart-controls">
        <label>
          Habit
          <select
            value={habit.id}
            onChange={(e) => {
              setHabitId(e.target.value);
              setMetricId("progress");
              setExercise("");
            }}
          >
            {state.habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.archived ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chart metric
          <select
            value={metric.id}
            onChange={(e) => setMetricId(e.target.value)}
          >
            {metrics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time frame
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
      </div>
      {habit.kind === "lift" && (
        <label>
          Exercise filter
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
          >
            <option value="">All exercises (combined)</option>
            {exercises.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      )}
      {range === "custom" && (
        <div className="form-row">
          <label>
            From
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={end}
              max={dayInZone(state.timeZone)}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
      )}
      {!valid ? (
        <p role="alert" className="form-error">
          Choose an ordered date range of up to 366 days.
        </p>
      ) : (
        <>
          <div className="insight-totals">
            <div>
              <strong>{fmt(total)}</strong>
              <span>
                {metric.aggregate === "max" ? "Peak" : "Total"}{" "}
                {metric.unit || metric.label}
              </span>
            </div>
            <div>
              <strong>{recorded.length}</strong>
              <span>days with this value</span>
            </div>
            {showGoal && (
              <div>
                <strong>
                  {points.filter((p) => p.value >= p.target).length}
                  <small> / {days.length}</small>
                </strong>
                <span>days reaching your target</span>
              </div>
            )}
          </div>
          <div
            className={`bar-chart ${habit.color}`}
            role="img"
            aria-label={`${habit.name}, ${metric.label}. ${fmt(total)} ${metric.unit}. Detailed values in the table below.`}
          >
            {[0, 1, 2, 3].map((n) => (
              <div
                key={n}
                className="chart-gridline"
                style={{ bottom: `${n * 30 + 4}%` }}
              >
                <span>{fmt((maximum * n) / 3)}</span>
              </div>
            ))}
            <div className="bars">
              {points.map((p) => (
                <div className="bar-column" key={p.date}>
                  {showGoal && (
                    <span
                      className="target-marker"
                      style={{ bottom: `${(p.target / maximum) * 90}%` }}
                    />
                  )}
                  <div
                    className={`bar ${!p.recorded ? "missing" : ""}`}
                    style={{
                      height: `${Math.max(p.recorded ? 2 : 0, (p.value / maximum) * 90)}%`,
                    }}
                    title={`${p.date}: ${p.recorded ? fmt(p.value) : "not recorded"} ${metric.unit}`}
                  />
                  {days.length <= 7 && (
                    <span className="bar-label">
                      {dateLabel(p.date, { weekday: "short" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            <span>
              {metric.aggregate === "max" ? "Daily maximum" : "Daily total"} (
              {metric.unit || metric.label})
            </span>
            {showGoal && (
              <span>
                <i className="target-key" />
                Daily target
              </span>
            )}
            <span>Blank = not recorded</span>
          </div>
          {habit.kind === "lift" && (
            <p className="field-hint">
              Volume sums weight × reps for each set. Filter by exercise to
              compare the same lift; zero weight can represent bodyweight work
              and does not include body mass.
            </p>
          )}
          {recorded.length === 0 && (
            <p className="empty-state compact">
              No records for this metric yet.
            </p>
          )}
          {habit.kind === "leetcode" && (
            <details className="data-details">
              <summary>Practice breakdown</summary>
              <div className="difficulty-summary">
                {(["easy", "medium", "hard"] as const).map((level) => (
                  <span className={`difficulty ${level}`} key={level}>
                    {level}:{" "}
                    {
                      state.entries.filter(
                        (e) =>
                          e.habitId === habit.id &&
                          e.date >= from &&
                          e.date <= to &&
                          fieldValue(e, "difficulty") === level,
                      ).length
                    }
                  </span>
                ))}
              </div>
            </details>
          )}
          <details className="data-details">
            <summary>See daily numbers</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>
                      {metric.label} {metric.unit && `(${metric.unit})`}
                    </th>
                    {showGoal && <th>Target</th>}
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.date}>
                      <td>{p.date}</td>
                      <td>{p.recorded ? fmt(p.value) : "Not recorded"}</td>
                      {showGoal && <td>{fmt(p.target)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
export default function App() {
  const store = useStore();
  const pwa = usePwa();
  const state = store.data;
  const [page, setPage] = useState<"today" | "insights" | "journal">("today");
  const [date, setDate] = useState(() =>
    dayInZone(
      state?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
  );
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const sync = useSync(
    state,
    store.commit,
    dialog?.kind === "entry" || dialog?.kind === "habit" || !!deleteId,
  );
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [displayError, setDisplayError] = useState("");
  const [view, setView] = useState<"list" | "cards">(() => {
    try {
      return localStorage.getItem("little-display") === "cards"
        ? "cards"
        : "list";
    } catch {
      return "list";
    }
  });
  const [selectedHabit, setSelectedHabit] = useState<string>();
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const today = dayInZone(state?.timeZone ?? "UTC", new Date(clock));
  const active = state?.habits.filter((h) => !h.archived) ?? [];
  const visible = active.filter((h) =>
    h.name.toLowerCase().includes(query.toLowerCase()),
  );
  const done = state
    ? active.filter((h) => progress(state, h, date).done).length
    : 0;
  const entries =
    state?.entries
      .filter(
        (e) => e.date === date && (filter === "all" || e.habitId === filter),
      )
      .sort((a, b) => b.time.localeCompare(a.time)) ?? [];
  function announce(text = "Saved.") {
    setNotice(text);
  }
  function toggle(habit: Habit) {
    if (!state) return;
    const p = progress(state, habit, date);
    if (
      store.commit((s) =>
        p.done
          ? {
              ...s!,
              entries: s!.entries.filter(
                (e) => !(e.habitId === habit.id && e.date === date),
              ),
            }
          : saveEntry(s!, {
              id: crypto.randomUUID(),
              habitId: habit.id,
              date,
              time: timeInZone(s!.timeZone),
              value: 1,
              title: "",
              note: "",
              metrics: {},
            }),
      )
    )
      announce(p.done ? "Check-in undone." : "Check-in saved.");
  }
  function changeView(next: "list" | "cards") {
    setView(next);
    setDisplayError("");
    try {
      localStorage.setItem("little-display", next);
    } catch {
      setDisplayError(
        "Display changed for this session, but couldn't be saved for next time.",
      );
    }
  }
  const entryList = (
    <div className="entry-list">
      {entries.length === 0 ? (
        <p className="empty-state">No entries for this day yet.</p>
      ) : (
        entries.map((entry) => {
          const habit = state!.habits.find((h) => h.id === entry.habitId)!;
          const Icon = habitIcon(habit);
          return (
            <article key={entry.id} className="entry-row">
              <span className={`entry-icon ${habit.color}`}>
                <Icon size={18} />
              </span>
              <div className="entry-content">
                <div className="entry-title">
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {entry.title || "LeetCode practice"}
                      <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    <strong>
                      {entry.exercise ||
                        entry.title ||
                        (habit.kind === "count"
                          ? `${fmt(entry.value)} ${habit.unit}`
                          : habit.name)}
                    </strong>
                  )}
                  {entry.difficulty && (
                    <span className={`difficulty ${entry.difficulty}`}>
                      {entry.difficulty}
                    </span>
                  )}
                </div>
                <p className="entry-meta">
                  {habit.name} · {entry.time}
                  {entry.duration !== undefined
                    ? ` · ${entry.duration} min`
                    : ""}
                  {habit.archived ? " (archived)" : ""}
                </p>
                <EntryDetails entry={entry} habit={habit} />
              </div>
              <div className="entry-actions">
                <button
                  className="text-button"
                  onClick={() => setDialog({ kind: "entry", habit, entry })}
                >
                  Edit
                </button>
                <button
                  className="text-button delete-action"
                  onClick={() => setDeleteId(entry.id)}
                  aria-label={`Delete ${entry.title || habit.name} entry`}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
  return (
    <div className="app-shell quiet">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setPage("today");
          }}
        >
          <span className="brand-mark">
            <Sprout size={26} />
          </span>
          <span>
            little<span className="brand-sub">by little</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={page === "today" ? "active" : ""}
            onClick={() => setPage("today")}
          >
            <Sun size={20} />
            My day
          </button>
          <button
            className={page === "insights" ? "active" : ""}
            onClick={() => setPage("insights")}
          >
            <BarChart3 size={20} />
            Growth
          </button>
          <button
            className={page === "journal" ? "active" : ""}
            onClick={() => setPage("journal")}
          >
            <BookOpen size={20} />
            Little journal
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setDialog({ kind: "settings" })}>
            <Settings2 size={18} />
            Settings & sync
          </button>
          <div className="local-badge">
            <span />
            {sync.status}
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            {page === "today"
              ? "My day"
              : page === "insights"
                ? "Growth"
                : "Little journal"}
          </div>
          <div className="topbar-right">
            <button
              className="text-button sync-status"
              aria-label="Cloud sync status"
              onClick={() => setDialog({ kind: "settings" })}
            >
              <Cloud size={15} />
              {sync.status}
            </button>
            <button
              className="icon-btn"
              aria-label="Settings and backups"
              onClick={() => setDialog({ kind: "settings" })}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </header>
        <div className="main-content">
          {store.error && (
            <div className="error-banner" role="alert">
              {store.error}
              <button
                className="text-button"
                onClick={() => setDialog({ kind: "settings" })}
              >
                Open recovery & backups
              </button>
            </div>
          )}
          {(sync.error || sync.pending) && (
            <div className="update-banner">
              {sync.error || "Choose which data to sync in Settings."}
              <button
                className="text-button"
                onClick={() => setDialog({ kind: "settings" })}
              >
                Review sync
              </button>
            </div>
          )}
          {pwa.error && (
            <p role="alert" className="error-banner">
              {pwa.error}
            </p>
          )}
          {pwa.waiting && (
            <div className="update-banner">
              Update ready. Save open forms first.
              <button className="text-button" onClick={pwa.update}>
                Update app
              </button>
            </div>
          )}
          {!state ? (
            <section className="panel recovery">
              <ShieldCheck size={32} />
              <h1>Let's protect your space.</h1>
              <p>Your local data couldn't be read. Nothing has been reset.</p>
              <button
                className="button primary"
                onClick={() => setDialog({ kind: "settings" })}
              >
                Recovery & backups
              </button>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {dateLabel(date, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <h1>
                    {page === "today"
                      ? "A little, every day."
                      : page === "insights"
                        ? "Your progress, in perspective."
                        : "Your little journal."}
                  </h1>
                </div>
                <button
                  className="button primary"
                  onClick={() => setDialog({ kind: "habit" })}
                >
                  <Plus size={17} />
                  New habit
                </button>
              </div>
              <div className="date-toolbar">
                <div className="date-controls">
                  <button
                    className="icon-btn"
                    aria-label="Previous day"
                    onClick={() => setDate(shiftDay(date, -1))}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <label className="date-picker">
                    <span>{date === today ? "Today" : dateLabel(date)}</span>
                    <input
                      aria-label="Selected date"
                      type="date"
                      value={date}
                      max={today}
                      onChange={(e) => {
                        if (e.target.value && e.target.value <= today)
                          setDate(e.target.value);
                      }}
                    />
                  </label>
                  <button
                    className="icon-btn"
                    aria-label="Next day"
                    disabled={date >= today}
                    onClick={() => setDate(shiftDay(date, 1))}
                  >
                    <ChevronRight size={18} />
                  </button>
                  {date !== today && (
                    <button
                      className="text-button"
                      onClick={() => setDate(today)}
                    >
                      Back to today
                    </button>
                  )}
                </div>
                {page === "today" && (
                  <span className="daily-summary">
                    <Sprout size={15} />
                    {done} / {active.length} intentions met
                  </span>
                )}
              </div>
              {page === "today" && (
                <section aria-labelledby="habits-heading">
                  <div className="habit-toolbar">
                    <h2 id="habits-heading">Your daily little things</h2>
                    <div className="display-controls">
                      <label className="habit-search">
                        <Search size={15} />
                        <input
                          aria-label="Find a habit"
                          placeholder="Find a habit"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <div
                        className="view-switch"
                        role="group"
                        aria-label="Habit display"
                      >
                        <button
                          aria-label="List view"
                          aria-pressed={view === "list"}
                          onClick={() => changeView("list")}
                        >
                          <List size={17} />
                        </button>
                        <button
                          aria-label="Card view"
                          aria-pressed={view === "cards"}
                          onClick={() => changeView("cards")}
                        >
                          <LayoutGrid size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {displayError && (
                    <p role="alert" className="field-hint">
                      {displayError}
                    </p>
                  )}
                  <div
                    className={view === "list" ? "habits-list" : "habits-grid"}
                  >
                    {visible.map((habit) => (
                      <HabitItem
                        key={habit.id}
                        habit={habit}
                        state={state}
                        date={date}
                        view={view}
                        record={() => setDialog({ kind: "entry", habit })}
                        edit={() => setDialog({ kind: "habit", habit })}
                        toggle={() => toggle(habit)}
                        inspect={() => {
                          setSelectedHabit(habit.id);
                          setPage("insights");
                        }}
                      />
                    ))}
                  </div>
                  {visible.length === 0 && (
                    <p className="empty-state">
                      {query
                        ? "No habits match your search."
                        : "Add a habit to get started."}
                    </p>
                  )}
                  <button
                    className="text-button journal-link"
                    onClick={() => {
                      setFilter("all");
                      setPage("journal");
                    }}
                  >
                    View this day's entries (
                    {state.entries.filter((e) => e.date === date).length}){" "}
                    <BookOpen size={14} />
                  </button>
                </section>
              )}
              {page === "insights" && (
                <Insights
                  key={selectedHabit ?? "all"}
                  state={state}
                  initialHabit={selectedHabit}
                  date={date}
                />
              )}
              {page === "journal" && (
                <section className="panel">
                  <div className="section-top">
                    <h2>Entries</h2>
                    <label className="journal-filter">
                      Show
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">All habits</option>
                        {state.habits.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                            {h.archived ? " (archived)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {entryList}
                </section>
              )}
              {page === "today" && (
                <section className="archive-section">
                  <button
                    className="text-button"
                    onClick={() => setShowArchived(!showArchived)}
                  >
                    <Archive size={14} />
                    {showArchived ? "Hide" : "View"} archived habits (
                    {state.habits.filter((h) => h.archived).length})
                  </button>
                  {showArchived && (
                    <div className="archived-list">
                      {state.habits
                        .filter((h) => h.archived)
                        .map((h) => (
                          <div key={h.id}>
                            <span>{h.name}</span>
                            <button
                              className="text-button"
                              onClick={() =>
                                store.commit((s) => ({
                                  ...s!,
                                  habits: s!.habits.map((item) =>
                                    item.id === h.id
                                      ? { ...item, archived: false }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      <p className="field-hint">
                        History remains in Growth and Little journal.
                      </p>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <div
        role="status"
        aria-live="polite"
        className={`toast ${notice ? "visible" : ""}`}
      >
        {notice && (
          <>
            <span>
              <Check size={15} />
              {notice}
            </span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={15} />
            </button>
          </>
        )}
      </div>
      {dialog && (
        <Modal
          title={
            dialog.kind === "settings"
              ? "Your space"
              : dialog.kind === "habit"
                ? dialog.habit
                  ? "Edit habit"
                  : "A new little habit"
                : dialog.habit.name
          }
          close={() => setDialog(null)}
        >
          {store.error && (
            <p role="alert" className="form-error modal-storage-error">
              {store.error}
            </p>
          )}
          {dialog.kind === "entry" && state && (
            <EntryForm
              habit={dialog.habit}
              entry={dialog.entry}
              date={date}
              state={state}
              commit={store.commit}
              close={() => setDialog(null)}
              saved={() => announce()}
            />
          )}
          {dialog.kind === "habit" && (
            <>
              <HabitForm
                habit={dialog.habit}
                date={date}
                commit={store.commit}
                close={() => {
                  setDialog(null);
                  announce("Habit saved.");
                }}
              />
              {dialog.habit && (
                <button
                  className="archive-button"
                  onClick={() => {
                    const id = dialog.habit!.id;
                    if (
                      store.commit((s) => ({
                        ...s!,
                        habits: s!.habits.map((h) =>
                          h.id === id ? { ...h, archived: true } : h,
                        ),
                      }))
                    ) {
                      setDialog(null);
                      announce("Archived. History kept.");
                    }
                  }}
                >
                  <Archive size={16} />
                  Archive habit (keep history)
                </button>
              )}
            </>
          )}
          {dialog.kind === "settings" && (
            <Settings store={store} sync={sync} pwa={pwa} />
          )}
        </Modal>
      )}
      {deleteId && (
        <Modal title="Delete this entry?" close={() => setDeleteId(null)}>
          <p className="muted">
            Only this entry is removed. Totals and charts update too. This can't
            be undone.
          </p>
          {store.error && (
            <p role="alert" className="form-error">
              {store.error}
            </p>
          )}
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setDeleteId(null)}
            >
              Keep it
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (
                  store.commit((s) => ({
                    ...s!,
                    entries: s!.entries.filter((e) => e.id !== deleteId),
                  }))
                ) {
                  setDeleteId(null);
                  announce("Entry deleted.");
                }
              }}
            >
              Delete entry
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
