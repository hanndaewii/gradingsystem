// Shows the grading criteria of every section-period (and fixes the head's
// department to match the section naming).
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(`
  select s.name as section,
         p.period,
         string_agg(
           a.name || ' ' || coalesce(a.weight::text, '-') || '%' ||
           coalesce('[' || a.group_key || ']', ''),
           ' | ' order by a."order"
         ) as criteria
  from public.faculty_sections s
  join public.faculty_periods p on p.section_id = s.id
  left join public.faculty_assessments a on a.period_id = p.id
  group by s.name, p.period, p.id
  order by s.name, p.id
`);

for (const r of rows) {
  console.log(`  ${r.section} · ${r.period}: ${r.criteria ?? "(none)"}`);
}

const { rowCount } = await client.query(
  "update public.faculty_profiles set department = 'Business Administration' where email = $1",
  ["kristian.pasco30@gmail.com"],
);
console.log(`\nhead profile department updated (${rowCount} row)`);
await client.end();
