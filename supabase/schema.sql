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
-- ── faculty.credentials ──────────────────────────────────────────────────────
-- Role-scoped sign-in: ONE email can hold two credentials — a department-head
-- password and a professor password. The login screen picks the role; the
-- Worker verifies the bcrypt hash here and issues the session, and the profile
-- row's role is set to the role that was used, so row-level security matches
-- the session. Nothing readable is stored.
create table if not exists public.faculty_credentials (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  role          text not null check (role in ('professor', 'admin')),
  password_hash text not null,          -- crypt(password, gen_salt('bf'))
  label         text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (email, role)
);

-- ── faculty.attendance ──────────────────────────────────────────────────────
-- One row per student per class date: 'p' present, 'a' absent, 'l' late.
-- The mark is the source of truth; it is also encoded into the "Attendance"
-- criterion's score (see src/lib/attendance.ts).
-- Applying the schema must never wipe the marks: the table is only
-- created when it is missing.
create table if not exists public.faculty_attendance (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.faculty_sections (id) on delete cascade,
  student_id   uuid not null references public.faculty_students (id) on delete cascade,
  period       text not null check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  session_date date not null,             -- the class date the mark belongs to
  status       text not null check (status in ('p', 'a', 'l')),
  updated_at   timestamptz not null default now(),
  unique (section_id, student_id, session_date)
);

-- ── faculty.calendar_events ────────────────────────────────────────────────
-- Milestones on the calendar: when classes started, when the exam is, and any
-- other note for that day.
create table if not exists public.faculty_calendar_events (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.faculty_sections (id) on delete cascade,
  period     text not null check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  event_date date not null,
  kind       text not null default 'event' check (kind in ('start', 'exam', 'holiday', 'event')),
  label      text not null default '',
  updated_at timestamptz not null default now(),
  unique (section_id, period, event_date)
);

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
-- Status chain: not_started → draft → submitted → approved (the department
-- head's sign-off). The head can send an approved period back to draft.
create table if not exists public.faculty_periods (
  id           uuid primary key default gen_random_uuid(),
  section_id   uuid not null references public.faculty_sections (id) on delete cascade,
  period       text not null check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  status       text not null default 'not_started'
               check (status in ('not_started', 'draft', 'submitted', 'approved')),
  submitted_at timestamptz,
  approved_at  timestamptz,
  approved_by  uuid references public.faculty_profiles (id) on delete set null,
  -- The term's own window in the school calendar. A class date belongs to
  -- the first term whose window contains it; the attendance calendar follows
  -- these dates, so the school calendar can shift from year to year.
  start_date   date,
  end_date     date,
  unique (section_id, period)
);

-- upgrades for databases created before approval existed (idempotent)
alter table public.faculty_periods
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.faculty_profiles (id) on delete set null;
alter table public.faculty_periods drop constraint if exists faculty_periods_status_check;
alter table public.faculty_periods
  add constraint faculty_periods_status_check
  check (status in ('not_started', 'draft', 'submitted', 'approved'));

alter table public.faculty_periods
  add column if not exists start_date date,
  add column if not exists end_date date;

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
  kind         text not null check (kind in ('grade', 'submit', 'reopen', 'import', 'approve', 'unlock')),
  period       text check (period in ('prelim', 'midterm', 'semifinals', 'finals')),
  assessment_id uuid references public.faculty_assessments (id) on delete set null,
  student_id   uuid references public.faculty_students (id) on delete set null,
  old_score    numeric,
  new_score    numeric,
  at           timestamptz not null default now(),
  actor_id     uuid references public.faculty_profiles (id) on delete set null,
  detail       text
);

-- the approve / unlock kinds arrived with the department head's sign-off —
-- widen the check for databases created before (idempotent)
alter table public.faculty_grade_history drop constraint if exists faculty_grade_history_kind_check;
alter table public.faculty_grade_history
  add constraint faculty_grade_history_kind_check
  check (kind in ('grade', 'submit', 'reopen', 'import', 'approve', 'unlock'));

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
create index if not exists idx_attendance_section  on public.faculty_attendance (section_id, period, session_date);
create index if not exists idx_calendar_section   on public.faculty_calendar_events (section_id, event_date);
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
alter table public.faculty_credentials  enable row level security;
alter table public.faculty_terms         enable row level security;
alter table public.faculty_courses       enable row level security;
alter table public.faculty_sections      enable row level security;
alter table public.faculty_periods       enable row level security;
alter table public.faculty_assessments   enable row level security;
alter table public.faculty_students      enable row level security;
alter table public.faculty_attendance   enable row level security;
alter table public.faculty_calendar_events enable row level security;
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
-- self-registration: a signed-up user may create exactly their own profile
-- row (the app does this after the emailed code is verified).
drop policy if exists "profiles_insert_own" on public.faculty_profiles;
create policy "profiles_insert_own" on public.faculty_profiles
  for insert to authenticated with check (id = auth.uid());

