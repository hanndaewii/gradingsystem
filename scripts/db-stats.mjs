// Reports how the database space is actually used: table sizes, row counts,
// index sizes, the largest tables, and the growth of the audit trail.
//   node --env-file=.env scripts/db-stats.mjs
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const mb = (bytes) => `${(Number(bytes) / 1024 / 1024).toFixed(2)} MB`;
const kb = (bytes) => `${(Number(bytes) / 1024).toFixed(1)} KB`;

const db = await client.query(
  `select pg_size_pretty(pg_database_size(current_database())) as size,
          pg_database_size(current_database()) as bytes`,
);
console.log(`database: ${db.rows[0].size}  (${kb(db.rows[0].bytes)})`);

const tables = await client.query(`
  select c.relname as table,
         c.reltuples::bigint as approx_rows,
         pg_total_relation_size(c.oid) as total_bytes,
         pg_relation_size(c.oid) as data_bytes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by pg_total_relation_size(c.oid) desc
`);
console.log("\npublic schema (ours + the other app):");
console.log("  table                          rows      total        data");
for (const t of tables.rows) {
  console.log(
    `  ${t.table.padEnd(28)} ${String(t.approx_rows).padStart(8)}  ${kb(t.total_bytes).padStart(11)}  ${kb(t.data_bytes).padStart(11)}`,
  );
}

const ours = await client.query(`
  select c.relname as table,
         c.reltuples::bigint as approx_rows,
         pg_total_relation_size(c.oid) as total_bytes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'faculty_%'
  order by pg_total_relation_size(c.oid) desc
`);
const ourTotal = ours.rows.reduce((acc, r) => acc + Number(r.total_bytes), 0);
console.log(`\nour portal (faculty_*): ${kb(ourTotal)} across ${ours.rows.length} tables`);
for (const t of ours.rows) {
  console.log(`  ${t.table.padEnd(28)} ${String(t.approx_rows).padStart(8)} rows  ${kb(t.total_bytes).padStart(11)}`);
}

const idx = await client.query(`
  select sum(pg_relation_size(i.indexrelid)) as bytes, count(*) as n
  from pg_stat_user_indexes i
`);
console.log(`\nindexes: ${idx.rows[0].n} · ${kb(idx.rows[0].bytes)}`);

const growth = await client.query(`
  select
    (select count(*) from public.faculty_grade_history) as history_rows,
    (select count(*) from public.faculty_grade_history where at > now() - interval '30 days') as history_30d,
    (select count(*) from public.faculty_grades) as grade_rows,
    (select count(*) from public.faculty_comments) as comment_rows,
    (select count(*) from public.faculty_students) as student_rows
`);
const g = growth.rows[0];
console.log("\ncontent:");
console.log(`  grades          ${g.grade_rows}`);
console.log(`  students        ${g.student_rows}`);
console.log(`  history rows    ${g.history_rows} (${g.history_30d} in the last 30 days)`);
console.log(`  comments        ${g.comment_rows}`);
if (g.history_30d > 0) {
  const perDay = g.history_30d / 30;
  console.log(`  ≈ ${perDay.toFixed(1)} history rows/day → ${(perDay * 365).toFixed(0)}/year`);
}

const limits = await client.query(
  "select name, coalesce(pg_size_pretty(pg_total_relation_size(c.oid)), '0') as size from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname like 'faculty_%' order by 1 limit 0",
);
void limits;

console.log("\nFree-tier budget: 500 MB database · 5 GB egress · 1 GB file storage (Supabase Pro $5 removes the pause and adds PITR backups).");
await client.end();
