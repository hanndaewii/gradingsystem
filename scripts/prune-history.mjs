// Trims the audit trail so the database cannot creep upward forever.
//   node --env-file=.env scripts/prune-history.mjs --days 730            (keep 2 years)
//   node --env-file=.env scripts/prune-history.mjs --days 730 --dry-run (report only)
//
// Grade history and comments are the only tables that grow with usage; every
// other table is bounded by courses/sections/students.
import pg from "pg";

const args = process.argv.slice(2);
const daysArg = args.find((a) => a.startsWith("--days="));
const days = daysArg ? Number(daysArg.split("=")[1]) : 730;
const dryRun = args.includes("--dry-run");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const before = await client.query(
  `select pg_total_relation_size('public.faculty_grade_history') + pg_total_relation_size('public.faculty_comments') as bytes`,
);
const startBytes = Number(before.rows[0].bytes);

const del = async (label, sql) => {
  const { rows } = await client.query(sql);
  console.log(`  ${label}: ${rows[0].n} row(s)`);
  return Number(rows[0].n);
};

console.log(`pruning history/comments older than ${days} day(s)${dryRun ? " (dry run)" : ""}:`);
await client.query("begin");
const historyRows = await del(
  "grade_history",
  `with gone as (delete from public.faculty_grade_history where at < now() - interval '${days} days' returning 1)
   select count(*)::int as n from gone`,
);
const commentRows = await del(
  "comments",
  `with gone as (delete from public.faculty_comments where at < now() - interval '${days} days' returning 1)
   select count(*)::int as n from gone`,
);

if (dryRun) {
  await client.query("rollback");
  console.log("\ndry run — nothing was deleted.");
} else {
  await client.query("commit");
  const after = await client.query(
    `select pg_total_relation_size('public.faculty_grade_history') + pg_total_relation_size('public.faculty_comments') as bytes`,
  );
  const freed = (startBytes - Number(after.rows[0].bytes)) / 1024;
  console.log(
    `\ndeleted ${historyRows} history + ${commentRows} comment row(s); reclaimed ~${freed.toFixed(1)} KB`,
  );
}

await client.end();
