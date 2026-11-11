-- ═══════════════════════════════════════════════════════════════════════════════
-- Faculty Grading Portal — Supabase schema
-- --------------------------------------------------------------------------------
-- Everything lives in its own Postgres schema, `faculty`, so it never collides
-- with the grading system that already exists in this project (public.classes,
-- public.enrollments, public.grade_components, … are left untouched).
--
-- Naming bridge to src/types.ts:
--   public.faculty_profiles        → Profile            (id mirrors auth.users.id)
--   public.faculty_terms           → Term               (academic_year + semester)
--   public.faculty_courses         → Course             (term_id → public.faculty_terms.id)
--   public.faculty_sections        → Section            (scale_table jsonb = ScaleRow[],
--                                                 period_weights jsonb = Record<PeriodId, number>)
--   public.faculty_periods         → PeriodState        (one row per section × period)
--   public.faculty_assessments     → Assessment         (group_key = the "Total" grouping)
--   public.faculty_students        → Student            (student_no = institutional ID; the row
--                                                 PK id is what types.ts calls the
--                                                 "student row id" — D1)
--   public.faculty_grades          → Grade              (student_id = students.id = studentRowId)
--   public.faculty_grade_history   → HistoryEntry
--   public.faculty_comments        → Comment
--
-- Apply with:  node --env-file=.env scripts/apply-schema.mjs
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ── public.faculty_profiles ──────────────────────────────────────────────────────────
-- One row per user (professor or department head). Passwords are NOT stored:
-- Supabase Auth owns credentials.
create table if not exists public.faculty_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text not null,
  department  text not null default '',
  bio         text not null default '',
  role        text not null check (role in ('professor', 'admin'))
);

-- ── public.faculty_terms ────────────────────────────────────────────────────────────
create table if not exists public.faculty_terms (
  id             uuid primary key default gen_random_uuid(),
  academic_year  text not null check (academic_year ~ '^\d{4}-\d{4}$'),
  semester       int  not null check (semester in (1, 2)),
  unique (academic_year, semester)
);

-- ── public.faculty_courses ──────────────────────────────────────────────────────────
-- Cascade: deleting a course removes its sections → students/grades/etc.
create table if not exists public.faculty_courses (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.faculty_profiles (id) on delete cascade,
  term_id      uuid not null references public.faculty_terms (id) on delete cascade,
  code         text not null,
  title        text not null,
  created_at   timestamptz not null default now(),
  -- DUPLICATE_CODE rule: code unique per professor per term (uppercase).
  unique (professor_id, term_id, code)
);

-- ── public.faculty_sections ─────────────────────────────────────────────────────────
create table if not exists public.faculty_sections (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.faculty_courses (id) on delete cascade,
  name             text not null,
  schedule         text not null default '',
  room             text not null default '',
  display_scale    text not null default 'percent-letter' check (display_scale in ('percent-letter', 'scale5')),
  scale_table      jsonb not null,          -- ScaleRow[] sorted desc by minPct
  period_weights   jsonb not null,          -- {"prelim":25,"midterm":25,"semifinals":25,"finals":25}
  enforce_order    boolean not null default true,
  unlocked_periods text[] not null default '{}',
  created_at       timestamptz not null default now()
);

-- ── public.faculty_periods ──────────────────────────────────────────────────────────
-- One row per section × period: status + submitted_at (the PeriodState).
create table if not exists public.faculty_periods (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.faculty_sections (id) on delete cascade,
  period       text not null check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  status       text not null default 'not_started' check (status in ('not_started', 'draft', 'submitted')),
  submitted_at timestamptz,
  unique (section_id, period)
);

-- ── public.faculty_assessments ──────────────────────────────────────────────────────
create table if not exists public.faculty_assessments (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.faculty_sections (id) on delete cascade,
  period_id  uuid not null references public.faculty_periods (id) on delete cascade,
  name       text not null,
  max_score  numeric not null check (max_score > 0),
  weight     numeric,                          -- null = equal-weight mode (D14)
  group_key  text,                             -- Total-group key: consecutive rows sharing a key render as one "Total" column
  "order"    int not null default 0           -- quoted: ORDER is reserved
);

-- ── public.faculty_students ─────────────────────────────────────────────────────────
create table if not exists public.faculty_students (
  id         uuid primary key default gen_random_uuid(),  -- == studentRowId (D1)
  section_id uuid not null references public.faculty_sections (id) on delete cascade,
  student_no text not null,                               -- institutional ID
  name       text not null,
  unique (section_id, student_no)
);

