// Replaces one section-period's criteria with the standard class-record set.
//   node --env-file=.env scripts/reset-period-criteria.mjs <sectionName> <period>
import pg from "pg";

const sectionName = process.argv[2];
const period = process.argv[3];
if (!sectionName || !period) {
  console.error("usage: reset-period-criteria.mjs <sectionName> <period>");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows: sections } = await client.query(
  "select id, name from public.faculty_sections where lower(name) = lower($1)",
  [sectionName],
);
if (sections.length === 0) {
  console.log("section not found:", sectionName);
  process.exit(1);
}
const sectionId = sections[0].id;

const { rows: grades } = await client.query(
  "select count(*)::int as n from public.faculty_grades where section_id = $1",
  [sectionId],
);
console.log(`section "${sections[0].name}" currently holds ${grades[0].n} grade row(s)`);

await client.query("delete from public.faculty_assessments where section_id = $1", [sectionId]);

const { rows: periodRows } = await client.query(
  "select id from public.faculty_periods where section_id = $1 and period = $2",
  [sectionId, period],
);
if (periodRows.length === 0) {
  await client.query(
    "insert into public.faculty_periods (section_id, period, status) values ($1, $2, 'not_started')",
    [sectionId, period],
  );
}
const { rows: fresh } = await client.query(
  "select id from public.faculty_periods where section_id = $1 and period = $2",
  [sectionId, period],
);
const periodId = fresh[0].id;

const defs = [
  { name: "A", maxScore: 100, weight: 10, group: null },
  { name: "R-1", maxScore: 100, weight: 10, group: "recitation" },
  { name: "R-2", maxScore: 100, weight: 10, group: "recitation" },
  { name: "R-3", maxScore: 100, weight: 10, group: "recitation" },
  { name: "Q-1", maxScore: 100, weight: 10, group: null },
  { name: "Q-2", maxScore: 100, weight: 10, group: null },
  { name: "Exam", maxScore: 100, weight: 40, group: null },
];
for (const [i, d] of defs.entries()) {
  await client.query(
    `insert into public.faculty_assessments (section_id, period_id, name, max_score, weight, group_key, "order")
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [sectionId, periodId, d.name, d.maxScore, d.weight, d.group, i],
  );
}
console.log(`"${sections[0].name}" · ${period} now uses the standard criteria`);
await client.end();