-- credentials: only the department head may read or change them (the Worker
-- also uses the service role, which bypasses RLS).
drop policy if exists "credentials_admin_read" on public.faculty_credentials;
create policy "credentials_admin_read" on public.faculty_credentials
  for select to authenticated using (public.faculty_current_role_is_admin());
drop policy if exists "credentials_admin_write" on public.faculty_credentials;
create policy "credentials_admin_write" on public.faculty_credentials
  for all to authenticated
  using (public.faculty_current_role_is_admin())
  with check (public.faculty_current_role_is_admin());

-- terms: static lookup data, readable by all signed-in users.
drop policy if exists "terms_read_authenticated" on public.faculty_terms;
create policy "terms_read_authenticated" on public.faculty_terms
  for select to authenticated using (true);
-- terms are shared calendar reference data: any signed-in user may add a new
-- academic year / semester (the portal creates the term on demand).
drop policy if exists "terms_insert_authenticated" on public.faculty_terms;
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
-- the department head approves a submitted period and can send an approved
-- one back to draft — the only admin writes on periods.
drop policy if exists "periods_admin_update" on public.faculty_periods;
create policy "periods_admin_update" on public.faculty_periods
  for update to authenticated
  using (public.faculty_current_role_is_admin())
  with check (public.faculty_current_role_is_admin());

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

-- attendance: owned like the rest of the section (professor rows only).
drop policy if exists "attendance_professor_all" on public.faculty_attendance;
create policy "attendance_professor_all" on public.faculty_attendance
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
drop policy if exists "attendance_admin_read" on public.faculty_attendance;
create policy "attendance_admin_read" on public.faculty_attendance
  for select to authenticated using (public.faculty_current_role_is_admin());

-- calendar events: owned like the rest of the section.
drop policy if exists "calendar_events_professor_all" on public.faculty_calendar_events;
create policy "calendar_events_professor_all" on public.faculty_calendar_events
  for all to authenticated
  using (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()))
  with check (exists (select 1 from public.faculty_courses c join public.faculty_sections s on s.course_id = c.id
                 where s.id = section_id and c.professor_id = auth.uid()));
drop policy if exists "calendar_events_admin_read" on public.faculty_calendar_events;
create policy "calendar_events_admin_read" on public.faculty_calendar_events
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

-- grade_history: professors write/read their own; admins read all and may
-- append approve/unlock entries.
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
-- the head's approve / unlock actions land in the same audit trail
drop policy if exists "history_admin_insert" on public.faculty_grade_history;
create policy "history_admin_insert" on public.faculty_grade_history
  for insert to authenticated with check (public.faculty_current_role_is_admin());

