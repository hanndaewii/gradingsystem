// Fills every EMPTY section-period with the standard grading criteria, so an
// existing section becomes usable immediately. Only touches periods that have
// no assessments at all (no grades can be lost).
//   node --env-file=.env scripts/apply-standard-criteria.mjs [--dry-run]
import pg from "pg";

const dryRun = process.argv.includes("--dry-run");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows: sections } = await client.query(
  "select id, name from public.faculty_sections order by name",
);
const { rows: existing } = await client.query(
  `select a.section_id, p.period, count(*)::int as n
   from public.faculty_assessments a join public.faculty_periods p on p.id = a.period_id
   group by 1,2`,
);
const counts = new Map(existing.map((r) => [`${r.section_id}:${r.period}`, r.n]));

const defs = [
  { name: "A", maxScore: 100, weight: 10, group: null },
  { name: "R-1", maxScore: 100, weight: 10, group: "recitation" },
  { name: "R-2", maxScore: 100, weight: 10, group: "recitation" },
  { name: "R-3", maxScore: 100, weight: 10, group: "recitation" },
  { name: "Q-1", maxScore: 100, weight: 10, group: null },
  { name: "Q-2", maxScore: 100, weight: 10, group: null },
  { name: "Exam", maxScore: 100, weight: 40, group: null },
];

let filled = 0;
for (const section of sections) {
  for (const period of ["prelim", "midterm", "semifinals", "finals"]) {
    const n = counts.get(`${section.id}:${period}`) ?? 0;
    if (n > 0) continue;
    filled += 1;
    if (dryRun) {
      console.log(`would fill ${section.name} · ${period}`);
      continue;
    }
    const { rows: periodRows } = await client.query(
      "select id from public.faculty_periods where section_id = $1 and period = $2",
      [section.id, period],
    );
    if (periodRows.length === 0) {
      await client.query(
        "insert into public.faculty_periods (section_id, period, status) values ($1, $2, 'not_started')",
        [section.id, period],
      );
    }
    const { rows: periodRow } = await client.query(
      "select id from public.faculty_periods where section_id = $1 and period = $2",
      [section.id, period],
    );
    const periodId = periodRow[0].id;
    for (const [i, d] of defs.entries()) {
      await client.query(
        `insert into public.faculty_assessments (section_id, period_id, name, max_score, weight, group_key, "order")
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [section.id, periodId, d.name, d.maxScore, d.weight, d.group, i],
      );
    }
  }
}
console.log(
  dryRun
    ? `dry run — ${filled} empty section-periods would be filled`
    : `filled ${filled} empty section-period(s) with the standard criteria`,
);
await client.end();
