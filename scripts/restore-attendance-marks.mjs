// Restore the professor's 23 attendance marks exactly as they were before the
// browser test wiped them.
import pg from "pg";

const ORIGINAL = [
  ["2026-11-01", "p", "2026-11-11T09:16:09.849Z"],
  ["2026-11-02", "a", "2026-11-11T09:16:12.603Z"],
  ["2026-11-03", "a", "2026-11-11T09:16:13.709Z"],
  ["2026-11-04", "p", "2026-11-11T09:16:15.383Z"],
  ["2026-11-08", "p", "2026-11-11T09:16:20.428Z"],
  ["2026-11-09", "p", "2026-11-11T09:16:21.944Z"],
  ["2026-11-10", "p", "2026-11-11T09:16:23.558Z"],
  ["2026-11-11", "p", "2026-11-11T09:16:25.480Z"],
  ["2026-11-12", "p", "2026-11-11T09:16:27.121Z"],
  ["2026-11-13", "p", "2026-11-11T09:16:28.699Z"],
  ["2026-11-15", "p", "2026-11-11T09:16:30.229Z"],
  ["2026-11-16", "p", "2026-11-11T09:16:31.797Z"],
  ["2026-11-17", "p", "2026-11-11T09:16:33.414Z"],
  ["2026-11-18", "a", "2026-11-11T09:16:35.025Z"],
  ["2026-11-19", "p", "2026-11-11T09:16:36.539Z"],
  ["2026-11-20", "p", "2026-11-11T09:16:38.202Z"],
  ["2026-11-22", "p", "2026-11-11T09:16:39.804Z"],
  ["2026-11-23", "p", "2026-11-11T09:16:41.525Z"],
  ["2026-11-24", "p", "2026-11-11T09:16:43.902Z"],
  ["2026-11-25", "a", "2026-11-11T09:16:45.532Z"],
  ["2026-11-26", "p", "2026-11-11T09:16:47.172Z"],
  ["2026-11-27", "p", "2026-11-11T09:16:48.709Z"],
  ["2026-11-29", "p", "2026-11-11T09:16:53.527Z"],
];

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const student = await c.query(
  "select id, section_id from public.faculty_students where name = $1 limit 1",
  ["Nicholette lambuson"],
);
if (student.rows.length === 0) {
  console.error("student not found");
  process.exit(1);
}
const { id: studentId, section_id: sectionId } = student.rows[0];

for (const [day, status, at] of ORIGINAL) {
  await c.query(
    `insert into public.faculty_attendance (section_id, student_id, period, session_date, status, updated_at)
     values ($1, $2, 'prelim', $3, $4, $5)
     on conflict (section_id, student_id, session_date)
     do update set period = excluded.period, status = excluded.status, updated_at = excluded.updated_at`,
    [sectionId, studentId, day, status, at],
  );
}
console.log(`restored ${ORIGINAL.length} marks`);

// The Attendance criterion's score: 19 present + 4 absent over 23 marked days.
const crit = await c.query(
  `select a.id, a.max_score from public.faculty_assessments a
     join public.faculty_periods p on p.id = a.period_id
    where p.section_id = $1 and p.period = 'prelim' and lower(a.name) = 'attendance' limit 1`,
  [sectionId],
);
const score = Math.round((19 / 23) * Number(crit.rows[0].max_score) * 100) / 100;
await c.query(
  `insert into public.faculty_grades (section_id, assessment_id, student_id, score)
   values ($1, $2, $3, $4)
   on conflict (assessment_id, student_id) do update set score = excluded.score, updated_at = now()`,
  [sectionId, crit.rows[0].id, studentId, score],
);
console.log(`Attendance score restored to ${score}`);

const check = await c.query(
  "select count(*)::int as n, count(*) filter (where status = 'p')::int as p, count(*) filter (where status = 'a')::int as a from public.faculty_attendance where student_id = $1",
  [studentId],
);
console.log("marks now:", JSON.stringify(check.rows[0]));

await c.end();
