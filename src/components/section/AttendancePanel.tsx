// AttendancePanel — the professor's attendance calendar.
//
// One clickable header per term (Prelim → Finals). Picking a term shows that
// term's month: a calendar of milestones (when classes started, when the
// exam is, holidays, notes) and, below it, the attendance sheet — every
// student against every day of the month. The professor types P (present),
// A (absent) or L (late); each mark is also encoded into the section's
// "Attendance" criterion score, so the class record and the gradebook always
// agree.
import { useEffect, useMemo, useRef, useState } from "react";
import { PERIODS } from "../../types";
import type { AttendanceRow, AttendanceStatus, CalendarEvent, PeriodId, Student } from "../../types";
import { ATTENDANCE_CREDIT, ATTENDANCE_LABEL, parseAttendance } from "../../lib/attendance";
import {
  WEEKDAY_INITIALS, WEEKDAY_NAMES, dayNumber, daysInMonth, isoDate, longDate,
  monthLabel, parseIsoDate, weekdayIndex,
} from "../../lib/calendar";
import { cx } from "./cx";

export interface AttendancePanelProps {
  students: Student[];
  rows: AttendanceRow[];
  events: CalendarEvent[];
  readOnly: boolean;
  /** Active period (e.g. from the Gradebook). */
  period?: PeriodId;
  /** Reports when the professor picks a different term. */
  onPeriodChange?(period: PeriodId): void;
  /** Writes one mark; the parent reloads the list afterwards. */
  onSet(
    period: PeriodId,
    studentRowId: string,
    sessionDate: string,
    status: AttendanceStatus | null,
  ): Promise<void>;
  /** Marks a whole class present in one go. */
  onSetMany(
    period: PeriodId,
    sessionDate: string,
    entries: { studentRowId: string; status: AttendanceStatus }[],
  ): Promise<void>;
  /** Saves a calendar milestone (classes started / exam / holiday / note). */
  onSetEvent(event: {
    period: PeriodId;
    eventDate: string;
    kind: CalendarEvent["kind"];
    label: string;
  }): Promise<void>;
  /** Removes a calendar milestone. */
  onClearEvent(eventDate: string): Promise<void>;
}

/** The term headers — the wording used in the class record. */
const TERM_LABELS: Record<PeriodId, string> = {
  prelim: "Prelim",
  midterm: "Midterm",
  semifinals: "Pre-Finals",
  finals: "Finals",
};

const EVENT_KINDS: Array<{ kind: CalendarEvent["kind"]; label: string }> = [
  { kind: "start", label: "Classes started" },
  { kind: "exam", label: "Exam" },
  { kind: "holiday", label: "No class" },
  { kind: "event", label: "Note" },
];

const cellId = (studentRowId: string, date: string): string =>
  `sec-att-${studentRowId}-${date}`;

const markKey = (studentRowId: string, date: string): string => `${studentRowId}|${date}`;

