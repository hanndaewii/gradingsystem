// One-off: applying the schema must never wipe the attendance marks.
import { execFileSync } from "node:child_process";
import pg from "pg";

const count = async () => {
  const c = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query("select count(*)::int as n from public.faculty_attendance");
  const e = await c.query("select count(*)::int as n from public.faculty_calendar_events");
  await c.end();
  return { marks: r.rows[0].n, events: e.rows[0].n };
};

const before = await count();
console.log("before the schema:", JSON.stringify(before));
execFileSync(process.execPath, ["--env-file=.env", "scripts/apply-schema.mjs"], {
  stdio: "ignore",
});
const after = await count();
console.log("after  the schema:", JSON.stringify(after));
console.log(
  before.marks === after.marks && before.events === after.events
    ? "PASS  applying the schema keeps the attendance data"
    : "FAIL  applying the schema changed the attendance data",
);
process.exit(before.marks === after.marks && before.events === after.events ? 0 : 1);
