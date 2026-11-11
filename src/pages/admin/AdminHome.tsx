// AdminHome (WO-6) — the department head's read-only home (route "/").
// Masthead, five-stat StatsRow, AdminFilters and the all-sections
// SectionsTable for the selected term, all fed by a single
// api.getTermOverview read through useAsync (reload on term change).
// No edit affordances anywhere: the admin's only writes in this app are
// comments (on the section page) and their own profile.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { termLabel } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { useTerm } from "../../context/TermContext";
import { Button, EmptyState, Panel, Spinner } from "../../components/ui";
import { StatsRow } from "../../components/admin/StatsRow";
import { SectionsTable } from "../../components/admin/SectionsTable";
import { AdminFilters, EMPTY_FILTERS, hasPeriodActivity } from "../../components/admin/AdminFilters";
import type { AdminFilterState } from "../../components/admin/AdminFilters";
import "../../styles/admin.css";

export default function AdminHome(): JSX.Element {
  const { term } = useTerm();
  const { data, loading, error, reload } = useAsync(
    () => api.getTermOverview(term),
    [term.academicYear, term.semester],
  );

  // Filters are local state only; a term change invalidates any selection.
  const [filters, setFilters] = useState<AdminFilterState>(EMPTY_FILTERS);
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
  }, [term.academicYear, term.semester]);

  // Client-side filtering over the loaded overview — never a refetch.
  const rows = useMemo(() => {
    const filtered = (data ?? []).filter(
      (r) =>
        (filters.professor == null || r.professorName === filters.professor) &&
        (filters.course == null || r.course.id === filters.course) &&
        (filters.period == null || hasPeriodActivity(r, filters.period)),
    );
    return [...filtered].sort(
      (a, b) => a.course.code.localeCompare(b.course.code) || a.section.name.localeCompare(b.section.name),
    );
  }, [data, filters]);

  if (loading && data === null) {
    return (
      <div className="adm-loading">
        <Spinner label="Loading the term overview…" />
      </div>
    );
  }

  if (error != null) {
    return (
      <EmptyState
        title="Couldn't load this term"
        body="Something went wrong while loading the department overview."
        action={
          <Button variant="ghost" onClick={reload}>
            Try again
          </Button>
        }
      />
    );
  }

  const overview = data ?? [];

  return (
    <>
      <header className="adm-mast">
        <h1 className="adm-mast__title">
          Department review
          <span className="adm-mast__term mono-label"> · {termLabel(term)}</span>
        </h1>
        <Link to="/faculty" className="adm-mast__link">
          Faculty accounts
        </Link>
      </header>

      {overview.length === 0 ? (
        <EmptyState
          title="No sections this term"
          body={`There are no courses or sections for ${termLabel(term)} yet.`}
        />
      ) : (
        <>
          <StatsRow rows={overview} />
          <Panel label="Sections" dense>
            <AdminFilters rows={overview} value={filters} shownCount={rows.length} onChange={setFilters} />
            <SectionsTable rows={rows} activePeriod={filters.period} />
          </Panel>
        </>
      )}
    </>
  );
}
