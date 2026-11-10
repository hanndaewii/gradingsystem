-- ═══════════════════════════════════════════════════════════════════════════════
-- Faculty Grading Portal — Supabase schema (commented, runnable-later DDL)
-- --------------------------------------------------------------------------------
-- This is the backend twin of the localStorage demo (`src/api/local.ts`). The
-- app never calls Supabase today; when you swap (see `src/api/index.ts`), each
-- `Api` method maps 1:1 onto a table here.
--
-- Naming bridge to src/types.ts:
--   profiles        → Profile            (id mirrors auth.users.id)
--   terms           → Term               (academic_year + semester unique)
--   courses         → Course
--   sections        → Section            (scale_table jsonb = ScaleRow[],
--                                          period_weights jsonb = Record<PeriodId, number>)
--   periods         → PeriodState        (one row per section × period)
--   assessments     → Assessment
--   students        → Student            (student_no = institutional ID; the row
--                                          PK `id` is what types.ts calls the
--                                          "student row id" — D1)
--   grades          → Grade              (student_id = students.id = studentRowId)
--   grade_history   → HistoryEntry
--   comments        → Comment
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ── profiles ───────────────────────────────────────────────────────────────────
-- One row per user (professor or department head). Passwords are NOT stored:
-- Supabase Auth owns credentials (the demo stores plaintext in localStorage
-- only — see README caveats).
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text not null,
  department  text not null default '',
  bio         text not null default '',
  role        text not null check (role in ('professor', 'admin'))
);

-- ── terms ──────────────────────────────────────────────────────────────────────
create table if not exists public.terms (
  id             uuid primary key default gen_random_uuid(),
  academic_year  text not null check (academic_year ~ '^\d{4}-\d{4}$'),
  semester       int  not null check (semester in (1, 2)),
  unique (academic_year, semester)
);

-- ── courses ────────────────────────────────────────────────────────────────────
-- Cascade: deleting a course removes its sections → students/grades/etc.
create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete cascade,
  term_id      uuid not null references public.terms (id) on delete cascade,
  code         text not null,
  title        text not null,
  created_at   timestamptz not null default now(),
  -- DUPLICATE_CODE rule: code unique per professor per term (case-normalized
  -- upstream; store uppercase).
  unique (professor_id, term_id, code)
);

-- ── sections ───────────────────────────────────────────────────────────────────
create table if not exists public.sections (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses (id) on delete cascade,
  name             text not null,
  schedule         text not null default '',
  room             text not null default '',
  display_scale    text not null default 'percent-letter' check (display_scale in ('percent-letter', 'scale5')),
  scale_table      jsonb not null,          -- ScaleRow[] sorted desc by minPct
  period_weights   jsonb not null,          -- {"prelim":25,"midterm":25,"semifinals":25,"finals":25}
  enforce_order    boolean not null default true,
  unlocked_periods text[] not null default '{}',  -- subset of the four period ids (D5)
  created_at       timestamptz not null default now()
);

-- ── periods ────────────────────────────────────────────────────────────────────
-- Materializes PeriodState per section × period; `status` drives locking.
create table if not exists public.periods (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.sections (id) on delete cascade,
  period       text not null check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  status       text not null default 'not_started' check (status in ('not_started', 'draft', 'submitted')),
  submitted_at timestamptz,
  unique (section_id, period)
);

-- ── assessments ────────────────────────────────────────────────────────────────
create table if not exists public.assessments (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  period_id  uuid not null references public.periods (id) on delete cascade,
  name       text not null,
  max_score  numeric not null check (max_score > 0),
  weight     numeric,                          -- null = equal-weight mode (D14)
  "order"    int not null default 0           -- quoted: ORDER is reserved
);

-- ── students ───────────────────────────────────────────────────────────────────
create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),  -- == studentRowId (D1)
  section_id uuid not null references public.sections (id) on delete cascade,
  student_no text not null,                               -- institutional ID; the demo api mints AUTO-#### when a row is added without one
  name       text not null,
  unique (section_id, student_no)
);

-- ── grades ─────────────────────────────────────────────────────────────────────
-- One row per (assessment, student). score may be null (ungraded).
create table if not exists public.grades (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.sections (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id    uuid not null references public.students (id) on delete cascade,  -- studentRowId
  score         numeric,
  updated_at    timestamptz not null default now(),
  unique (assessment_id, student_id)
);

-- ── grade_history ──────────────────────────────────────────────────────────────
-- kind ∈ 'grade' | 'submit' | 'reopen' | 'import'; detail carries the CSV
-- import summary / reopen note (D13). grade rows are append-only.
create table if not exists public.grade_history (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.sections (id) on delete cascade,
  kind          text not null check (kind in ('grade', 'submit', 'reopen', 'import')),
  period        text check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  assessment_id uuid references public.assessments (id) on delete set null,
  student_id    uuid references public.students (id) on delete set null,
  old_score     numeric,
  new_score     numeric,
  at            timestamptz not null default now(),
  actor_id      uuid not null references public.profiles (id)
);

-- ── comments ───────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  period     text check (period in ('prelim', 'midterm', 'semifinals', 'finals')),  -- null = general
  author_id  uuid not null references public.profiles (id),
  body       text not null,
  at         timestamptz not null default now()
);

