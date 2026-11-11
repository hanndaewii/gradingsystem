// ═══════════════════════════════════════════════════════════════════════════════
// Seed the live Supabase project with the demo dataset (WO-B).
//
//   node --env-file=.env scripts/seed-supabase.mjs            # idempotent
//   node --env-file=.env scripts/seed-supabase.mjs --force    # wipe + re-seed
//
// 1. Creates the three demo auth users via the Supabase Admin API
//    (SUPABASE_SECRET_KEY — server-side only). Existing users are REUSED.
// 2. Bundles src/data/seed.ts with esbuild at runtime and imports buildSeed()
//    — the app's own seed is the single source of truth.
// 3. Maps the seed (camelCase fields, readable string ids) into the faculty.*
//    tables (uuid PKs, snake_case columns) with batched pg inserts.
//
// KNOWN SCHEMA ISSUE (worked around here, must be fixed by the schema owner):
// public.faculty_assert_period_not_submitted() references assessments.period /
// new.period, but public.faculty_assessments has period_id instead — so EVERY insert
// into public.faculty_assessments / public.faculty_grades fails with
//   'record "new" has no field "period"'.
// While seeding we therefore disable trg_assessments_period_lock and
// trg_grades_period_lock INSIDE the seed transaction and re-enable them before
// commit (a rollback restores them automatically).
//
// Existing-seed detection and verification are scoped by the demo EMAILS (via
// public.faculty_profiles), so they stay correct even if the auth Admin API is
// unreachable in a given run.
// ═══════════════════════════════════════════════════════════════════════════════

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import crypto from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const root = fileURLToPath(new URL("..", import.meta.url));
const force = process.argv.includes("--force");
const uuid = () => crypto.randomUUID();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const k of ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "DATABASE_URL"]) {
  if (!process.env[k]) {
    console.error(`missing env ${k} — run with: node --env-file=.env scripts/seed-supabase.mjs`);
    process.exit(1);
  }
}

// ── bundle src/data/seed.ts at runtime and import buildSeed() ────────────────
async function loadSeedModule() {
  const outDir = join(os.tmpdir(), "opencode");
  mkdirSync(outDir, { recursive: true });
  const outfile = join(outDir, "seed.mjs");
  const esbuildBin = fileURLToPath(new URL("../node_modules/esbuild/bin/esbuild", import.meta.url));
  if (!existsSync(esbuildBin)) throw new Error("esbuild not found in node_modules — run npm install");
  execFileSync(
    process.execPath,
    [esbuildBin, join(root, "src", "data", "seed.ts"), "--bundle", "--format=esm", "--platform=node", "--log-level=warning", `--outfile=${outfile}`],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    return { mod: await import(pathToFileURL(outfile).href), cleanup: () => rmSync(outfile, { force: true }) };
  } catch (err) {
    rmSync(outfile, { force: true });
    throw err;
  }
}

// ── demo auth accounts via the Admin API (reuse existing ids, retry on blips) ─
async function ensureAuthUsers(sb, accounts) {
  const ids = new Map(); // lowercase email -> auth uuid
  let keyRejected = false; // the admin API refused the credential itself

  const isCredentialError = (msg) =>
    /jwt|permission|unauthori[sz]ed|forbidden|invalid.*(key|token)|not allowed|admin api/i.test(msg);

  for (const acct of accounts) {
    let id = null;
    let lastError = null;
    let wasCreated = false;

    for (let attempt = 1; attempt <= 3 && !id; attempt++) {
      if (attempt > 1) await sleep(1500);
      let created;
      try {
        created = await sb.auth.admin.createUser({
          email: acct.email,
          password: acct.password,
          email_confirm: true,
          user_metadata: { name: acct.name, role: acct.role, department: acct.department },
        });
      } catch (err) {
        lastError = err;
        continue;
      }
      if (!created.error) {
        id = created.data.user.id;
        wasCreated = true;
        break;
      }
      lastError = created.error;

      // exists (or createUser otherwise failed) → look the user up by email
      for (let page = 1; page <= 10 && !id; page++) {
        let listed;
        try {
          listed = await sb.auth.admin.listUsers({ page, perPage: 200 });
        } catch (err) {
          lastError = err;
          break;
        }
        if (listed.error) { lastError = listed.error; break; }
        const found = (listed.data.users ?? []).find((x) => (x.email ?? "").toLowerCase() === acct.email.toLowerCase());
        if (found) { id = found.id; break; }
        if ((listed.data.users?.length ?? 0) < 200) break;
      }
    }

    if (id) {
      ids.set(acct.email.toLowerCase(), id);
      console.log(`auth ${acct.email}: ${wasCreated ? "created" : "reused"}  id=${id}`);
    } else {
      const msg = String(lastError?.message ?? lastError ?? "unknown error");
      if (isCredentialError(msg)) keyRejected = true;
      console.error(`auth ${acct.email}: FAILED after 3 attempts — ${msg}`);
    }
  }
  return { ids, keyRejected };
}