-- ── public.faculty_grades ───────────────────────────────────────────────────────────
-- One row per (assessment, student). score may be null (ungraded).
create table if not exists public.faculty_grades (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.faculty_sections (id) on delete cascade,
  assessment_id uuid not null references public.faculty_assessments (id) on delete cascade,
  student_id    uuid not null references public.faculty_students (id) on delete cascade,
  score         numeric,
  updated_at    timestamptz not null default now(),
  unique (assessment_id, student_id)
);

-- ── public.faculty_grade_history ────────────────────────────────────────────────────
create table if not exists public.faculty_grade_history (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.faculty_sections (id) on delete cascade,
  kind         text not null check (kind in ('grade', 'submit', 'reopen', 'import')),
  period       text check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  assessment_id uuid references public.faculty_assessments (id) on delete set null,
  student_id   uuid references public.faculty_students (id) on delete set null,
  old_score    numeric,
  new_score    numeric,
  at           timestamptz not null default now(),
  actor_id     uuid references public.faculty_profiles (id) on delete set null,
  detail       text
);

-- ── public.faculty_comments ─────────────────────────────────────────────────────────
create table if not exists public.faculty_comments (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.faculty_sections (id) on delete cascade,
  period     text check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  author_id  uuid not null references public.faculty_profiles (id) on delete cascade,
  body       text not null,
  at         timestamptz not null default now()
);

-- ── indexes (the FK columns the app reads by) ────────────────────────────────
create index if not exists idx_courses_professor   on public.faculty_courses (professor_id, term_id);
create index if not exists idx_courses_term         on public.faculty_courses (term_id);
create index if not exists idx_sections_course      on public.faculty_sections (course_id);
create index if not exists idx_periods_section      on public.faculty_periods (section_id);
create index if not exists idx_assessments_section  on public.faculty_assessments (section_id, period_id);
create index if not exists idx_students_section     on public.faculty_students (section_id);
create index if not exists idx_grades_section       on public.faculty_grades (section_id);
create index if not exists idx_grades_cell          on public.faculty_grades (assessment_id, student_id);
create index if not exists idx_history_section      on public.faculty_grade_history (section_id, at desc);
create index if not exists idx_comments_section     on public.faculty_comments (section_id, at desc);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- --------------------------------------------------------------------------------
--   • Professors: full select/insert/update/delete on rows reachable from
--     courses.professor_id = auth.uid() — and nothing else.
--   • Admins (department head): SELECT on everything; INSERT on comments only.
--     Explicitly NO update/delete on grades or assessments.
--   • Unauthenticated: nothing.
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.faculty_current_role_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.faculty_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.faculty_profiles      enable row level security;
alter table public.faculty_terms         enable row level security;
alter table public.faculty_courses       enable row level security;
alter table public.faculty_sections      enable row level security;
alter table public.faculty_periods       enable row level security;
alter table public.faculty_assessments   enable row level security;
alter table public.faculty_students      enable row level security;
alter table public.faculty_grades        enable row level security;
alter table public.faculty_grade_history enable row level security;
alter table public.faculty_comments      enable row level security;

-- profiles: readable by any signed-in user (author names in UIs); users may
-- update only their own row (the updateProfile api method).
drop policy if exists "profiles_read_authenticated" on public.faculty_profiles;
create policy "profiles_read_authenticated" on public.faculty_profiles
  for select to authenticated using (true);
drop policy if exists "profiles_update_own" on public.faculty_profiles;
create policy "profiles_update_own" on public.faculty_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- terms: static lookup data, readable by all signed-in users.
drop policy if exists "terms_read_authenticated" on public.faculty_terms;
create policy "terms_read_authenticated" on public.faculty_terms
  for select to authenticated using (true);
-- terms are shared calendar reference data: any signed-in user may add a new
-- academic year / semester (the portal creates the term on demand).
create policy "terms_insert_authenticated" on public.faculty_terms
  for insert to authenticated with check (true);

-- courses: professors own their rows; admins read all.
drop policy if exists "courses_professor_all" on public.faculty_courses;
create policy "courses_professor_all" on public.faculty_courses
  for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());
drop policy if exists "courses_admin_read" on public.faculty_courses;
create policy "courses_admin_read" on public.faculty_courses
  for select to authenticated using (public.faculty_current_role_is_admin());

-- Everything scoped through a section uses the same ownership subquery:
--   exists (select 1 from public.faculty_courses c where c.id = <row>.course_id
--           and c.professor_id = auth.uid())
drop policy if exists "sections_professor_all" on public.faculty_sections;
create policy "sections_professor_all" on public.faculty_sections
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c where c.id = course_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c where c.id = course_id and c.professor_id = auth.uid()));
drop policy if exists "sections_admin_read" on public.faculty_sections;
create policy "sections_admin_read" on public.faculty_sections
  for select to authenticated using (public.faculty_current_role_is_admin());

