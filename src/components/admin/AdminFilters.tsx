// AdminFilters (WO-6) — professor / course / period filters above the
// sections table. Purely client-side over the already-loaded overview:
// filtering never refetches, and state is local (no URL persistence).
// The course list narrows to the selected professor; the period filter
// keeps only rows with any activity in that period.
import type { PeriodId, SectionOverview } from "../../types";
import { PERIODS, PERIOD_SHORT } from "../../types";
import { plural } from "../../lib/format";
import { Button, Select } from "../ui";

export interface AdminFilterState {
  professor: string | null; // professorName, null = all
  course: string | null;    // course.id, null = all
  period: PeriodId | null;  // null = all periods
}

export const EMPTY_FILTERS: AdminFilterState = { professor: null, course: null, period: null };

/** A period counts as "active" once started (draft/submitted) or graded. */
export function hasPeriodActivity(row: SectionOverview, period: PeriodId): boolean {
  const p = row.periods.find((x) => x.period === period);
  return p != null && (p.status !== "not_started" || p.gradedCells > 0);
}

export function AdminFilters({
  rows,
  value,
  shownCount,
  onChange,
}: {
  rows: SectionOverview[];
  value: AdminFilterState;
  shownCount: number;
  onChange(next: AdminFilterState): void;
}): JSX.Element {
  const professors = [...new Set(rows.map((r) => r.professorName))].sort((a, b) => a.localeCompare(b));
  const courses = rows
    .filter((r) => value.professor == null || r.professorName === value.professor)
    .map((r) => ({ id: r.course.id, code: r.course.code }))
    .sort((a, b) => a.code.localeCompare(b.code))
    .filter((c, i, list) => i === 0 || list[i - 1].id !== c.id); // distinct by id

  const anyActive = value.professor != null || value.course != null || value.period != null;

  const setProfessor = (name: string | null): void => {
    // A course narrowed away by the new professor is no longer selectable.
    const courseStillValid =
      value.course != null &&
      rows.some((r) => r.professorName === name && r.course.id === value.course);
    onChange({ professor: name, course: courseStillValid ? value.course : null, period: value.period });
  };

  return (
    <div className="adm-filters">
      <div className="adm-filters__field">
        <label className="mono-label" htmlFor="adm-f-professor">
          Professor
        </label>
        <Select
          id="adm-f-professor"
          value={value.professor ?? ""}
          onChange={(e) => setProfessor(e.target.value === "" ? null : e.target.value)}
        >
          <option value="">All professors</option>
          {professors.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <div className="adm-filters__field">
        <label className="mono-label" htmlFor="adm-f-course">
          Course
        </label>
        <Select
          id="adm-f-course"
          value={value.course ?? ""}
          onChange={(e) => onChange({ ...value, course: e.target.value === "" ? null : e.target.value })}
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </Select>
      </div>

      <div className="adm-filters__field">
        <label className="mono-label" htmlFor="adm-f-period">
          Period
        </label>
        <Select
          id="adm-f-period"
          value={value.period ?? ""}
          onChange={(e) =>
            onChange({ ...value, period: e.target.value === "" ? null : (e.target.value as PeriodId) })
          }
        >
          <option value="">All periods</option>
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_SHORT[p]}
            </option>
          ))}
        </Select>
      </div>

      <div className="adm-filters__end">
        <span className="adm-filters__count" role="status">
          Showing {shownCount} of {rows.length} {plural(rows.length, "section")}
        </span>
        <Button variant="ghost" size="sm" disabled={!anyActive} onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}