// ── batched multi-row insert ──────────────────────────────────────────────────
async function insertBatch(client, table, cols, rows, casts = [], { chunkSize = 400, suffix = "" } = {}) {
  if (rows.length === 0) return;
  const colSql = cols.map((c) => `"${c}"`).join(", ");
  for (let i = 0; i < rows.length; i += chunkSize) {
    const params = [];
    const tuples = rows.slice(i, i + chunkSize).map((row) =>
      `(${row.map((v, ci) => { params.push(v === undefined ? null : v); return `$${params.length}${casts[ci] ?? ""}`; }).join(", ")})`);
    await client.query(`insert into ${table} (${colSql}) values ${tuples.join(", ")}${suffix}`, params);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  const { mod: seedMod, cleanup } = await loadSeedModule();
  try {
    const seed = seedMod.buildSeed();

    // Demo accounts: emails/passwords/roles from DEMO_ACCOUNTS, names/departments/
    // bios from buildSeed().profiles — the app's seed stays the source of truth.
    const accounts = seedMod.DEMO_ACCOUNTS.map((a) => {
      const p = seed.profiles.find((x) => x.email === a.email);
      if (!p) throw new Error(`seed profile missing for demo account ${a.email}`);
      return { email: a.email, password: a.password, role: a.role, name: p.name, department: p.department, bio: p.bio, seedId: p.id };
    });
    const emails = accounts.map((a) => a.email);

    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.log("── auth users (Supabase Admin API) ──");
    const { ids: authMap, keyRejected } = await ensureAuthUsers(sb, accounts);
    const missing = accounts.filter((a) => !authMap.has(a.email.toLowerCase()));
    const authFailed = missing.length > 0;

    if (authFailed && !keyRejected) {
      // transient network failure — aborting beats seeding half a dataset
      console.error("\ntransient failure reaching the auth server (see above) — nothing was changed; re-run the script.");
      process.exit(1);
    }
    if (keyRejected) {
      console.error("\nthe Supabase Admin API rejected the credential — reporting verbatim above.");
      console.error("public.faculty_profiles.id references auth.users.id, so profiles/courses cannot be seeded without it.");
      console.error("continuing with the SQL-side steps that are still possible (terms; verification).");
    }

    const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const dbUrl = new URL(process.env.DATABASE_URL);
    console.log(`\n── database (transaction pooler) ──\nconnected to ${dbUrl.hostname}${dbUrl.pathname}`);

    // Email-based scopes: correct regardless of which auth ids resolved this run.
    const profScope = `in (select id from public.faculty_profiles where email = any($1))`;
    const sectionScope = `in (select s.id from public.faculty_sections s
      join public.faculty_courses c on c.id = s.course_id where c.professor_id ${profScope})`;

    let committed = false;
    try {
      await client.query("begin");

      // The period-guard triggers are broken against the applied schema (see file
      // header) — disable them for the seed transaction, re-enable before commit.
      for (const [table, trigger] of [
        ["public.faculty_assessments", "trg_assessments_period_lock"],
        ["public.faculty_grades", "trg_grades_period_lock"],
      ]) {
        try {
          await client.query(`alter table ${table} disable trigger ${trigger}`);
        } catch (err) {
          console.log(`note: could not disable ${trigger} (${err.message.split("\n")[0]}) — inserts may still work`);
        }
      }

      if (force && authFailed) {
        console.log("\n--force skipped: not all demo auth users resolved — refusing to wipe without the ability to re-seed.");
      } else if (force) {
        console.log("\n── --force: wiping demo rows ──");
        const hist = await client.query(
          `delete from public.faculty_grade_history where section_id ${sectionScope}`,
          [emails],
        );
        const profs = await client.query(`delete from public.faculty_profiles where email = any($1)`, [emails]);
        // cascade removed courses → sections → periods/assessments/students/grades/comments;
        // sweep history rows left dangling by on-delete-set-null FKs
        const orphans = await client.query(
          `delete from public.faculty_grade_history gh where not exists (select 1 from public.faculty_sections s where s.id = gh.section_id)`,
        );
        const terms = await client.query(
          `delete from public.faculty_terms t where not exists (select 1 from public.faculty_courses c where c.term_id = t.id)`,
        );
        console.log(`wiped: grade_history=${hist.rowCount} profiles=${profs.rowCount} (courses/sections/… cascaded) dangling_history=${orphans.rowCount} unused_terms=${terms.rowCount}`);
      } else if (authFailed) {
        console.log("skipping stale-profile cleanup (auth admin API failed this run — leaving existing rows untouched)");
      } else {
        // drop demo profile rows that point at a different (stale) auth id —
        // cascades any dataset built under them so the reseed starts clean
        const authIds = [...authMap.values()];
        const stale = await client.query(
          `delete from public.faculty_profiles where email = any($1) and id <> all($2) returning email`,
          [emails, authIds],
        );
        if (stale.rowCount) console.log(`removed ${stale.rowCount} stale demo profile row(s)`);
      }

      if (!authFailed) {
        // ── profiles ──
        await insertBatch(
          client, "public.faculty_profiles",
          ["id", "email", "name", "department", "bio", "role"],
          accounts.map((a) => [authMap.get(a.email.toLowerCase()), a.email, a.name, a.department, a.bio, a.role]),
          [], { suffix: " on conflict (id) do nothing" },
        );
        console.log("profiles: ensured 3 demo rows");
      }

      // ── terms (from the seed's academic years/semesters) ──
      const termPairs = [...new Set(seed.courses.map((c) => `${c.academicYear}|${c.semester}`))];
      for (const pair of termPairs) {
        const [ay, sem] = pair.split("|");
        await client.query(
          `insert into public.faculty_terms (academic_year, semester) values ($1, $2)
           on conflict (academic_year, semester) do nothing`,
          [ay, Number(sem)],
        );
      }
      const termRows = await client.query(`select id, academic_year, semester from public.faculty_terms`);
      const termMap = new Map(termRows.rows.map((r) => [`${r.academic_year}|${r.semester}`, r.id]));
      console.log(`terms: ${termPairs.length} in use (${termPairs.join(", ")})`);

      // ── existing dataset? (email-scoped, auth-id independent) ──
      const sectionCount = (await client.query(
        `select count(*)::int as n from public.faculty_sections s
         join public.faculty_courses c on c.id = s.course_id
         where c.professor_id ${profScope}`,
        [emails],
      )).rows[0].n;

      const seedProfileAuth = (seedProfileId) => {
        const p = seed.profiles.find((x) => x.id === seedProfileId);
        return (p && authMap.get(p.email.toLowerCase())) || authMap.get(accounts[0].email.toLowerCase()) || null;
      };

      if (sectionCount > 0 && !force) {
        console.log(`\nexisting seed detected (${sectionCount} sections for the demo professors) — skipping dataset insert.`);
        console.log("run with --force to wipe and re-seed.");
      } else if (authFailed) {
        console.log("\nskipping dataset insert (not all demo auth users resolved this run).");
      } else {
        console.log("\n── seeding demo dataset ──");

        // courses (on conflict do nothing + select-back → reuse pre-existing rows)
        await insertBatch(
          client, "public.faculty_courses",
          ["id", "professor_id", "term_id", "code", "title", "created_at"],
          seed.courses.map((c) => [
            uuid(), authMap.get(seed.profiles.find((p) => p.id === c.professorId).email.toLowerCase()),
            termMap.get(`${c.academicYear}|${c.semester}`), c.code, c.title, c.createdAt,
          ]),
          [], { suffix: " on conflict (professor_id, term_id, code) do nothing" },
        );
        const courseId = new Map();
        const dbCourses = (await client.query(
          `select id, professor_id, term_id, code from public.faculty_courses where professor_id ${profScope}`, [emails],
        )).rows;
        for (const c of seed.courses) {
          const profAuth = authMap.get(seed.profiles.find((p) => p.id === c.professorId).email.toLowerCase());
          const row = dbCourses.find((r) => r.professor_id === profAuth && r.term_id === termMap.get(`${c.academicYear}|${c.semester}`) && r.code === c.code);
          courseId.set(c.id, row.id);
        }
        console.log(`courses: ${courseId.size}`);

        // sections
        const sectionId = new Map();
        await insertBatch(
          client, "public.faculty_sections",
          ["id", "course_id", "name", "schedule", "room", "display_scale", "scale_table", "period_weights", "enforce_order", "unlocked_periods", "created_at"],
          seed.sections.map((s) => {
            const id = uuid();
            sectionId.set(s.id, id);
            return [id, courseId.get(s.courseId), s.name, s.schedule, s.room, s.displayScale,
              JSON.stringify(s.scaleTable), JSON.stringify(s.periodWeights), s.enforceOrder, s.unlockedPeriods, s.createdAt];
          }),
          ["", "", "", "", "", "", "::jsonb", "::jsonb", "", "", ""],
        );
        console.log(`sections: ${sectionId.size}`);

        // periods — one row per (section, period), final status + submitted_at
        const periodId = new Map();
        const periodRows = [];
        for (const [secSeedId, states] of Object.entries(seed.periodStates)) {
          for (const [period, st] of Object.entries(states)) {
            const id = uuid();
            periodId.set(`${secSeedId}|${period}`, id);
            periodRows.push([id, sectionId.get(secSeedId), period, st.status, st.submittedAt]);
          }
        }
        await insertBatch(client, "public.faculty_periods", ["id", "section_id", "period", "status", "submitted_at"], periodRows);
        console.log(`periods: ${periodRows.length}`);

        // assessments
        const assessmentId = new Map();
        await insertBatch(
          client, "public.faculty_assessments",
          ["id", "section_id", "period_id", "name", "max_score", "weight", "group_key", "order"],
          seed.assessments.map((a) => {
            const id = uuid();
            assessmentId.set(a.id, id);
            return [id, sectionId.get(a.sectionId), periodId.get(`${a.sectionId}|${a.period}`), a.name, a.maxScore, a.weight, a.group, a.order];
          }),
        );
        console.log(`assessments: ${assessmentId.size}`);

        // students
        const studentId = new Map();
        await insertBatch(
          client, "public.faculty_students",
          ["id", "section_id", "student_no", "name"],
          seed.students.map((s) => {
            const id = uuid();
            studentId.set(s.id, id);
            return [id, sectionId.get(s.sectionId), s.studentNo, s.name];
          }),
        );
        console.log(`students: ${studentId.size}`);

        // grades
        const gradeRows = seed.grades.map((g) => [
          uuid(), sectionId.get(g.sectionId), assessmentId.get(g.assessmentId), studentId.get(g.studentRowId), g.score, g.updatedAt,
        ]);
        await insertBatch(
          client, "public.faculty_grades",
          ["id", "section_id", "assessment_id", "student_id", "score", "updated_at"],
          gradeRows,
        );
        console.log(`grades: ${gradeRows.length}`);

        // grade_history (seed actor profile → auth uuid; falls back to the admin)
        const historyRows = seed.history.map((h) => [
          uuid(), sectionId.get(h.sectionId), h.kind, h.period,
          h.assessmentId ? assessmentId.get(h.assessmentId) : null,
          h.studentRowId ? studentId.get(h.studentRowId) : null,
          h.oldScore, h.newScore, h.at, seedProfileAuth(h.actorId), h.detail ?? null,
        ]);
        await insertBatch(
          client, "public.faculty_grade_history",
          ["id", "section_id", "kind", "period", "assessment_id", "student_id", "old_score", "new_score", "at", "actor_id", "detail"],
          historyRows,
        );
        console.log(`grade_history: ${historyRows.length}`);

        // comments
        const commentRows = seed.comments.map((c) => [
          uuid(), sectionId.get(c.sectionId), c.period, seedProfileAuth(c.authorId), c.body, c.at,
        ]);
        await insertBatch(
          client, "public.faculty_comments",
          ["id", "section_id", "period", "author_id", "body", "at"],
          commentRows,
        );
        console.log(`comments: ${commentRows.length}`);
      }

      // ── re-enable the period-guard triggers and confirm ──
      for (const [table, trigger] of [
        ["public.faculty_assessments", "trg_assessments_period_lock"],
        ["public.faculty_grades", "trg_grades_period_lock"],
      ]) {
        try {
          await client.query(`alter table ${table} enable trigger ${trigger}`);
        } catch { /* was never disabled */ }
      }
      const trig = await client.query(
        `select tgname, tgenabled from pg_trigger
         where tgname in ('trg_assessments_period_lock', 'trg_grades_period_lock') and not tgisinternal`,
      );
      console.log(`\nperiod-guard triggers: ${trig.rows.map((r) => `${r.tgname}=${r.tgenabled === "O" ? "enabled" : r.tgenabled}`).join(", ")}`);

      await client.query("commit");
      committed = true;
      console.log("committed.");

      // ── verification (email-scoped) ──
      console.log("\n── row counts (demo dataset) ──");
      const countQueries = [
        ["profiles", `select count(*)::int as n from public.faculty_profiles where email = any($1)`, [emails]],
        ["terms", `select count(*)::int as n from public.faculty_terms`, []],
        ["courses", `select count(*)::int as n from public.faculty_courses where professor_id ${profScope}`, [emails]],
        ["sections", `select count(*)::int as n from public.faculty_sections where id ${sectionScope}`, [emails]],
        ["periods", `select count(*)::int as n from public.faculty_periods where section_id ${sectionScope}`, [emails]],
        ["assessments", `select count(*)::int as n from public.faculty_assessments where section_id ${sectionScope}`, [emails]],
        ["students", `select count(*)::int as n from public.faculty_students where section_id ${sectionScope}`, [emails]],
        ["grades", `select count(*)::int as n from public.faculty_grades where section_id ${sectionScope}`, [emails]],
        ["grade_history", `select count(*)::int as n from public.faculty_grade_history where section_id ${sectionScope}`, [emails]],
        ["comments", `select count(*)::int as n from public.faculty_comments where section_id ${sectionScope}`, [emails]],
      ];
      for (const [label, sql, params] of countQueries) {
        const n = (await client.query(sql, params)).rows[0].n;
        console.log(`  ${label.padEnd(14)} ${n}`);
      }

      console.log("\n── demo logins (password: demo1234) ──");
      for (const a of accounts) {
        const id = authMap.get(a.email.toLowerCase()) ?? "(admin API failed this run — see above)";
        console.log(`  ${a.email.padEnd(24)} ${a.role.padEnd(10)} ${a.name.padEnd(20)} ${id}`);
      }

      if (authFailed) {
        console.log("\nSEED INCOMPLETE — auth admin API failure (see above); existing data untouched.");
        process.exitCode = 1;
      } else {
        console.log("\nSEED OK");
      }
    } catch (err) {
      await client.query("rollback").catch(() => {});
      console.error(committed ? "\npost-commit step failed:" : "\nSQL seeding failed — transaction rolled back:", err.message);
      throw err;
    } finally {
      await client.end().catch(() => {});
    }
  } finally {
    cleanup();
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message);
  process.exit(1);
});
