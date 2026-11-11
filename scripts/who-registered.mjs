// Who has registered so far? (auth users + faculty profiles)
import pg from "pg";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const users = await client.query(
  `select id, email, created_at, confirmed_at, last_sign_in_at
   from auth.users order by created_at desc limit 12`,
);
console.log("auth users:");
for (const u of users.rows) {
  console.log(
    `  ${u.email}  created=${String(u.created_at).slice(0, 19)}  confirmed=${u.confirmed_at ? "yes" : "no"}  last_sign_in=${u.last_sign_in_at ? String(u.last_sign_in_at).slice(0, 19) : "-"}`,
  );
}

const profiles = await client.query(
  `select id, email, name, department, role from public.faculty_profiles order by email`,
);
console.log("\nfaculty profiles:");
for (const p of profiles.rows) {
  console.log(`  ${p.email}  ${p.role}  "${p.name}" — ${p.department}`);
}

await client.end();