-- ── indexes ────────────────────────────────────────────────────────────────────
create index if not exists idx_courses_professor   on public.courses (professor_id, term_id);
create index if not exists idx_sections_course     on public.sections (course_id);
create index if not exists idx_periods_section     on public.periods (section_id);
create index if not exists idx_assessments_section on public.assessments (section_id, period_id);
create index if not exists idx_students_section    on public.students (section_id);
create index if not exists idx_grades_section      on public.grades (section_id);
-- The unique(assessment_id, student_id) constraint already back grades' cell
-- lookups; this index adds section-first scans for listGrades():
create index if not exists idx_grades_cell         on public.grades (assessment_id, student_id);
create index if not exists idx_history_section_at  on public.grade_history (section_id, at desc);
create index if not exists idx_comments_section_at on public.comments (section_id, at desc);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- --------------------------------------------------------------------------------
-- Model (mirrors src/api/local.ts role scoping):
--   • Professors: full select/insert/update/delete on rows reachable from
--     courses.professor_id = auth.uid() — and nothing else.
--   • Admins (department head): SELECT on everything; INSERT on comments only.
--     Explicitly NO update/delete on grades or assessments.
--   • Unauthenticated: nothing.
-- NOTE: this file documents the intended server-side enforcement. The demo
-- app runs entirely client-side, so nothing here is enforced until the
-- Supabase swap happens (see README caveats).
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.current_role_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles      enable row level security;
alter table public.terms         enable row level security;
alter table public.courses       enable row level security;
alter table public.sections      enable row level security;
alter table public.periods       enable row level security;
alter table public.assessments   enable row level security;
alter table public.students      enable row level security;
alter table public.grades        enable row level security;
alter table public.grade_history enable row level security;
alter table public.comments      enable row level security;

-- profiles: readable by any signed-in user (author names in UIs); users may
-- update only their own row (the updateProfile api method).
create policy "profiles_read_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- terms: static lookup data, readable by all signed-in users.
create policy "terms_read_authenticated" on public.terms
  for select to authenticated using (true);

-- courses: professors own their rows; admins read all.
create policy "courses_professor_all" on public.courses
  for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());
create policy "courses_admin_read" on public.courses
  for select to authenticated using (public.current_role_is_admin());

-- Everything scoped through a section uses the same ownership subquery:
--   exists (select 1 from courses c where c.id = <row>.course_id
--           and c.professor_id = auth.uid())
create policy "sections_professor_all" on public.sections
  for all to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.professor_id = auth.uid()));
create policy "sections_admin_read" on public.sections
  for select to authenticated using (public.current_role_is_admin());

create policy "periods_professor_all" on public.periods
  for all to authenticated
  using (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
create policy "periods_admin_read" on public.periods
  for select to authenticated using (public.current_role_is_admin());

create policy "assessments_professor_all" on public.assessments
  for all to authenticated
  using (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
create policy "assessments_admin_read" on public.assessments
  for select to authenticated using (public.current_role_is_admin());

create policy "students_professor_all" on public.students
  for all to authenticated
  using (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
create policy "students_admin_read" on public.students
  for select to authenticated using (public.current_role_is_admin());

-- grades: professors read/write their own sections' cells; admins read only.
-- There is deliberately NO admin update/delete policy on grades.
create policy "grades_professor_all" on public.grades
  for all to authenticated
  using (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
create policy "grades_admin_read" on public.grades
  for select to authenticated using (public.current_role_is_admin());

-- grade_history: professors write/read their own; admins read only.
create policy "history_professor_all" on public.grade_history
  for all to authenticated
  using (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
create policy "history_admin_read" on public.grade_history
  for select to authenticated using (public.current_role_is_admin());

-- comments: BOTH roles may read (and write) — the admin's only write besides
-- their own profile. Professors may comment on their own sections; admins on
-- any section.
create policy "comments_professor_all" on public.comments
  for all to authenticated
  using (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.courses c join public.sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
create policy "comments_admin_read" on public.comments
  for select to authenticated using (public.current_role_is_admin());
create policy "comments_admin_insert" on public.comments
  for insert to authenticated with check (public.current_role_is_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
-- Submitted-period guard
-- --------------------------------------------------------------------------------
-- Server-side twin of ApiError codes PERIOD_SUBMITTED: reject grade/assessment
-- writes while the row's period status is 'submitted'. The client must call
-- reopenPeriod (which flips the period back to 'draft' and appends a 'reopen'
-- history row) before editing again.
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.assert_period_not_submitted()
returns trigger
language plpgsql
as $$
declare
  v_status text;
begin
  if tg_table_name = 'grades' then
    select p.status into v_status
    from public.assessments a
    join public.periods p on p.section_id = a.section_id and p.period = a.period
    where a.id = new.assessment_id;
  else -- assessments
    select status into v_status
    from public.periods
    where section_id = new.section_id and period = new.period;
  end if;

  if v_status = 'submitted' then
    raise exception 'PERIOD_SUBMITTED: this period is submitted — reopen it before changing grades or assessments.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grades_period_lock on public.grades;
create trigger trg_grades_period_lock
  before insert or update on public.grades
  for each row execute function public.assert_period_not_submitted();

drop trigger if exists trg_assessments_period_lock on public.assessments;
create trigger trg_assessments_period_lock
  before insert or update on public.assessments
  for each row execute function public.assert_period_not_submitted();

-- Cascade chain reference (all ON DELETE CASCADE):
--   courses ─▶ sections ─▶ periods
--                     └─▶ assessments ─▶ grades (also via students)
--                     └─▶ students   ─▶ grades
--                     └─▶ grade_history (rows keep section_id)
--                     └─▶ comments
-- Deleting a course therefore removes every section, student, grade and
-- history row beneath it — exactly what Api.getDeleteImpact reports.
