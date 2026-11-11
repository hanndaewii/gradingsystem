// Ensures the academic-calendar terms exist (shared reference data, not
// demo content): the term picker needs them, and the portal creates new
// terms on demand.
//   node --env-file=.env scripts/ensure-terms.mjs [AY:AY ...]
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const years = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["2025-2026", "2026-2027"];

for (const ay of years) {
  if (!/^\d{4}-\d{4}$/.test(ay)) {
    console.error(`skipping "${ay}" (expected YYYY-YYYY)`);
    continue;
  }
  for (const semester of [1, 2]) {
    await client.query(
      `insert into public.faculty_terms (academic_year, semester) values ($1, $2)
       on conflict (academic_year, semester) do nothing`,
      [ay, semester],
    );
  }
}

const { rows } = await client.query(
  "select academic_year, semester from public.faculty_terms order by academic_year, semester",
);
console.log("terms:", rows.map((r) => `${r.academic_year}/${r.semester}`).join(", "));
await client.end();
