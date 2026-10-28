import { useState, type FormEvent } from "react";
import { Check, Plus, Sprout, X } from "lucide-react";
import {
  changeGoal,
  dayInZone,
  fieldSchema,
  fieldValue,
  habitSchema,
  saveEntry,
  targetOn,
  timeInZone,
  trackingFields,
  type AppState,
  type Entry,
  type Habit,
  type TrackingField,
} from "./model";

export type Commit = (change: (state: AppState | null) => AppState) => boolean;
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

export function FieldEditor({
  fields,
  setFields,
  original,
}: {
  fields: TrackingField[];
  setFields: (fields: TrackingField[]) => void;
  original: Set<string>;
}) {
  function update(id: string, change: Partial<TrackingField>) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...change } : f)));
  }
  return (
    <section className="field-editor">
      <div className="section-top">
        <div>
          <h3>What do you want to record?</h3>
          <p className="field-hint">
            Only enabled fields appear when logging. Hide fields without losing
            old values.
          </p>
        </div>
      </div>
      {fields.map((f, index) => (
        <fieldset className="field-definition" key={f.id}>
          <legend>Field {index + 1}</legend>
          <div className="form-row">
            <label>
              Field name
              <input
                required
                maxLength={60}
                value={f.label}
                onChange={(e) => update(f.id, { label: e.target.value })}
              />
            </label>
            <label>
              Field type
              <select
                value={f.type}
                disabled={original.has(f.id)}
                onChange={(e) =>
                  update(f.id, {
                    type: e.target.value as TrackingField["type"],
                    options:
                      e.target.value === "choice"
                        ? ["Option 1", "Option 2"]
                        : [],
                  })
                }
              >
                <option value="number">Number</option>
                <option value="text">Text</option>
                <option value="url">Link</option>
                <option value="choice">Choice</option>
              </select>
            </label>
          </div>
          {f.type === "number" && (
            <div className="form-row">
              <label>
                Field unit
                <input
                  maxLength={20}
                  value={f.unit}
                  readOnly={original.has(f.id)}
                  onChange={(e) => update(f.id, { unit: e.target.value })}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={f.whole}
                  disabled={original.has(f.id)}
                  onChange={(e) => update(f.id, { whole: e.target.checked })}
                />
                Whole numbers
              </label>
            </div>
          )}
          {f.type === "choice" && (
            <label>
              Choices (one per line)
              <textarea
                required
                value={f.options.join("\n")}
                readOnly={original.has(f.id)}
                onChange={(e) =>
                  update(f.id, { options: e.target.value.split("\n") })
                }
              />
            </label>
          )}
          <div className="field-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={f.active}
                onChange={(e) => update(f.id, { active: e.target.checked })}
              />
              Show when logging
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => update(f.id, { required: e.target.checked })}
              />
              Required
            </label>
            {!original.has(f.id) && (
              <button
                type="button"
                className="text-button delete-action"
                onClick={() =>
                  setFields(fields.filter((item) => item.id !== f.id))
                }
              >
                Remove field
              </button>
            )}
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="button secondary wide"
        disabled={fields.length >= 30}
        onClick={() =>
          setFields([
            ...fields,
            fieldSchema.parse({
              id: crypto.randomUUID(),
              label: "New field",
              type: "number",
            }),
          ])
        }
      >
        <Plus size={16} />
        Add a field
      </button>
      {original.size > 0 && (
        <p className="field-hint">
          Existing field types, units, precision, and choice options stay fixed
          to keep historical values meaningful. Hide a field and add another to
          change its format.
        </p>
      )}
    </section>
  );
}
export function HabitForm({
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
  const [fields, setFields] = useState<TrackingField[]>(
    habit ? trackingFields(habit) : [],
  );
  const [error, setError] = useState("");
  function selectKind(kind: Habit["kind"]) {
    setKind(kind);
    setFields(kind === "leetcode" ? trackingFields({ kind }) : []);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const target = kind === "check" ? 1 : Number(text(form, "target"));
      let next = habitSchema.parse({
        id: habit?.id ?? crypto.randomUUID(),
        name: text(form, "name"),
        kind,
        unit:
          kind === "count"
            ? text(form, "unit")
            : kind === "leetcode"
              ? "problems"
              : kind === "lift"
                ? "sessions"
                : kind === "custom"
                  ? "entries"
                  : "",
        whole:
          kind !== "count" ||
          whole ||
          text(form, "unit").toLowerCase() === "steps",
        weightUnit: text(form, "weightUnit") || "lb",
        color: text(form, "color"),
        archived: habit?.archived ?? false,
        createdOn: habit?.createdOn ?? date,
        goals: habit?.goals ?? [{ from: "0001-01-01", target }],
        fields,
      });
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
    } catch (error) {
      setError(
        error instanceof Error && error.name !== "ZodError"
          ? error.message
          : "Check the fields and target. Choices must be nonempty and unique; targets must be positive.",
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
          placeholder="e.g. Strength training"
          defaultValue={habit?.name}
        />
      </label>
      <label>
        How will you track it?
        <select
          disabled={!!habit}
          value={kind}
          onChange={(e) => selectKind(e.target.value as Habit["kind"])}
        >
          <option value="check">Check it off</option>
          <option value="count">Simple counter - water, steps, pages</option>
          <option value="leetcode">LeetCode - customizable practice log</option>
          <option value="lift">Lifting - exercise, weight, reps & sets</option>
          <option value="custom">Custom log - choose your fields</option>
        </select>
      </label>
      {kind !== "check" && (
        <div className="form-row">
          <label>
            Daily target
            <input
              name="target"
              type="number"
              min={whole || kind !== "count" ? "1" : "0.001"}
              max="1000000000"
              step={whole || kind !== "count" ? "1" : "any"}
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
          />
          Whole numbers only (for example, steps)
        </label>
      )}
      {kind === "lift" && (
        <>
          <label>
            Weight unit
            <select
              name="weightUnit"
              defaultValue={habit?.weightUnit ?? "lb"}
              disabled={!!habit}
            >
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </label>
          {habit && (
            <input type="hidden" name="weightUnit" value={habit.weightUnit} />
          )}
          <p className="field-hint">
            Each log records one exercise with as many sets as you need. Weight
            and reps can differ per set. Use exercise filters in Growth to
            compare like with like.
          </p>
        </>
      )}
      <details className="habit-details" open={kind === "custom"}>
        <summary>
          Customize tracked fields ({fields.filter((f) => f.active).length})
        </summary>
        <FieldEditor
          fields={fields}
          setFields={setFields}
          original={
            new Set(habit ? trackingFields(habit).map((f) => f.id) : [])
          }
        />
      </details>
      <label>
        Color
        <select name="color" defaultValue={habit?.color ?? "sage"}>
          <option value="sage">Sage</option>
          <option value="blue">Blue</option>
          <option value="peach">Peach</option>
          <option value="lilac">Lilac</option>
        </select>
      </label>
      {habit && (
        <p className="field-hint">
          Target changes start on {date}. Hidden fields keep their historical
          values. New required fields apply only when saving an entry, not
          retroactively.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary wide" type="submit">
        <Sprout size={17} />
        {habit ? "Save habit" : "Plant a new habit"}
      </button>
    </form>
  );
}
export function EntryForm({
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
  const [sets, setSets] = useState(() =>
    (entry?.sets ?? [{ weight: 0, reps: 1 }]).map((s) => ({
      id: crypto.randomUUID(),
      weight: String(s.weight),
      reps: String(s.reps),
    })),
  );
  const fields = trackingFields(habit).filter((f) => f.active);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (text(form, "date") > dayInZone(state.timeZone)) {
      setError("Choose today or a day in the past.");
      return;
    }
    const metrics = { ...entry?.metrics };
    for (const field of fields) {
      const value = text(form, `metric-${field.id}`);
      if (value === "") delete metrics[field.id];
      else metrics[field.id] = field.type === "number" ? Number(value) : value;
    }
    const value: Entry = {
      ...entry,
      id: entry?.id ?? crypto.randomUUID(),
      habitId: habit.id,
      date: text(form, "date"),
      time: text(form, "time"),
      value: habit.kind === "count" ? Number(text(form, "value")) : 1,
      title: entry?.title ?? "",
      note:
        habit.kind === "leetcode" ? (entry?.note ?? "") : text(form, "note"),
      metrics,
      ...(habit.kind === "lift"
        ? {
            exercise: text(form, "exercise"),
            sets: sets.map((s) => ({
              weight: Number(s.weight),
              reps: Number(s.reps),
            })),
          }
        : {}),
    };
    // Keep the original fixed fields in step with the editable LeetCode template.
    for (const f of fields) {
      const v = metrics[f.id];
      if (f.id === "title" || f.id === "note")
        value[f.id] = typeof v === "string" ? v : "";
      if (f.id === "url")
        value.url = typeof v === "string" && v ? v : undefined;
      if (f.id === "duration")
        value.duration = typeof v === "number" ? v : undefined;
      if (f.id === "difficulty")
        value.difficulty =
          v === "easy" || v === "medium" || v === "hard" ? v : undefined;
    }
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
            required
          />
        </label>
      )}
      {habit.kind === "lift" && (
        <>
          <label>
            Exercise
            <input
              autoFocus
              name="exercise"
              required
              maxLength={120}
              placeholder="e.g. Bench press"
              defaultValue={entry?.exercise}
            />
          </label>
          <div className="set-editor">
            <div className="set-heading">
              <span>Set</span>
              <span>Weight ({habit.weightUnit})</span>
              <span>Reps</span>
              <span />
            </div>
            {sets.map((set, index) => (
              <div className="set-line" key={set.id}>
                <span>{index + 1}</span>
                <input
                  aria-label={`Set ${index + 1} weight (${habit.weightUnit})`}
                  type="number"
                  min="0"
                  max="1000000000"
                  step="any"
                  required
                  value={set.weight}
                  onChange={(e) =>
                    setSets(
                      sets.map((s) =>
                        s.id === set.id ? { ...s, weight: e.target.value } : s,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Set ${index + 1} reps`}
                  type="number"
                  min="1"
                  max="1000000000"
                  step="1"
                  required
                  value={set.reps}
                  onChange={(e) =>
                    setSets(
                      sets.map((s) =>
                        s.id === set.id ? { ...s, reps: e.target.value } : s,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  disabled={sets.length === 1}
                  aria-label={`Remove set ${index + 1}`}
                  onClick={() => setSets(sets.filter((s) => s.id !== set.id))}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={sets.length >= 100}
              onClick={() =>
                setSets([
                  ...sets,
                  { ...sets[sets.length - 1], id: crypto.randomUUID() },
                ])
              }
            >
              <Plus size={15} />
              Add set
            </button>
          </div>
        </>
      )}
      {fields.map((field) => (
        <label key={field.id}>
          {field.label}
          {field.unit ? ` (${field.unit})` : ""}
          {!field.required && <span className="optional">optional</span>}
          {field.type === "choice" ? (
            <select
              name={`metric-${field.id}`}
              required={field.required}
              defaultValue={entry ? (fieldValue(entry, field.id) ?? "") : ""}
            >
              <option value="">Choose...</option>
              {field.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : field.type === "text" ? (
            <textarea
              name={`metric-${field.id}`}
              rows={field.id === "title" ? 1 : 2}
              required={field.required}
              maxLength={5000}
              defaultValue={entry ? fieldValue(entry, field.id) : ""}
            />
          ) : (
            <input
              name={`metric-${field.id}`}
              type={field.type === "url" ? "url" : "number"}
              pattern={field.type === "url" ? "https?://.+" : undefined}
              min={field.type === "number" ? "0" : undefined}
              max={field.type === "number" ? "1000000000" : undefined}
              step={field.whole ? "1" : "any"}
              required={field.required}
              defaultValue={entry ? fieldValue(entry, field.id) : ""}
            />
          )}
        </label>
      ))}
      <details className="entry-details" open={!!entry}>
        <summary>
          Date, time{habit.kind !== "leetcode" ? " & note" : ""}
        </summary>
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
        <p className="field-hint">{state.timeZone}</p>
        {habit.kind !== "leetcode" && (
          <label>
            Note <span className="optional">optional</span>
            <textarea
              name="note"
              rows={2}
              maxLength={5000}
              defaultValue={entry?.note}
            />
          </label>
        )}
      </details>
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
