// Renames the "A" criterion to "Attendance" in every section-period (the
// criteria were created before the rename).
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const before = await client.query(
  "select name, count(*)::int as n from public.faculty_assessments group by name order by name",
);
console.log("before:", before.rows.map((r) => `${r.name} ×${r.n}`).join(", "));

const renamed = await client.query(
  "update public.faculty_assessments set name = 'Attendance' where name = 'A' returning id",
);
console.log(`renamed ${renamed.rowCount} criterion row(s) to "Attendance"`);

const after = await client.query(
  "select name, count(*)::int as n from public.faculty_assessments group by name order by name",
);
console.log("after: ", after.rows.map((r) => `${r.name} ×${r.n}`).join(", "));

await client.end();