-- comments: BOTH roles may read (and write) — professors on their own
-- sections; admins on any section.
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
-- --------------------------------------------------------------------------------
-- faculty.set_attendance
--
-- One round trip per mark: store it, re-average the Attendance criterion from
-- every MARKED day in the period (a blank day is never counted as absent) and
-- record the change in the history. The function is security-definer, so it
-- checks ownership itself.
create or replace function public.faculty_set_attendance(
  p_section_id   uuid,
  p_student_id   uuid,
  p_period       text,
  p_session_date date,
  p_status       text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section      public.faculty_sections%rowtype;
  v_criterion    public.faculty_assessments%rowtype;
  v_period_state text;
  v_first_open   text;
  v_count        int := 0;
  v_credit       numeric := 0;
  v_score        numeric;
  v_old          numeric;
  v_has_criterion boolean := false;
begin
  if p_period not in ('prelim', 'midterm', 'semifinals', 'finals') then
    raise exception 'Period not found.';
  end if;
  if p_status is not null and p_status not in ('p', 'a', 'l') then
    raise exception 'Unknown attendance status.';
  end if;

  select * into v_section from public.faculty_sections where id = p_section_id;
  if not found then raise exception 'Section not found.'; end if;

  -- only the section's professor may mark attendance
  if not exists (
    select 1 from public.faculty_courses c
     where c.id = v_section.course_id and c.professor_id = auth.uid()
  ) then
    raise exception 'Only the section''s professor can do that.';
  end if;

  -- the period must exist and still be open
  select p.status into v_period_state from public.faculty_periods p
   where p.section_id = p_section_id and p.period = p_period;
  if v_period_state is null then raise exception 'Period not found.'; end if;
  if v_period_state = 'submitted' then
    raise exception 'This period is submitted - reopen it before making changes.';
  end if;

  -- the in-order rule: only the first period that is not submitted yet
  if coalesce(v_section.enforce_order, true)
     and not (p_period = any (coalesce(v_section.unlocked_periods, '{}'::text[]))) then
    select p.period into v_first_open
      from public.faculty_periods p
     where p.section_id = p_section_id and p.status <> 'submitted'
     order by case p.period
                when 'prelim' then 1 when 'midterm' then 2
                when 'semifinals' then 3 else 4 end
     limit 1;
    if v_first_open is distinct from p_period then
      raise exception '% is locked - submit earlier periods first or unlock it manually.',
        initcap(p_period);
    end if;
  end if;

  -- the student must belong to the section
  if not exists (
    select 1 from public.faculty_students s
     where s.id = p_student_id and s.section_id = p_section_id
  ) then
    raise exception 'Student not found.';
  end if;

  -- 1 - store the mark (one row per student per class date)
  if p_status is null then
    delete from public.faculty_attendance
     where section_id = p_section_id
       and student_id = p_student_id
       and session_date = p_session_date;
  else
    insert into public.faculty_attendance
      (section_id, student_id, period, session_date, status, updated_at)
    values (p_section_id, p_student_id, p_period, p_session_date, p_status, now())
    on conflict (section_id, student_id, session_date)
    do update set period = excluded.period,
                  status = excluded.status,
                  updated_at = now();
  end if;

  -- 2 - the Attendance criterion of that period
  select a.* into v_criterion
    from public.faculty_assessments a
    join public.faculty_periods p on p.id = a.period_id
   where p.section_id = p_section_id
     and p.period = p_period
     and lower(btrim(a.name)) = 'attendance'
   limit 1;
  v_has_criterion := found;

  -- 3 - re-average the criterion: only the MARKED days count, and a day
  --     marked "no class" is left out of both the total and the credit.
  if v_has_criterion then
    perform public.faculty_refresh_attendance_score(
      p_section_id, p_student_id, p_period,
      case when p_status is null then 'Attendance cleared'
           else 'Attendance: ' || p_status end
    );

    -- The score the refresh just wrote, so the app can show it at once.
    select g.score into v_score
      from public.faculty_grades g
     where g.assessment_id = v_criterion.id
       and g.student_id = p_student_id;
  end if;

  return jsonb_build_object(
    'score', case when v_has_criterion then v_score else null end,
    'assessment_id', case when v_has_criterion then v_criterion.id else null end,
    'rows', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'sectionId', a.section_id, 'studentRowId', a.student_id, 'period', a.period,
        'sessionDate', a.session_date, 'status', a.status, 'updatedAt', a.updated_at
        ) order by a.session_date), '[]'::jsonb)
        from public.faculty_attendance a
       where a.section_id = p_section_id
    )
  );
end;
$$;

revoke execute on function public.faculty_set_attendance(uuid, uuid, text, date, text) from public;
grant execute on function public.faculty_set_attendance(uuid, uuid, text, date, text) to authenticated;

-- --------------------------------------------------------------------------------
-- faculty.term_of_date
--
-- The term a class date belongs to: the first term whose window contains it.
-- A date outside every window falls back to the term its mark was filed
-- under, so a day is never orphaned.
create or replace function public.faculty_term_of_date(p_section_id uuid, p_date date)
returns text
language sql
stable
set search_path = public
as $$
  select p.period
    from public.faculty_periods p
   where p.section_id = p_section_id
     and p.start_date is not null
     and p.end_date is not null
     and p_date between p.start_date and p.end_date
   order by case p.period
              when 'prelim' then 1 when 'midterm' then 2
              when 'semifinals' then 3 else 4 end
   limit 1;
$$;

