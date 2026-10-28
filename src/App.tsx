import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Code2,
  Download,
  Droplets,
  Footprints,
  Heart,
  Leaf,
  MoreHorizontal,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Upload,
  X,
} from "lucide-react";
import {
  changeGoal,
  dateLabel,
  dayInZone,
  habitSchema,
  parseBackup,
  progress,
  saveEntry,
  shiftDay,
  targetOn,
  timeInZone,
  type AppState,
  type Entry,
  type Habit,
} from "./model";
import { useStore } from "./useStore";
import { usePwa } from "./usePwa";

type Commit = (change: (state: AppState | null) => AppState) => boolean;
type Dialog =
  | { kind: "entry"; habit: Habit; entry?: Entry }
  | { kind: "habit"; habit?: Habit }
  | { kind: "backup" }
  | null;
const icons = { check: Heart, count: Droplets, leetcode: Code2 };
const fmt = (n: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
function habitIcon(habit: Habit) {
  return habit.unit === "steps" ? Footprints : icons[habit.kind];
}
function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
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
function Garden({ complete }: { complete: boolean }) {
  return (
    <svg
      className={`garden ${complete ? "bloom" : ""}`}
      viewBox="0 0 360 210"
      role="img"
      aria-label="A little garden growing at its own pace"
    >
      <defs>
        <linearGradient id="sun" x2="0" y2="1">
          <stop stopColor="#f4d18c" />
          <stop offset="1" stopColor="#eab86c" />
        </linearGradient>
      </defs>
      <g className="garden-sun">
        <circle cx="266" cy="58" r="31" fill="url(#sun)" />
        <path
          d="M253 61q4 5 8 0m8 0q4 5 8 0"
          fill="none"
          stroke="#997d42"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <g className="cloud" fill="#fffdf5" opacity=".8">
        <rect x="57" y="46" width="72" height="19" rx="10" />
        <circle cx="88" cy="45" r="17" />
        <circle cx="107" cy="48" r="12" />
      </g>
      <path d="M22 179q60-26 113-7t106-4 101 9v33H22Z" fill="#d4dfc6" />
      <path d="M0 197q81-32 174-10t186-2v25H0Z" fill="#b9c9a7" />
      <g className="plant tall">
        <path
          d="M184 184q-9-53 2-103"
          fill="none"
          stroke="#597256"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M183 139q-54-4-46-45 44-1 46 45" fill="#88a079" />
        <path d="M184 114q0-49 42-49 9 44-42 49" fill="#597256" />
        <path d="M180 169q-42-5-42-31 34-7 42 31" fill="#597256" />
      </g>
      <g className="plant small">
        <path d="M96 191v-45" stroke="#73916a" strokeWidth="4" />
        <path
          d="M96 169q-37 0-33-30 30 1 33 30m1-12q0-36 29-34 2 28-29 34"
          fill="#91aa7f"
        />
      </g>
      <g className="flower">
        <path d="M276 191v-47" stroke="#7f936e" strokeWidth="3" />
        <g fill="#e1ae94">
          <circle cx="276" cy="135" r="10" />
          <circle cx="266" cy="144" r="10" />
          <circle cx="286" cy="144" r="10" />
          <circle cx="270" cy="155" r="10" />
          <circle cx="282" cy="155" r="10" />
        </g>
        <circle cx="276" cy="146" r="8" fill="#f3d695" />
      </g>
      <g className="butterfly">
        <path
          d="M315 99q-22-21-19-3 3 12 19 3m0 0q20-18 17-2-3 11-17 2"
          fill="#c6b6d6"
        />
        <path d="m314 95 2 9" stroke="#806c91" strokeWidth="2" />
      </g>
      <path d="m44 115 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="#dbba75" />
    </svg>
  );
}
function Modal({
  title,
  eyebrow,
  children,
  close,
}: {
  title: string;
  eyebrow: string;
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
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="modal-title">{title}</h2>
        </div>
        <button className="icon-btn" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function EntryForm({
  habit,
  entry,
  date,
  state,
  commit,
  close,
  saved,
}: {
  habit: Habit;
  entry?: Entry;
  date: string;
  state: AppState;
  commit: Commit;
  close: () => void;
  saved: () => void;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const day = field(form, "date");
    if (day > dayInZone(state.timeZone)) {
      setError("Let's record today or a day in the past.");
      return;
    }
    const amount = habit.kind === "count" ? Number(field(form, "value")) : 1;
    const value: Entry = {
      id: entry?.id ?? crypto.randomUUID(),
      habitId: habit.id,
      date: day,
      time: field(form, "time"),
      value: amount,
      title: field(form, "title"),
      note: field(form, "note"),
      ...(habit.kind === "leetcode"
        ? {
            difficulty: field(form, "difficulty") as Entry["difficulty"],
            url: field(form, "url"),
            ...(field(form, "duration")
              ? { duration: Number(field(form, "duration")) }
              : {}),
          }
        : {}),
    };
    if (commit((s) => saveEntry(s!, value))) {
      saved();
      close();
    } else
      setError(
        "Couldn't save. Check the values and the storage message. Your input is still here.",
      );
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <p className="muted">
        {habit.kind === "leetcode"
          ? "A place for the problem, the process, and the little things you learned."
          : "Every little bit counts. Record what you did, not what you wish you did."}
      </p>
      {habit.kind === "count" && (
        <label>
          Amount ({habit.unit})
          <input
            autoFocus
            name="value"
            type="number"
            min="0"
            max="1000000000"
            step={habit.whole ? "1" : "any"}
            defaultValue={entry?.value ?? ""}
            placeholder={habit.unit === "steps" ? "e.g. 1500" : "e.g. 1"}
            required
          />
        </label>
      )}
      {habit.kind === "leetcode" && (
        <>
          <label>
            Problem title <span className="optional">optional</span>
            <input
              autoFocus
              name="title"
              maxLength={120}
              placeholder="e.g. Two Sum"
              defaultValue={entry?.title}
            />
          </label>
          <label>
            Problem link
            <input
              name="url"
              type="url"
              maxLength={2000}
              pattern="https?://.+"
              placeholder="https://leetcode.com/problems/..."
              defaultValue={entry?.url}
              required
            />
          </label>
          <div className="form-row">
            <label>
              Difficulty
              <select
                name="difficulty"
                defaultValue={entry?.difficulty ?? "easy"}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label>
              Minutes <span className="optional">optional</span>
              <input
                name="duration"
                type="number"
                min="0"
                max="1000000000"
                step="any"
                placeholder="25"
                defaultValue={entry?.duration}
              />
            </label>
          </div>
        </>
      )}
      <div className="form-row">
        <label>
          Date
          <input
            name="date"
            type="date"
            required
            max={dayInZone(state.timeZone)}
            defaultValue={entry?.date ?? date}
          />
        </label>
        <label>
          Time
          <input
            name="time"
            type="time"
            required
            defaultValue={entry?.time ?? timeInZone(state.timeZone)}
          />
        </label>
      </div>
      <p className="field-hint">
        Reporting time zone: {state.timeZone}. Dates stay where you put them.
      </p>
      <label>
        {habit.kind === "leetcode" ? "What did you learn?" : "A little note"}{" "}
        <span className="optional">optional</span>
        <textarea
          name="note"
          maxLength={5000}
          rows={3}
          placeholder={
            habit.kind === "leetcode"
              ? "An approach, a tricky edge case, a small breakthrough..."
              : "How did it feel?"
          }
          defaultValue={entry?.note}
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary wide" type="submit">
        <Check size={17} />
        {entry ? "Save changes" : "Save this little win"}
      </button>
    </form>
  );
}
function HabitForm({
  habit,
  date,
  commit,
  close,
}: {
  habit?: Habit;
  date: string;
  commit: Commit;
  close: () => void;
}) {
  const [kind, setKind] = useState<Habit["kind"]>(habit?.kind ?? "check");
  const [whole, setWhole] = useState(habit?.whole ?? false);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const target = kind === "check" ? 1 : Number(field(form, "target"));
      let next = habitSchema.parse({
        id: habit?.id ?? crypto.randomUUID(),
        name: field(form, "name"),
        kind,
        unit:
          kind === "count"
            ? field(form, "unit")
            : kind === "leetcode"
              ? "problems"
              : "",
        whole:
          kind !== "count" ||
          whole ||
          field(form, "unit").toLowerCase() === "steps",
        color: field(form, "color"),
        archived: habit?.archived ?? false,
        createdOn: habit?.createdOn ?? date,
        goals: habit?.goals ?? [{ from: "0001-01-01", target }],
      });
      if (kind === "count" && !next.unit) {
        setError("Give your count a unit, like cups, steps, or pages.");
        return;
      }
      if (habit) next = changeGoal(next, date, target);
      if (
        commit((s) => ({
          ...s!,
          habits: habit
            ? s!.habits.map((h) => (h.id === habit.id ? next : h))
            : [...s!.habits, next],
        }))
      )
        close();
      else setError("Couldn't save. Check the storage message and try again.");
    } catch {
      setError(
        "Check your fields. Targets must be positive; whole-number habits need whole-number targets.",
      );
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <label>
        What would you like to grow?
        <input
          autoFocus
          name="name"
          required
          maxLength={60}
          placeholder="e.g. Read a few pages"
          defaultValue={habit?.name}
        />
      </label>
      <label>
        How will you track it?
        <select
          disabled={!!habit}
          value={kind}
          onChange={(e) => setKind(e.target.value as Habit["kind"])}
        >
          <option value="check">Check it off - a simple daily ritual</option>
          <option value="count">Count it - water, steps, pages...</option>
          <option value="leetcode">Log it - LeetCode practice</option>
        </select>
      </label>
      {habit && (
        <p className="field-hint">
          Tracking type stays fixed to protect your history. Create a new habit
          for a different type.
        </p>
      )}
      {kind !== "check" && (
        <div className="form-row">
          <label>
            Daily target
            <input
              name="target"
              type="number"
              min={whole || kind === "leetcode" ? "1" : "0.001"}
              max="1000000000"
              step={whole || kind === "leetcode" ? "1" : "any"}
              required
              defaultValue={habit ? targetOn(habit, date) : 1}
            />
          </label>
          {kind === "count" && (
            <label>
              Unit
              <input
                name="unit"
                maxLength={20}
                required
                defaultValue={habit?.unit ?? ""}
                placeholder="cups, steps, pages"
                readOnly={!!habit}
              />
            </label>
          )}
        </div>
      )}
      {kind === "count" && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={whole}
            disabled={!!habit}
            onChange={(e) => setWhole(e.target.checked)}
          />{" "}
          Whole numbers only (for example, steps)
        </label>
      )}
      <label>
        Pick a little color
        <select name="color" defaultValue={habit?.color ?? "sage"}>
          <option value="sage">Sage garden</option>
          <option value="blue">Blue skies</option>
          <option value="peach">Peach sunrise</option>
          <option value="lilac">Lilac daydream</option>
        </select>
      </label>
      {habit && (
        <p className="callout">
          Target changes start on {dateLabel(date)}. Earlier targets and entries
          stay untouched. Units and number precision stay fixed.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary wide" type="submit">
        <Sprout size={18} />
        {habit ? "Save habit" : "Plant a new habit"}
      </button>
    </form>
  );
}
function BackupForm({
  state,
  raw,
  commit,
  pwa,
}: {
  state: AppState | null;
  raw: string | null;
  commit: Commit;
  pwa: ReturnType<typeof usePwa>;
}) {
  const [incoming, setIncoming] = useState<AppState | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  return (
    <div className="form-stack">
      <div className="privacy-card">
        <ShieldCheck size={25} />
        <div>
          <strong>Yours, and only yours.</strong>
          <p>
            No account. No analytics. Your habits stay in this browser on this
            device.
          </p>
        </div>
      </div>
      <p className="muted">
        Clearing browser data or switching browsers can remove your space.
        Export a backup regularly, especially before changing devices.
      </p>
      <button
        className="button secondary wide"
        disabled={!raw}
        onClick={() => {
          download(
            raw!,
            `little-by-little-${new Date().toISOString().slice(0, 10)}.json`,
          );
          setSuccess("Backup downloaded. Keep it somewhere safe.");
        }}
      >
        <Download size={18} />
        Export {state ? "a backup" : "original data for recovery"}
      </button>
      <label className="upload-zone">
        <Upload size={23} />
        <strong>Restore a backup</strong>
        <span>Choose a Little by Little JSON file (up to 20 MB)</span>
        <input
          type="file"
          accept=".json,application/json"
          aria-label="Choose backup file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            setIncoming(null);
            setError("");
            setSuccess("");
            if (!file) return;
            try {
              if (file.size > 20_000_000)
                throw new Error("Please choose a file smaller than 20 MB.");
              setIncoming(parseBackup(await file.text()));
            } catch {
              setError(
                "This backup couldn't be read. Choose a valid Little by Little JSON backup under 20 MB. Nothing has been replaced.",
              );
            }
            event.target.value = "";
          }}
        />
      </label>
      {incoming && (
        <div className="callout">
          <strong>Replace this device's data?</strong>
          <p>
            This backup contains {incoming.habits.length} habits and{" "}
            {incoming.entries.length} entries. This replaces, not merges, your
            current space. Export first if you want to keep it.
          </p>
          <div className="button-row">
            <button
              className="button danger"
              onClick={() => {
                if (commit(() => incoming)) {
                  setIncoming(null);
                  setSuccess("Your backup is restored.");
                } else
                  setError(
                    "Restore failed. Existing data was not replaced. Check the storage message.",
                  );
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
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="success-text">
          {success}
        </p>
      )}
      <div className="divider" />
      <h3>A space of its own</h3>
      <p className="muted">
        Keep Little by Little out of your tabs. Install it to open in a separate
        window from your Dock or home screen.
      </p>
      {pwa.canInstall ? (
        <button
          className="button primary"
          onClick={() => void pwa.installApp()}
        >
          <ArrowDownToLine size={17} />
          Install app
        </button>
      ) : (
        <div className="callout">
          <strong>Install from your browser</strong>
          <p>
            Chrome / Edge: use the install icon in the address bar or the app
            installation menu. Safari on Mac: File &gt; Add to Dock. On iPhone:
            Share &gt; Add to Home Screen. Menu names vary by browser.
          </p>
        </div>
      )}
      <p className="field-hint">
        {pwa.offlineReady
          ? "Offline shell ready. You can reopen this device's app without a connection."
          : import.meta.env.DEV
            ? "Offline installation is available in the production build, not development mode."
            : "Offline support is preparing; keep this window open for the first load."}
      </p>
      {pwa.error && (
        <p role="alert" className="form-error">
          {pwa.error}
        </p>
      )}
      {state && (
        <p className="field-hint">
          Reporting time zone: {state.timeZone}. This is fixed when your space
          is first created and travels with your backup.
        </p>
      )}
    </div>
  );
}
function HabitCard({
  habit,
  state,
  date,
  record,
  edit,
  toggle,
}: {
  habit: Habit;
  state: AppState;
  date: string;
  record: () => void;
  edit: () => void;
  toggle: () => void;
}) {
  const p = progress(state, habit, date);
  const Icon = habitIcon(habit);
  const ratio = Math.min(1, p.value / p.target);
  return (
    <article
      className={`habit-card ${habit.color} ${p.done ? "is-done" : ""}`}
      style={{ "--fill": `${ratio * 100}%` } as CSSProperties}
    >
      <div className="card-top">
        <span className="habit-icon">
          <Icon size={22} strokeWidth={1.7} />
        </span>
        <span className="habit-type">
          {habit.kind === "leetcode"
            ? "MIND"
            : habit.kind === "check"
              ? "SELF-CARE"
              : habit.unit === "steps"
                ? "MOVEMENT"
                : "DAILY RITUAL"}
        </span>
        <button
          className="icon-btn"
          aria-label={`Edit ${habit.name}`}
          onClick={edit}
        >
          <MoreHorizontal size={21} />
        </button>
      </div>
      <h3>{habit.name}</h3>
      <p className="card-description">
        {habit.kind === "leetcode"
          ? "One problem. A fresh perspective."
          : habit.kind === "check"
            ? "A pause is productive, too."
            : habit.unit === "steps"
              ? "A little further, at your own pace."
              : "Make a little room for feeling good."}
      </p>
      <div className="card-progress">
        {habit.kind === "check" ? (
          <button
            className={`ritual-check ${p.done ? "checked" : ""}`}
            onClick={toggle}
            aria-label={`${p.done ? "Uncheck" : "Complete"} ${habit.name}`}
            aria-pressed={p.done}
          >
            {p.done ? <Check size={26} /> : <Heart size={25} />}
          </button>
        ) : (
          <div className="progress-number">
            <strong key={p.value}>{fmt(p.value)}</strong>
            <span>
              / {fmt(p.target)} {habit.unit}
            </span>
          </div>
        )}
        {habit.kind === "count" && habit.unit !== "steps" ? (
          <div className="water-glass" aria-hidden="true">
            <div className="water-fill" />
            <span />
            <span />
          </div>
        ) : habit.kind === "leetcode" ? (
          <div className="code-doodle" aria-hidden="true">
            <span>&lt;</span>
            <i>/</i>
            <span>&gt;</span>
            <b>+</b>
          </div>
        ) : habit.unit === "steps" ? (
          <div className="step-doodle" aria-hidden="true">
            <Footprints size={48} strokeWidth={1.2} />
            <span>+ one step</span>
          </div>
        ) : (
          <div className="breathing-dot" aria-hidden="true">
            <span />
          </div>
        )}
      </div>
      <div className="progress-track">
        <div style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="card-bottom">
        <span className={p.done ? "done-text" : ""}>
          {p.done ? (
            <>
              <Check size={13} /> Daily intention met
            </>
          ) : p.recorded ? (
            "A lovely little start"
          ) : (
            "A fresh little start"
          )}
        </span>
        {habit.kind !== "check" && (
          <button className="small-action" onClick={record}>
            <Plus size={15} />
            {habit.kind === "leetcode" ? "Log problem" : "Add progress"}
          </button>
        )}
        {habit.kind === "check" && (
          <span className="field-hint">Tap the heart</span>
        )}
      </div>
    </article>
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
  const habit = state.habits.find((h) => h.id === habitId) ?? state.habits[0];
  if (!habit)
    return <p className="empty-state">Plant a habit to see its story here.</p>;
  const from =
    range === "custom" ? start : shiftDay(date, -(Number(range) - 1));
  const to = range === "custom" ? end : date;
  const valid = from && to && from <= to && shiftDay(from, 365) >= to;
  const days: string[] = [];
  if (valid) for (let d = from; d <= to; d = shiftDay(d, 1)) days.push(d);
  const points = days.map((d) => ({ date: d, ...progress(state, habit, d) }));
  const maximum = Math.max(1, ...points.flatMap((p) => [p.value, p.target]));
  const recorded = points.filter((p) => p.recorded);
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const problems = state.entries.filter(
    (e) => e.habitId === habit.id && e.date >= from && e.date <= to,
  );
  const durationEntries = problems.filter((e) => e.duration !== undefined);
  return (
    <section className="insight-panel panel">
      <div className="section-top">
        <div>
          <p className="eyebrow">THE BIGGER PICTURE</p>
          <h2>Look how you're growing.</h2>
        </div>
        <span className="round-icon">
          <BarChart3 size={22} />
        </span>
      </div>
      <div className="chart-controls">
        <label>
          Habit
          <select value={habit.id} onChange={(e) => setHabitId(e.target.value)}>
            {state.habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.archived ? " (archived)" : ""}
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
                {habit.kind === "check" ? "check-ins" : habit.unit} recorded
              </span>
            </div>
            <div>
              <strong>
                {points.filter((p) => p.done).length}
                <small> / {days.length}</small>
              </strong>
              <span>days reaching your target</span>
            </div>
            <div>
              <strong>{recorded.length}</strong>
              <span>days with a record</span>
            </div>
          </div>
          <div
            className={`bar-chart ${habit.color}`}
            role="img"
            aria-label={`${habit.name}, ${dateLabel(from)} to ${dateLabel(to)}. ${fmt(total)} ${habit.unit || "check-ins"} recorded. Detailed values in the table below.`}
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
                  <span
                    className="target-marker"
                    style={{ bottom: `${(p.target / maximum) * 90}%` }}
                  />
                  <div
                    className={`bar ${!p.recorded ? "missing" : ""}`}
                    style={{
                      height: `${Math.max(p.recorded ? 2 : 0, (p.value / maximum) * 90)}%`,
                    }}
                    title={`${p.date}: ${p.recorded ? fmt(p.value) : "not recorded"}; target ${p.target}`}
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
              <i />
              Recorded progress
            </span>
            <span>
              <i className="target-key" />
              Daily target
            </span>
            <span>Blank = not recorded</span>
          </div>
          {recorded.length === 0 && (
            <p className="empty-state compact">
              Your story starts with the first entry. No pretend progress here.
            </p>
          )}
          {habit.kind === "leetcode" && (
            <div className="difficulty-summary">
              {(["easy", "medium", "hard"] as const).map((level) => (
                <span className={`difficulty ${level}`} key={level}>
                  {level}:{" "}
                  {problems.filter((e) => e.difficulty === level).length}
                </span>
              ))}
              {durationEntries.length > 0 && (
                <span>
                  {fmt(
                    durationEntries.reduce((sum, e) => sum + e.duration!, 0),
                  )}{" "}
                  minutes across {durationEntries.length} timed entries
                </span>
              )}
            </div>
          )}
          <details className="data-details">
            <summary>See daily numbers</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{habit.unit || "Check-ins"}</th>
                    <th>Target</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.date}>
                      <td>{p.date}</td>
                      <td>{p.recorded ? fmt(p.value) : "Not recorded"}</td>
                      <td>{fmt(p.target)}</td>
                      <td>
                        {p.done
                          ? "Met"
                          : p.recorded
                            ? "Below target"
                            : "No record"}
                      </td>
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
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const today = dayInZone(state?.timeZone ?? "UTC", new Date(clock));
  const active = state?.habits.filter((h) => !h.archived) ?? [];
  const done = state
    ? active.filter((h) => progress(state, h, date).done).length
    : 0;
  const entries =
    state?.entries
      .filter(
        (e) => e.date === date && (filter === "all" || e.habitId === filter),
      )
      .sort((a, b) => b.time.localeCompare(a.time)) ?? [];
  function announce(text = "A little win, saved.") {
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
            }),
      )
    )
      announce(
        p.done
          ? "Check-in undone. There's room to begin again."
          : "A moment for you. Nicely done.",
      );
  }
  const entryList = (
    <div className="entry-list">
      {entries.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={29} />
          <h3>A fresh page.</h3>
          <p>
            Your entries for {date === today ? "today" : dateLabel(date)} will
            settle in here.
            <br />
            Start small. That's the whole idea.
          </p>
        </div>
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
                      {habit.kind === "check"
                        ? habit.name
                        : `${fmt(entry.value)} ${habit.unit}`}
                    </strong>
                  )}
                  {entry.difficulty && (
                    <span className={`difficulty ${entry.difficulty}`}>
                      {entry.difficulty}
                    </span>
                  )}
                </div>
                <p className="entry-meta">
                  {habit.name} <span>&middot;</span> {entry.time}
                  {entry.duration !== undefined && (
                    <>
                      {" "}
                      <span>&middot;</span> {fmt(entry.duration)} min
                    </>
                  )}
                  {habit.archived && " (archived)"}
                </p>
                {entry.note && <p className="entry-note">{entry.note}</p>}
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
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
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
        <p className="nav-label">YOUR LITTLE SPACE</p>
        <nav aria-label="Main navigation">
          <button
            className={page === "today" ? "active" : ""}
            onClick={() => setPage("today")}
          >
            <Sun size={20} />
            My day
            <span className="nav-dot" />
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
        <div className="sidebar-note">
          <div className="note-leaves">
            <Leaf size={31} />
            <Sparkles size={16} />
          </div>
          <p>
            You don't have to
            <br />
            do it all.
            <br />
            <em>Just a little, today.</em>
          </p>
          <span>ONE DAY AT A TIME</span>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setDialog({ kind: "backup" })}>
            <Settings2 size={18} />
            Your space & backups
          </button>
          <div className="local-badge">
            <span />
            Private & local
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Your space <span>/</span>{" "}
            <strong>
              {page === "today"
                ? "My day"
                : page === "insights"
                  ? "Growth"
                  : "Little journal"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="gentle-tag">
              <Leaf size={13} />A little better, gently.
            </span>
            <button
              className="icon-btn"
              aria-label="Settings and backups"
              onClick={() => setDialog({ kind: "backup" })}
            >
              <Settings2 size={20} />
            </button>
            <span className="avatar" aria-label="Your personal space">
              you
            </span>
          </div>
        </header>
        <div className="main-content">
          {store.error && (
            <div className="error-banner" role="alert">
              {store.error}
              <button
                className="text-button"
                onClick={() => setDialog({ kind: "backup" })}
              >
                Open recovery & backups
              </button>
            </div>
          )}
          {pwa.error && (
            <div className="error-banner" role="alert">
              {pwa.error}
            </div>
          )}
          {pwa.waiting && (
            <div className="update-banner">
              <Sparkles size={17} />A fresh version is ready. Save open forms
              before updating.
              <button className="text-button" onClick={pwa.update}>
                Update app
              </button>
            </div>
          )}
          {!state ? (
            <section className="panel recovery">
              <ShieldCheck size={36} />
              <h1>Let's protect your space.</h1>
              <p>
                We couldn't read your local data. Nothing has been reset. You
                can download the original data or restore a known-good backup.
              </p>
              <div className="button-row">
                <button
                  className="button primary"
                  onClick={() => setDialog({ kind: "backup" })}
                >
                  Recovery & backups
                </button>
                <button
                  className="button secondary"
                  onClick={() => location.reload()}
                >
                  Retry loading
                </button>
              </div>
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
                      year: "numeric",
                    }).toUpperCase()}
                  </p>
                  <h1>
                    {page === "today" ? (
                      <>
                        A little progress.
                        <br className="mobile-break" /> A lovely day.
                      </>
                    ) : page === "insights" ? (
                      "Small steps. Real growth."
                    ) : (
                      "Every little thing adds up."
                    )}
                  </h1>
                  <p>
                    {page === "today"
                      ? "No rush. No perfect streaks. Just showing up for yourself."
                      : page === "insights"
                        ? "A wider view of the things you're making time for."
                        : "The practice, the pauses, and everything in between."}
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setDialog({ kind: "habit" })}
                >
                  <Plus size={17} />
                  New habit
                </button>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-pill">
                    <Sparkles size={13} />
                    LITTLE STEPS, GOOD THINGS
                  </span>
                  <h2>
                    {active.length > 0 && done === active.length
                      ? "Look at you, growing."
                      : "Good things take a little tending."}
                  </h2>
                  <p>
                    {done === active.length && active.length
                      ? "Today's intentions are met. Take a breath and enjoy your little wins."
                      : "A sip of water. A problem solved. A moment to breathe. It all counts."}
                  </p>
                  <div className="hero-progress">
                    <span
                      className="mini-ring"
                      style={
                        {
                          "--progress": `${active.length ? (done / active.length) * 100 : 0}%`,
                        } as CSSProperties
                      }
                    >
                      <Sprout size={16} />
                    </span>
                    <strong>
                      {done} of {active.length} daily intentions met
                    </strong>
                    <span className="hero-progress-note">
                      {done
                        ? "You're making room for you."
                        : "Your next little win is waiting."}
                    </span>
                  </div>
                </div>
                <Garden
                  complete={active.length > 0 && done === active.length}
                />
              </section>
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
                <span className="date-note">
                  {state.timeZone.replaceAll("_", " ")}
                  <span className="tiny-dot" />
                  Your own pace
                </span>
              </div>
              {page === "today" && (
                <>
                  <section aria-labelledby="habits-heading">
                    <div className="section-top habits-heading">
                      <div className="section-title">
                        <h2 id="habits-heading">Your daily little things</h2>
                        <span className="count-pill">{active.length}</span>
                      </div>
                      <span className="section-note">
                        A little consistency goes a long way.
                      </span>
                    </div>
                    <div className="habits-grid">
                      {active.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          state={state}
                          date={date}
                          record={() => setDialog({ kind: "entry", habit })}
                          edit={() => setDialog({ kind: "habit", habit })}
                          toggle={() => toggle(habit)}
                        />
                      ))}
                    </div>
                    {active.length === 0 && (
                      <div className="empty-state panel">
                        <Sprout size={32} />
                        <h3>Room for something good.</h3>
                        <p>Plant your first habit. You can keep it small.</p>
                        <button
                          className="button primary"
                          onClick={() => setDialog({ kind: "habit" })}
                        >
                          <Plus size={16} />
                          New habit
                        </button>
                      </div>
                    )}
                  </section>
                  <div className="bottom-grid">
                    <section className="panel">
                      <div className="section-top">
                        <div>
                          <p className="eyebrow">THE LITTLE WINS</p>
                          <h2>
                            {date === today
                              ? "Today's pages"
                              : "The day's pages"}
                          </h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setPage("journal")}
                        >
                          View journal <ArrowRight size={15} />
                        </button>
                      </div>
                      {entryList}
                    </section>
                    <section className="gentle-card">
                      <span className="round-icon">
                        <Sun size={23} />
                      </span>
                      <p className="eyebrow">A GENTLE REMINDER</p>
                      <h2>
                        Progress isn't
                        <br />
                        always loud.
                      </h2>
                      <p>
                        Sometimes it's just choosing to try again. That counts,
                        too.
                      </p>
                      <div className="gentle-line" />
                      <span>GROW AT YOUR OWN PACE</span>
                      <Leaf
                        className="gentle-leaf"
                        size={82}
                        strokeWidth={0.8}
                      />
                    </section>
                  </div>
                </>
              )}
              {page === "insights" && <Insights state={state} date={date} />}
              {page === "journal" && (
                <section className="panel">
                  <div className="section-top">
                    <div>
                      <p className="eyebrow">ONE DAY, MANY SMALL MOMENTS</p>
                      <h2>Your little journal</h2>
                    </div>
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
                      .map((habit) => (
                        <div key={habit.id}>
                          <span>{habit.name}</span>
                          <button
                            className="text-button"
                            onClick={() => {
                              if (
                                store.commit((s) => ({
                                  ...s!,
                                  habits: s!.habits.map((h) =>
                                    h.id === habit.id
                                      ? { ...h, archived: false }
                                      : h,
                                  ),
                                }))
                              )
                                announce("Habit restored to your day.");
                            }}
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    <p className="field-hint">
                      Archived history is always available in Growth and Little
                      journal.
                    </p>
                  </div>
                )}
              </section>
              <footer className="page-footer">
                <span>
                  <Sprout size={14} />
                  Little by little is still a lot.
                </span>
                <button
                  className="text-button"
                  onClick={() => setDialog({ kind: "backup" })}
                >
                  <ShieldCheck size={13} />
                  Saved on this device. Back it up.
                </button>
              </footer>
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
            dialog.kind === "entry"
              ? dialog.entry
                ? "A little edit"
                : dialog.habit.kind === "leetcode"
                  ? "A little brain stretch"
                  : "A little more progress"
              : dialog.kind === "habit"
                ? dialog.habit
                  ? "Tend to your habit"
                  : "Something good starts small."
                : "Make yourself at home."
          }
          eyebrow={
            dialog.kind === "entry"
              ? dialog.habit.name
              : dialog.kind === "habit"
                ? "YOUR DAILY INTENTIONS"
                : "YOUR SPACE"
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
                  announce("Your habit has a little room to grow.");
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
                      announce("Habit archived. Its history stays with you.");
                    }
                  }}
                >
                  <Archive size={16} />
                  Archive habit (keep history)
                </button>
              )}
            </>
          )}
          {dialog.kind === "backup" && (
            <BackupForm
              state={state}
              raw={store.raw}
              commit={store.commit}
              pwa={pwa}
            />
          )}
        </Modal>
      )}
      {deleteId && (
        <Modal
          title="Let this entry go?"
          eyebrow="A LITTLE CLEANUP"
          close={() => setDeleteId(null)}
        >
          <p className="muted">
            This removes only this entry and updates its totals and graphs. This
            can't be undone.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setDeleteId(null)}
            >
              <ArrowLeft size={16} />
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
                  announce("Entry removed. Your history is up to date.");
                }
              }}
            >
              Delete entry
            </button>
          </div>
        </Modal>
      )}
      <button
        className="help-button"
        aria-label="Installation help and backups"
        onClick={() => setDialog({ kind: "backup" })}
      >
        <CircleHelp size={20} />
      </button>
    </div>
  );
}
