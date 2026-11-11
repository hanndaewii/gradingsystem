// Verifies RLS state on every faculty_* table in the live project.
//   node --env-file=.env scripts/verify-rls.mjs
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(`
  select c.relname                                   as table,
         c.relrowsecurity                             as rls_enabled,
         c.relforcerowsecurity                       as rls_forced,
         (select count(*) from pg_policies p
           where p.schemaname = 'public' and p.tablename = c.relname) as policies,
         (select count(*) from pg_policy pp
           where pp.polrelid = c.oid)                 as policy_rows
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'faculty_%'
  order by c.relname
`);

console.log("table                    RLS enabled   forced   policies");
for (const r of rows) {
  console.log(
    `${r.table.padEnd(24)} ${String(r.rls_enabled).padEnd(13)} ${String(r.rls_forced).padEnd(8)} ${r.policies}`,
  );
}

const off = rows.filter((r) => !r.rls_enabled);
console.log(
  off.length === 0
    ? `\n✓ all ${rows.length} faculty tables have RLS enabled`
    : `\n✗ RLS DISABLED on: ${off.map((r) => r.table).join(", ")}`,
);

const noPolicy = rows.filter((r) => r.policies === 0);
console.log(
  noPolicy.length === 0
    ? "✓ every table has at least one policy"
    : `✗ no policy on: ${noPolicy.map((r) => r.table).join(", ")}`,
);

const { rows: fns } = await client.query(
  `select proname, prosecdef as security_definer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and proname like 'faculty_%'`,
);
console.log("\nfunctions:", fns.map((f) => `${f.proname}(security_definer=${f.security_definer})`).join(", "));

const { rows: trig } = await client.query(
  `select tgname, tgenabled from pg_trigger where tgname like 'trg_%' and not tgisinternal`,
);
console.log("triggers:", trig.map((t) => `${t.tgname}=${t.tgenabled}`).join(", "));

await client.end();