-- --------------------------------------------------------------------------------
-- faculty.refresh_attendance_score
--
-- Re-averages the Attendance criterion for one student in one term. Only the
-- days that were actually marked count, and a day marked "no class" is left
-- out of both the total and the credit (it is never an absence).
-- The earlier three-argument version is replaced, not overloaded.
drop function if exists public.faculty_refresh_attendance_score(uuid, uuid, text);
create or replace function public.faculty_refresh_attendance_score(
  p_section_id uuid,
  p_student_id uuid,
  p_period text,
  p_detail text default 'Attendance: term dates changed'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_criterion public.faculty_assessments%rowtype;
  v_count     int := 0;
  v_credit    numeric := 0;
  v_score     numeric;
  v_old       numeric;
begin
  select a.* into v_criterion
    from public.faculty_assessments a
    join public.faculty_periods p on p.id = a.period_id
   where p.section_id = p_section_id
     and p.period = p_period
     and lower(btrim(a.name)) = 'attendance'
   limit 1;
  if not found then return; end if;

  select count(*),
         coalesce(sum(case when a.status = 'p' then 1
                          when a.status = 'l' then 0.75
                          else 0 end), 0)
    into v_count, v_credit
    from public.faculty_attendance a
   where a.section_id = p_section_id
     and a.student_id = p_student_id
     and a.period = p_period
     and not exists (
       select 1 from public.faculty_calendar_events e
        where e.section_id = p_section_id
          and e.event_date = a.session_date
          and e.kind = 'holiday'
     );

  if v_count = 0 then
    v_score := null;                 -- nothing marked -> no score at all
  else
    v_score := round((v_credit / v_count) * v_criterion.max_score, 2);
  end if;

  select g.score into v_old
    from public.faculty_grades g
   where g.assessment_id = v_criterion.id
     and g.student_id = p_student_id;

  if v_old is distinct from v_score then
    if v_score is null then
      delete from public.faculty_grades
       where assessment_id = v_criterion.id and student_id = p_student_id;
    else
      insert into public.faculty_grades
        (section_id, assessment_id, student_id, score, updated_at)
      values (p_section_id, v_criterion.id, p_student_id, v_score, now())
      on conflict (assessment_id, student_id)
      do update set score = excluded.score, updated_at = now();
    end if;

    insert into public.faculty_grade_history
      (section_id, kind, period, assessment_id, student_id, old_score, new_score, at, actor_id, detail)
    values
      (p_section_id, 'grade', p_period, v_criterion.id, p_student_id, v_old, v_score,
       now(), auth.uid(), p_detail);
  end if;
end;
$$;

-- --------------------------------------------------------------------------------
-- faculty.preview_term_dates
--
-- What would change if this term's window were changed: which marks would
-- move to another term, and how many. Nothing is written.
create or replace function public.faculty_preview_term_dates(
  p_section_id uuid,
  p_period text,
  p_start date,
  p_end date
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moves jsonb;
begin
  if not exists (
    select 1 from public.faculty_courses c
      join public.faculty_sections s on s.course_id = c.id
     where s.id = p_section_id and c.professor_id = auth.uid()
  ) then
    raise exception 'Only the section''s professor can do that.';
  end if;

  with windows as (
    select p.period,
           case when p.period = p_period then p_start else p.start_date end as s,
           case when p.period = p_period then p_end   else p.end_date   end as e
      from public.faculty_periods p
     where p.section_id = p_section_id
  ),
  proposed as (
    select a.period as old_period,
           (select w.period
              from windows w
             where w.s is not null and w.e is not null
               and a.session_date between w.s and w.e
             order by case w.period
                        when 'prelim' then 1 when 'midterm' then 2
                        when 'semifinals' then 3 else 4 end
             limit 1) as new_period
      from public.faculty_attendance a
     where a.section_id = p_section_id
  )
  select coalesce(
           jsonb_agg(jsonb_build_object('from', m.old_period, 'to', m.new_period, 'count', m.cnt)),
           '[]'::jsonb)
    into v_moves
    from (
      select old_period, new_period, count(*)::int as cnt
        from proposed
       where new_period is not null and new_period <> old_period
       group by old_period, new_period
    ) m;

  return jsonb_build_object('moves', v_moves);
end;
$$;

-- --------------------------------------------------------------------------------
-- faculty.apply_term_dates
--
-- Saves the term's window, moves the marks that now belong to another term
-- and re-averages the Attendance score for every student affected.
create or replace function public.faculty_apply_term_dates(
  p_section_id uuid,
  p_period text,
  p_start date,
  p_end date
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moved  int := 0;
  v_moves  jsonb;
  v_pairs  record;
begin
  if not exists (
    select 1 from public.faculty_courses c
      join public.faculty_sections s on s.course_id = c.id
     where s.id = p_section_id and c.professor_id = auth.uid()
  ) then
    raise exception 'Only the section''s professor can do that.';
  end if;

  -- What moves, and where.
  with windows as (
    select p.period,
           case when p.period = p_period then p_start else p.start_date end as s,
           case when p.period = p_period then p_end   else p.end_date   end as e
      from public.faculty_periods p
     where p.section_id = p_section_id
  ),
  proposed as (
    select a.id, a.student_id, a.period as old_period,
           (select w.period
              from windows w
             where w.s is not null and w.e is not null
               and a.session_date between w.s and w.e
             order by case w.period
                        when 'prelim' then 1 when 'midterm' then 2
                        when 'semifinals' then 3 else 4 end
             limit 1) as new_period
      from public.faculty_attendance a
     where a.section_id = p_section_id
  )
  update public.faculty_attendance a
     set period = pr.new_period, updated_at = now()
    from proposed pr
   where a.id = pr.id and pr.new_period is not null and pr.new_period <> a.period;

  get diagnostics v_moved = row_count;

  -- Save the window.
  update public.faculty_periods
     set start_date = p_start, end_date = p_end
   where section_id = p_section_id and period = p_period;

  -- Re-average every student whose marks changed term.
  for v_pairs in
    select distinct a.student_id, a.period
      from public.faculty_attendance a
     where a.section_id = p_section_id
  loop
    perform public.faculty_refresh_attendance_score(p_section_id, v_pairs.student_id, v_pairs.period);
  end loop;

  v_moves := public.faculty_preview_term_dates(p_section_id, p_period, p_start, p_end)
                -> 'moves';
  return jsonb_build_object('moved', v_moved, 'moves', v_moves);
end;
$$;

revoke execute on function public.faculty_term_of_date(uuid, date) from public;
grant execute on function public.faculty_term_of_date(uuid, date) to authenticated;
revoke execute on function public.faculty_refresh_attendance_score(uuid, uuid, text, text) from public;
grant execute on function public.faculty_refresh_attendance_score(uuid, uuid, text, text) to authenticated;
revoke execute on function public.faculty_preview_term_dates(uuid, text, date, date) from public;
grant execute on function public.faculty_preview_term_dates(uuid, text, date, date) to authenticated;
revoke execute on function public.faculty_apply_term_dates(uuid, text, date, date) from public;
grant execute on function public.faculty_apply_term_dates(uuid, text, date, date) to authenticated;

-- --------------------------------------------------------------------------------
-- faculty.set_calendar_event
--
-- Saves (or removes) a milestone and re-averages the Attendance score of every
-- student marked on that date — a "no class" day must leave the rate at once.
create or replace function public.faculty_set_calendar_event(
  p_section_id uuid,
  p_period text,
  p_event_date date,
  p_kind text,
  p_label text,
  p_delete boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student record;
  v_detail text;
begin
  if not exists (
    select 1 from public.faculty_courses c
      join public.faculty_sections s on s.course_id = c.id
     where s.id = p_section_id and c.professor_id = auth.uid()
  ) then
    raise exception 'Only the section''s professor can do that.';
  end if;

  if p_delete then
    delete from public.faculty_calendar_events
     where section_id = p_section_id and event_date = p_event_date;
    v_detail := 'Attendance: a no-class day was removed';
  else
    if p_kind not in ('start', 'exam', 'holiday', 'event') then
      raise exception 'Unknown event kind.';
    end if;
    insert into public.faculty_calendar_events
      (section_id, period, event_date, kind, label, updated_at)
    values (p_section_id, p_period, p_event_date, p_kind, coalesce(p_label, ''), now())
    on conflict (section_id, period, event_date)
    do update set kind = excluded.kind,
                  label = excluded.label,
                  updated_at = now();
    v_detail := 'Attendance: a no-class day was marked';
  end if;

  -- Re-average every student marked on that date.
  for v_student in
    select distinct a.student_id, a.period
      from public.faculty_attendance a
     where a.section_id = p_section_id and a.session_date = p_event_date
  loop
    perform public.faculty_refresh_attendance_score(
      p_section_id, v_student.student_id, v_student.period, v_detail
    );
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.faculty_set_calendar_event(uuid, text, date, text, text, boolean) from public;
grant execute on function public.faculty_set_calendar_event(uuid, text, date, text, text, boolean) to authenticated;

-- Grants
-- --------------------------------------------------------------------------------
-- The app talks to PostgREST as `authenticated`. Our tables live in `public`
-- with a `faculty_` prefix, so they are served by PostgREST out of the box
-- (no "exposed schemas" change needed) and never collide with the existing
-- grading-system tables.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on function public.faculty_current_role_is_admin() to authenticated;

-- Cascade chain reference (all ON DELETE CASCADE):
--   courses ─▶ sections ─▶ periods
--                     └─▶ assessments ─▶ grades (also via students)
--                     └─▶ students   ─▶ grades
--                     └─▶ grade_history (rows keep section_id)
--                     └─▶ comments
-- Deleting a course therefore removes every section, student, grade and
-- history row beneath it — exactly what Api.getDeleteImpact reports.
