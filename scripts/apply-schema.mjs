// Applies supabase/schema.sql to the project, statement by statement.
//   node --env-file=.env scripts/apply-schema.mjs
// Uses the transaction pooler by default; falls back to the direct connection.
import { readFileSync } from "node:fs";
import pg from "pg";

const candidates = [process.env.DATABASE_URL, process.env.DATABASE_URL_DIRECT].filter(Boolean);
const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

/** Split a SQL file into statements, keeping $$ … $$ bodies intact and
 *  ignoring `--` line comments (a stray ";" inside a comment must not split). */
function splitStatements(sql) {
  const out = [];
  let buf = "";
  let inDollar = false;
  for (let i = 0; i < sql.length; i++) {
    const two = sql.slice(i, i + 2);
    if (two === "$$") {
      inDollar = !inDollar;
      buf += two;
      i++;
      continue;
    }
    if (!inDollar && two === "--") {
      // skip the comment, keep the newline
      while (i < sql.length && sql[i] !== "\n") i++;
      buf += "\n";
      continue;
    }
    const ch = sql[i];
    if (ch === ";" && !inDollar) {
      const stmt = buf.trim();
      if (stmt.length > 0) out.push(stmt);
      buf = "";
      continue;
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail.length > 0) out.push(tail);
  return out;
}

const statements = splitStatements(schema);

let lastError = null;
for (const connectionString of candidates) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`connected via ${connectionString.includes(":6543") ? "pooler" : "direct"}`);
    let applied = 0;
    for (const stmt of statements) {
      const label = stmt.replace(/\s+/g, " ").slice(0, 90);
      try {
        await client.query(stmt);
        applied++;
      } catch (err) {
        console.error(`\nFAILED STATEMENT: ${label}\n  ${err.message}\n`);
        lastError = err;
        break;
      }
    }
    const { rows } = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    await client.end();
    console.log(`statements applied: ${applied}/${statements.length}`);
    console.log(`tables present: ${rows.map((r) => r.table_name).join(", ") || "(none)"}`);
    if (lastError === null) {
      console.log("schema applied successfully");
      process.exit(0);
    }
  } catch (err) {
    lastError = err;
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    console.warn(`connection failed: ${err.message.split("\n")[0]}`);
  }
}
process.exit(1);
