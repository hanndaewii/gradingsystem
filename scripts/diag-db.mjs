// Diagnostic: where did the faculty tables land?
import pg from "pg";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const db = await client.query("select current_database() as db, current_user as usr, inet_server_addr()::text as host");
console.log("connected:", db.rows[0]);
const ns = await client.query("select oid, nspname from pg_namespace where nspname like '%faculty%'");
console.log("faculty namespaces:", ns.rows);
const rel = await client.query(
  `select n.nspname, c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname not in ('pg_catalog','information_schema','pg_toast')
     and c.relkind in ('r','v')
     and (n.nspname = 'faculty' or c.relname like 'faculty%')
   order by 1, 2`,
);
console.log("faculty relations:", rel.rows);
const pol = await client.query("select schemaname, tablename, policyname from pg_policies where schemaname = 'faculty'");
console.log("faculty policies:", pol.rows.length);
await client.end();
