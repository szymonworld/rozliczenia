import { useState } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

const sectionTitle = "mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted";

const gradient = {
  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
  boxShadow: "var(--shadow-lift)",
};

const MIN_PEOPLE = 2;

/**
 * Name plus a roster of people. Shared by the in-app "new event" screen and
 * the admin console, so a group looks the same however it was created.
 */
export function GroupForm({
  busy,
  submitLabel,
  busyLabel = "Tworzenie…",
  namePlaceholder = "np. Kawalerski Sławka",
  onSubmit,
}: {
  busy: boolean;
  submitLabel: string;
  busyLabel?: string;
  namePlaceholder?: string;
  onSubmit: (name: string, memberNames: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [people, setPeople] = useState<string[]>(["", ""]);

  const filled = people.map((p) => p.trim()).filter(Boolean);
  // Duplicate names would produce two avatars nobody can tell apart.
  const duplicate = new Set(filled.map((p) => p.toLowerCase())).size !== filled.length;
  const canSubmit = Boolean(name.trim()) && filled.length >= MIN_PEOPLE && !duplicate && !busy;

  const setPerson = (index: number, value: string) =>
    setPeople((prev) => prev.map((p, i) => (i === index ? value : p)));

  const removePerson = (index: number) =>
    setPeople((prev) => (prev.length <= MIN_PEOPLE ? prev : prev.filter((_, i) => i !== index)));

  const addPerson = () => setPeople((prev) => [...prev, ""]);

  return (
    <>
      <section>
        <label htmlFor="group-name" className={`block ${sectionTitle}`}>
          Nazwa
        </label>
        <input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={namePlaceholder}
          className={inputClass}
        />
      </section>

      <section>
        <h2 className={sectionTitle}>Kto bierze udział</h2>
        <ul className="stagger-rows card divide-y divide-line overflow-hidden rounded-3xl">
          {people.map((person, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2">
              <Avatar name={person || "?"} seed={person || `new-${i}`} size="md" />
              <input
                value={person}
                onChange={(e) => setPerson(i, e.target.value)}
                onKeyDown={(e) => {
                  // Enter at the end of the list adds the next person, so a
                  // roster can be typed without reaching for the mouse.
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (i === people.length - 1 && person.trim()) addPerson();
                }}
                maxLength={60}
                placeholder={`Osoba ${i + 1}`}
                aria-label={`Osoba ${i + 1}`}
                className="min-h-11 min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />
              <button
                disabled={people.length <= MIN_PEOPLE}
                onClick={() => removePerson(i)}
                aria-label={`Usuń osobę ${i + 1}`}
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2 disabled:opacity-30"
              >
                <Icon name="trash" className="h-[18px] w-[18px]" />
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={addPerson}
          className="press mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[15px] font-medium text-muted"
        >
          <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.25} />
          Dodaj osobę
        </button>

        {duplicate && (
          <p className="mt-2 px-1 text-[13px]" style={{ color: "var(--neg)" }}>
            Dwie osoby mają to samo imię — dodaj nazwisko albo pseudonim.
          </p>
        )}
      </section>

      <button
        disabled={!canSubmit}
        onClick={() => onSubmit(name.trim(), filled)}
        style={canSubmit ? gradient : undefined}
        className="press min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
      >
        {busy ? busyLabel : submitLabel}
      </button>
    </>
  );
}