drop policy if exists "periods_professor_all" on public.faculty_periods;
create policy "periods_professor_all" on public.faculty_periods
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
drop policy if exists "periods_admin_read" on public.faculty_periods;
create policy "periods_admin_read" on public.faculty_periods
  for select to authenticated using (public.faculty_current_role_is_admin());

drop policy if exists "assessments_professor_all" on public.faculty_assessments;
create policy "assessments_professor_all" on public.faculty_assessments
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
drop policy if exists "assessments_admin_read" on public.faculty_assessments;
create policy "assessments_admin_read" on public.faculty_assessments
  for select to authenticated using (public.faculty_current_role_is_admin());

drop policy if exists "students_professor_all" on public.faculty_students;
create policy "students_professor_all" on public.faculty_students
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
drop policy if exists "students_admin_read" on public.faculty_students;
create policy "students_admin_read" on public.faculty_students
  for select to authenticated using (public.faculty_current_role_is_admin());

-- grades: professors read/write their own sections' cells; admins read only.
-- There is deliberately NO admin update/delete policy on grades.
drop policy if exists "grades_professor_all" on public.faculty_grades;
create policy "grades_professor_all" on public.faculty_grades
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
drop policy if exists "grades_admin_read" on public.faculty_grades;
create policy "grades_admin_read" on public.faculty_grades
  for select to authenticated using (public.faculty_current_role_is_admin());

-- grade_history: professors write/read their own; admins read only.
drop policy if exists "history_professor_all" on public.faculty_grade_history;
create policy "history_professor_all" on public.faculty_grade_history
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
drop policy if exists "history_admin_read" on public.faculty_grade_history;
create policy "history_admin_read" on public.faculty_grade_history
  for select to authenticated using (public.faculty_current_role_is_admin());

-- comments: BOTH roles may read (and write) — the admin's only write besides
-- their own profile. Professors may comment on their own sections; admins on
-- any section.
drop policy if exists "comments_professor_all" on public.faculty_comments;
create policy "comments_professor_all" on public.faculty_comments
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
drop policy if exists "comments_admin_read" on public.faculty_comments;
create policy "comments_admin_read" on public.faculty_comments
  for select to authenticated using (public.faculty_current_role_is_admin());
drop policy if exists "comments_admin_insert" on public.faculty_comments;
create policy "comments_admin_insert" on public.faculty_comments
  for insert to authenticated with check (public.faculty_current_role_is_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
-- Submitted-period guard
-- --------------------------------------------------------------------------------
-- Server-side twin of ApiError code PERIOD_SUBMITTED: reject grade/assessment
-- writes while the row's period status is 'submitted'. The client must call
-- reopenPeriod (which flips the period back to 'draft' and appends a 'reopen'
-- history row) before editing again.
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.faculty_assert_period_not_submitted()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_kind   text;
begin
  -- TG_ARGV[0] names the row kind ('grades' | 'assessments'); TG_TABLE_NAME
  -- carries the table's actual name (faculty_grades / faculty_assessments).
  v_kind := coalesce(nullif(TG_ARGV[0], ''), TG_TABLE_NAME);
  if v_kind = 'grades' then
    select p.status into v_status
    from public.faculty_assessments a
    join public.faculty_periods p on p.id = a.period_id
    where a.id = new.assessment_id;
  else -- assessments
    select status into v_status
    from public.faculty_periods
    where id = new.period_id;
  end if;

  if v_status = 'submitted' then
    raise exception 'PERIOD_SUBMITTED: this period is submitted — reopen it before changing grades or assessments.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grades_period_lock on public.faculty_grades;
create trigger trg_grades_period_lock
  before insert or update on public.faculty_grades
  for each row execute function public.faculty_assert_period_not_submitted('grades');

drop trigger if exists trg_assessments_period_lock on public.faculty_assessments;
create trigger trg_assessments_period_lock
  before insert or update on public.faculty_assessments
  for each row execute function public.faculty_assert_period_not_submitted('assessments');

-- ═══════════════════════════════════════════════════════════════════════════════
-- Grants
-- --------------------------------------------------------------------------------
-- The app talks to PostgREST as `authenticated`. Our tables live in `public`
-- with a `faculty_` prefix, so they are served by PostgREST out of the box
-- (no "exposed schemas" change needed) and never collide with the existing
-- grading-system tables.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- Cascade chain reference (all ON DELETE CASCADE):
--   courses ─▶ sections ─▶ periods
--                     └─▶ assessments ─▶ grades (also via students)
--                     └─▶ students   ─▶ grades
--                     └─▶ grade_history (rows keep section_id)
--                     └─▶ comments
-- Deleting a course therefore removes every section, student, grade and
-- history row beneath it — exactly what Api.getDeleteImpact reports.
