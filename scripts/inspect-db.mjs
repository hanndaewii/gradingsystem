// Read-only inspection of the target database: lists schemas, tables, and the
// shape of any tables whose names collide with the portal's schema.
//   node --env-file=.env scripts/inspect-db.mjs
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const schemas = await client.query(
  "select schema_name from information_schema.schemata where schema_name not like 'pg_%' and schema_name <> 'information_schema' order by 1",
);
console.log("schemas:", schemas.rows.map((r) => r.schema_name).join(", "));

const tables = await client.query(
  `select table_schema, table_name from information_schema.tables
   where table_schema in ('public','faculty') and table_type = 'BASE TABLE'
   order by table_schema, table_name`,
);
console.log("\npublic/faculty tables:");
for (const t of tables.rows) console.log(`  ${t.table_schema}.${t.table_name}`);

for (const name of ["profiles", "courses", "students", "terms", "classes"]) {
  const cols = await client.query(
    `select column_name, data_type from information_schema.columns
     where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [name],
  );
  if (cols.rows.length === 0) continue;
  let count = "n/a";
  try {
    const c = await client.query(`select count(*)::int as n from public."${name}"`);
    count = c.rows[0].n;
  } catch {
    /* ignore */
  }
  console.log(`\npublic.${name} (${count} rows):`);
  console.log("  " + cols.rows.map((c) => `${c.column_name}:${c.data_type}`).join(", "));
}

const rls = await client.query(
  `select tablename, policyname from pg_policies where schemaname = 'public' order by tablename limit 25`,
);
console.log("\nexisting RLS policies (public):");
for (const p of rls.rows) console.log(`  ${p.tablename}: ${p.policyname}`);

await client.end();