export function AttendancePanel({
  students,
  rows,
  events,
  readOnly,
  period: propPeriod,
  onPeriodChange,
  onSet,
  onSetMany,
  onSetEvent,
  onClearEvent,
}: AttendancePanelProps): JSX.Element {
  const today = isoDate(new Date());
  const [internalPeriod, setInternalPeriod] = useState<PeriodId>(propPeriod ?? "prelim");
  const period = propPeriod ?? internalPeriod;

  useEffect(() => {
    if (propPeriod) {
      setInternalPeriod(propPeriod);
    }
  }, [propPeriod]);

  function handlePeriodChange(p: PeriodId): void {
    setInternalPeriod(p);
    onPeriodChange?.(p);
  }
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [includeSunday, setIncludeSunday] = useState(false);
  const [activeWeek, setActiveWeek] = useState<number | "all">(1);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  /** Local marks — the sheet shows these immediately, before the save lands. */
  const [marks, setMarks] = useState<Record<string, AttendanceStatus | null>>({});
  /** Cells with a save in flight (per cell — never a global lock). */
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [eventDay, setEventDay] = useState<string | null>(null);
  const [eventKind, setEventKind] = useState<CalendarEvent["kind"]>("start");
  const [eventLabel, setEventLabel] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [focusDay, setFocusDay] = useState<string | null>(null);

  // The latest rows/events, readable from the term-jump effect without
  // re-running it whenever the server answers.
  const latest = useRef({ rows, events });
  latest.current = { rows, events };

  const rowMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const r of rows) map.set(markKey(r.studentRowId, r.sessionDate), r.status);
    return map;
  }, [rows]);

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    for (const e of events) map.set(`${e.period}|${e.eventDate}`, e);
    return map;
  }, [events]);

  const markOf = (studentRowId: string, date: string): AttendanceStatus | null => {
    const key = markKey(studentRowId, date);
    if (key in marks) return marks[key];
    return rowMap.get(key) ?? null;
  };

  const monthDays = useMemo(() => daysInMonth(month.year, month.month), [month]);
  const visibleDays = useMemo(
    () => (includeSunday ? monthDays : monthDays.filter((d) => weekdayIndex(d) !== 6)),
    [monthDays, includeSunday],
  );

  const totalDaysInMonth = monthDays.length;
  const maxWeeks = Math.ceil(totalDaysInMonth / 7);

  const displayedDays = useMemo(() => {
    if (activeWeek === "all") return visibleDays;
    const startDay = (activeWeek - 1) * 7 + 1;
    const endDay = activeWeek * 7;
    return visibleDays.filter((d) => {
      const num = parseIsoDate(d).getDate();
      return num >= startDay && num <= endDay;
    });
  }, [activeWeek, visibleDays]);

  const weekOptions = useMemo(() => {
    const opts: Array<{ key: number | "all"; label: string }> = [];
    for (let w = 1; w <= maxWeeks; w += 1) {
      const s = (w - 1) * 7 + 1;
      const e = Math.min(w * 7, totalDaysInMonth);
      opts.push({ key: w, label: `Week ${w} (${s}–${e})` });
    }
    opts.push({ key: "all", label: "All days" });
    return opts;
  }, [maxWeeks, totalDaysInMonth]);

  const scrollTable = (offset: number): void => {
    tableWrapRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  // Picking a term jumps to that term's month — the month holding its first
  // milestone, or its most recent attendance, else today.
  useEffect(() => {
    const { rows: allRows, events: allEvents } = latest.current;
    const ev = allEvents.filter((e) => e.period === period).map((e) => e.eventDate).sort()[0];
    const row = allRows
      .filter((r) => r.period === period)
      .map((r) => r.sessionDate)
      .sort()
      .pop();
    const target = ev ?? row;
    if (!target) return;
    const d = parseIsoDate(target);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [period]);

  // Selecting a day loads its milestone into the editor.
  useEffect(() => {
    if (!eventDay) return;
    const existing = eventMap.get(`${period}|${eventDay}`);
    setEventKind(existing?.kind ?? "start");
    setEventLabel(existing?.label ?? "");
  }, [eventDay, period, eventMap]);

  function shiftMonth(delta: number): void {
    setMonth((m) => {
      const next = new Date(m.year, m.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function focusCell(studentRowId: string, date: string): void {
    const el = document.getElementById(cellId(studentRowId, date)) as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    el.select();
  }

  /** After a mark lands, move to the next student in the same day column. */
  function advance(date: string, studentRowId: string): void {
    const index = students.findIndex((s) => s.id === studentRowId);
    const next = students[index + 1];
    if (next) {
      focusCell(next.id, date);
      return;
    }
    // Last student of the day → the first student of the next day.
    const dayIndex = displayedDays.indexOf(date);
    const nextDay = displayedDays[dayIndex + 1];
    if (nextDay && students[0]) focusCell(students[0].id, nextDay);
  }

  async function handleType(
    studentRowId: string,
    date: string,
    raw: string,
  ): Promise<void> {
    const key = markKey(studentRowId, date);
    const trimmed = raw.trim();

    // An empty box clears the mark.
    if (trimmed === "") {
      if (marks[key] === undefined && !rowMap.has(key)) return;
      setMarks((m) => ({ ...m, [key]: null }));
      setPending((p) => ({ ...p, [key]: true }));
      try {
        await onSet(period, studentRowId, date, null);
      } catch {
        setMarks((m) => {
          const next = { ...m };
          delete next[key];
          return next;
        });
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
      }
      return;
    }

    const parsed = parseAttendance(trimmed);
    if (parsed === null) {
      // Not P/A/L — put the previous mark back.
      setMarks((m) => ({ ...m, [key]: markOf(studentRowId, date) }));
      return;
    }
    setMarks((m) => ({ ...m, [key]: parsed }));
    setPending((p) => ({ ...p, [key]: true }));
    // The cursor moves straight away — the professor keeps typing while the
    // save travels to the server.
    advance(date, studentRowId);
    try {
      await onSet(period, studentRowId, date, parsed);
    } catch {
      setMarks((m) => {
        const next = { ...m };
        delete next[key];
        return next;
      });
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    }
  }

  async function markDayPresent(date: string): Promise<void> {
    if (students.length === 0) return;
    setBulkBusy(true);
    try {
      const entries = students
        .filter((s) => markOf(s.id, date) !== "p")
        .map((s) => ({ studentRowId: s.id, status: "p" as AttendanceStatus }));
      if (entries.length > 0) await onSetMany(period, date, entries);
      for (const e of entries) setMarks((m) => ({ ...m, [markKey(e.studentRowId, date)]: "p" }));
    } finally {
      setBulkBusy(false);
    }
  }

  async function saveEvent(): Promise<void> {
    if (!eventDay) return;
    setSavingEvent(true);
    try {
      await onSetEvent({ period, eventDate: eventDay, kind: eventKind, label: eventLabel });
    } finally {
      setSavingEvent(false);
    }
  }

  async function clearEvent(): Promise<void> {
    if (!eventDay) return;
    setSavingEvent(true);
    try {
      await onClearEvent(eventDay);
      setEventLabel("");
    } finally {
      setSavingEvent(false);
    }
  }

  // ── totals for the visible month ──────────────────────────────────────────
  const totals = useMemo(() => {
    let p = 0;
    let a = 0;
    let l = 0;
    let marked = 0;
    for (const day of visibleDays) {
      for (const student of students) {
        const status = markOf(student.id, day);
        if (!status) continue; // a blank day is simply not counted
        marked += 1;
        if (status === "p") p += 1;
        else if (status === "a") a += 1;
        else if (status === "l") l += 1;
      }
    }
    return { p, a, l, marked };
  }, [visibleDays, students, marks, rowMap]);

  /** How many students still have no mark on a day (0 = the day is done). */
  const unmarkedOn = (day: string): number => {
    let n = 0;
    for (const student of students) {
      if (!markOf(student.id, day)) n += 1;
    }
    return n;
  };

  const rateFor = (student: Student): number | null => {
    let sum = 0;
    let n = 0;
    for (const day of visibleDays) {
      const status = markOf(student.id, day);
      if (!status) continue;
      sum += ATTENDANCE_CREDIT[status];
      n += 1;
    }
    if (n === 0) return null;
    return Math.round((sum / n) * 100);
  };

  // ── the month grid ───────────────────────────────────────────────────────
  const gridCells = useMemo(() => {
    const lead = weekdayIndex(monthDays[0] ?? isoDate(new Date()));
    const cells: (string | null)[] = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    cells.push(...monthDays);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthDays]);

  const selectedEvent = eventDay ? eventMap.get(`${period}|${eventDay}`) : undefined;

  return (
    <div className="sec-att">
      {/* ── term headers ─────────────────────────────────────────────── */}
      <div className="sec-att__terms" role="group" aria-label="Term">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={cx("sec-att__term", period === p && "is-active")}
            aria-pressed={period === p}
            onClick={() => handlePeriodChange(p)}
          >
            {TERM_LABELS[p]}
          </button>
        ))}
      </div>

      {readOnly ? (
        <p className="sec-att__notice">
          You are signed in as the department head — attendance is read-only. Sign out and
          sign in with your <strong>Professor</strong> password to mark attendance.
        </p>
      ) : null}

      {/* ── month bar ────────────────────────────────────────────────── */}
      <div className="sec-att__bar">
        <button
          type="button"
          className="sec-att__nav"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          ‹
        </button>
        <span className="sec-att__month">{monthLabel(month.year, month.month)}</span>
        <button
          type="button"
          className="sec-att__nav"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          ›
        </button>
        <button
          type="button"
          className="sec-att__link"
          onClick={() => {
            const now = new Date();
            setMonth({ year: now.getFullYear(), month: now.getMonth() });
            const todayStr = isoDate(now);
            setFocusDay(todayStr);
            const w = Math.min(maxWeeks, Math.ceil(now.getDate() / 7));
            setActiveWeek(w);
            window.setTimeout(() => focusCell(students[0]?.id, todayStr), 80);
          }}
        >
          Today
        </button>
        <label className="sec-att__toggle">
          <input
            type="checkbox"
            checked={includeSunday}
            onChange={(e) => setIncludeSunday(e.target.checked)}
          />
          Include Sundays
        </label>
      </div>

      {/* ── milestone calendar ───────────────────────────────────────── */}
      <div className="sec-cal">
        <div className="sec-cal__weekdays" aria-hidden="true">
          {WEEKDAY_NAMES.map((name, i) => (
            <span key={name} className="sec-cal__weekday" title={name}>
              {WEEKDAY_INITIALS[i]}
            </span>
          ))}
        </div>
        <div className="sec-cal__grid">
          {gridCells.map((day, i) => {
            if (!day) return <span key={`pad-${i}`} className="sec-cal__cell is-empty" />;
            const ev = eventMap.get(`${period}|${day}`);
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                className={cx(
                  "sec-cal__cell",
                  isToday && "is-today",
                  eventDay === day && "is-selected",
                  ev && `has-${ev.kind}`,
                )}
                onClick={() => {
                  setEventDay(day === eventDay ? null : day);
                  setFocusDay(day);
                  const dNum = parseIsoDate(day).getDate();
                  const w = Math.min(maxWeeks, Math.ceil(dNum / 7));
                  setActiveWeek(w);
                  window.setTimeout(() => focusCell(students[0]?.id, day), 80);
                }}
                aria-label={`${longDate(day)}${ev ? ` — ${ev.label || ev.kind}` : ""}`}
              >
                <span className="sec-cal__num">{dayNumber(day)}</span>
                {ev ? <span className="sec-cal__tag">{ev.label || EVENT_KINDS.find((k) => k.kind === ev.kind)?.label}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── milestone editor ─────────────────────────────────────────── */}
      {eventDay ? (
        <div className="sec-cal__editor">
          <div className="sec-cal__editorhead">
            <strong className="mono-label">{longDate(eventDay)}</strong>
            {selectedEvent ? (
              <button type="button" className="sec-att__link" onClick={() => void clearEvent()}>
                Remove
              </button>
            ) : null}
          </div>
          <div className="sec-cal__kinds">
            {EVENT_KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                className={cx("sec-cal__kind", eventKind === k.kind && "is-active")}
                aria-pressed={eventKind === k.kind}
                onClick={() => setEventKind(k.kind)}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="sec-cal__editorrow">
            <input
              className="sec-cal__label"
              value={eventLabel}
              placeholder="Note (optional) — e.g. Classes started, Prelim exam"
              maxLength={80}
              onChange={(e) => setEventLabel(e.target.value)}
              aria-label="Event note"
            />
            <button
              type="button"
              className="sec-cal__save"
              disabled={savingEvent}
              onClick={() => void saveEvent()}
            >
              {savingEvent ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── the attendance sheet ─────────────────────────────────────── */}
      <p className="sec-att__hint mono-label">
        Type P (present) · A (absent) · L (late) — every mark updates the Attendance criterion
      </p>

      {/* ── week / date-range filter ───────────────────────────────────── */}
      <div className="sec-att__weeks" role="toolbar" aria-label="Attendance week selection">
        <span className="sec-att__weeklabel mono-label">Days:</span>
        <button
          type="button"
          className="sec-att__week sec-att__week--nav"
          disabled={activeWeek === "all" || activeWeek <= 1}
          onClick={() => typeof activeWeek === "number" && activeWeek > 1 && setActiveWeek(activeWeek - 1)}
          title="Previous week"
          aria-label="Previous week"
        >
          ‹
        </button>
        {weekOptions.map((opt) => (
          <button
            key={String(opt.key)}
            type="button"
            className={cx("sec-att__week", activeWeek === opt.key && "is-active")}
            aria-pressed={activeWeek === opt.key}
            onClick={() => setActiveWeek(opt.key)}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          className="sec-att__week sec-att__week--nav"
          disabled={activeWeek === "all" || (typeof activeWeek === "number" && activeWeek >= maxWeeks)}
          onClick={() => typeof activeWeek === "number" && activeWeek < maxWeeks && setActiveWeek(activeWeek + 1)}
          title="Next week"
          aria-label="Next week"
        >
          ›
        </button>
        {activeWeek === "all" ? (
          <span className="sec-att__scrollbtns">
            <button
              type="button"
              className="sec-att__week sec-att__week--nav"
              onClick={() => scrollTable(-300)}
              title="Scroll days left"
            >
              ← Days
            </button>
            <button
              type="button"
              className="sec-att__week sec-att__week--nav"
              onClick={() => scrollTable(300)}
              title="Scroll days right"
            >
              Days →
            </button>
          </span>
        ) : null}
      </div>

      {students.length === 0 ? (
        <p className="sec-att__none">Add students to the roster first, then mark their attendance.</p>
      ) : (
        <div ref={tableWrapRef} className="sec-tablewrap sec-att__tablewrap">
          <table className="sec-table sec-att__table">
            <thead>
              <tr>
                <th scope="col" className="sec-table__name mono-label">
                  Student
                </th>
                {displayedDays.map((day) => {
                  const ev = eventMap.get(`${period}|${day}`);
                  return (
                    <th
                      key={day}
                      scope="col"
                      className={cx(
                        "sec-att__day",
                        focusDay === day && "is-focus",
                        ev && `has-${ev.kind}`,
                      )}
                    >
                      <button
                        type="button"
                        className="sec-att__daybtn"
                        title={
                          ev
                            ? `${ev.label || ev.kind} — ${unmarkedOn(day)} of ${students.length} not marked yet`
                            : `${unmarkedOn(day)} of ${students.length} not marked yet — click to mark the whole day present`
                        }
                        onClick={() => {
                          setFocusDay(day);
                          void markDayPresent(day);
                        }}
                      >
                        <span className="sec-att__dow">{WEEKDAY_INITIALS[weekdayIndex(day)]}</span>
                        <span className="sec-att__dom">{dayNumber(day)}</span>
                      </button>
                    </th>
                  );
                })}
                <th
                  scope="col"
                  className="sec-att__rate mono-label"
                  title="The average over the days you marked — blank days are not counted as absences."
                >
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const rate = rateFor(student);
                return (
                  <tr key={student.id}>
                    <td className="sec-table__name">{student.name}</td>
                    {displayedDays.map((day) => {
                      const status = markOf(student.id, day);
                      const key = markKey(student.id, day);
                      const isPending = pending[key] === true;
                      return (
                        <td
                          key={day}
                          className={cx(
                            "sec-att__cell",
                            focusDay === day && "is-focus",
                            isPending && "is-pending",
                          )}
                        >
                          <input
                            id={cellId(student.id, day)}
                            className={cx("sec-att__input", status && `is-${status}`)}
                            value={status ?? ""}
                            maxLength={1}
                            disabled={readOnly}
                            autoComplete="off"
                            spellCheck={false}
                            aria-label={`${student.name} — ${longDate(day)}`}
                            title={status ? ATTENDANCE_LABEL[status] : "Not marked"}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => void handleType(student.id, day, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                advance(day, student.id);
                              }
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="sec-att__rate num">{rate === null ? "—" : `${rate}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {students.length > 0 ? (
        <>
          <p className="sec-att__totals mono-label">
            {monthLabel(month.year, month.month)} · {TERM_LABELS[period]} — {totals.marked} marked
            days · {totals.p} present · {totals.a} absent · {totals.l} late
            {bulkBusy ? " · saving…" : ""}
          </p>
          <p className="sec-att__note mono-label">
            The Attendance criterion averages every day marked in {TERM_LABELS[period]} — blank
            days are not counted, so a day with no class never counts as an absence.
          </p>
        </>
      ) : null}
    </div>
  );
}
