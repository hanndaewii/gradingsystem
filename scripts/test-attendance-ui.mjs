// One-off: drive a real browser (headless Edge via CDP) to prove the
// attendance cells accept typing and save to the live database.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "http://localhost:5173";
const EMAIL = process.env.HEAD_EMAIL;
const PASSWORD = process.env.PROF_PASSWORD;
const PORT = 9333;

let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── the live API, so we can read the database back ─────────────────────────
import { execFileSync } from "node:child_process";
const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);
const bundle = join(mkdtempSync(join(tmpdir(), "faculty-api-")), "api.cjs");
execFileSync(
  process.execPath,
  [
    join(process.cwd(), "node_modules/esbuild/bin/esbuild"),
    "src/api/supabase.ts",
    "--bundle",
    "--format=cjs",
    "--platform=node",
    `--define:import.meta.env=${JSON.stringify({
      VITE_SUPABASE_URL: process.env.SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    })}`,
    `--outfile=${bundle}`,
  ],
  { stdio: "ignore" },
);
const { createSupabaseApi } = require(bundle);
const dbApi = createSupabaseApi();
await dbApi.signInWithRole(EMAIL, PASSWORD, "professor");
let dbSectionId = "";
let dbStudents = [];
const listAttendance = async () => dbApi.listAttendance(dbSectionId);
const firstStudentId = async () => dbStudents[0].id;

// ── launch the browser ─────────────────────────────────────────────────────
const profile = mkdtempSync(join(tmpdir(), "faculty-cdp-"));
const browser = spawn(EDGE, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--window-size=1440,1000",
  "about:blank",
], { stdio: "ignore" });

async function waitForDevtools() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("devtools never came up");
}

let ws;
let nextId = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error(
      `${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ""}`,
    );
  }
  return res.result.value;
}

async function waitFor(fn, timeout = 20000, every = 300) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await evaluate(fn);
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for: ${fn.slice(0, 90)}`);
    await sleep(every);
  }
}

try {
  await waitForDevtools();

  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
  ).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");

  // ── sign in ──────────────────────────────────────────────────────────────
  await send("Page.navigate", { url: APP });
  await waitFor(`document.querySelector("#sh-login-email") != null`);
  await evaluate(`
    (() => {
      const set = (el, v) => {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        d.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      set(document.querySelector("#sh-login-email"), ${JSON.stringify(EMAIL)});
      set(document.querySelector("#sh-login-password"), ${JSON.stringify(PASSWORD)});
      return true;
    })()
  `);
  await evaluate(`document.querySelector("form.sh-login__form").requestSubmit(); true`);
  await waitFor(`!document.querySelector("#sh-login-email")`, 30000);
  await sleep(1500);
  ok(true, `signed in as ${EMAIL} (professor)`);

  // ── open the section's attendance view ───────────────────────────────────
  await evaluate(`location.href = ${JSON.stringify(`${APP}/`)}; true`);
  await sleep(2000);
  const sectionHref = await waitFor(`
    (() => {
      const a = document.querySelector('a[href^="/sections/"]');
      return a ? a.getAttribute("href") : null;
    })()
  `);
  const base = sectionHref.split("?")[0];
  dbSectionId = base.replace("/sections/", "");
  dbStudents = await dbApi.listStudents(dbSectionId);
  await evaluate(`location.href = ${JSON.stringify(`${APP}${base}?view=attendance`)}; true`);
  await sleep(2500);

  const panel = await waitFor(`document.querySelector(".sec-att__table") != null`);
  ok(panel, "the attendance sheet rendered");

  // ── the cells must be typeable ───────────────────────────────────────────
  const cellInfo = await evaluate(`
    (() => {
      const el = document.querySelector(".sec-att__input");
      if (!el) return null;
      return { disabled: el.disabled, readonly: el.readOnly, value: el.value };
    })()
  `);
  ok(cellInfo != null, "an attendance cell exists");
  ok(cellInfo?.disabled === false, `the cell is NOT disabled (disabled=${cellInfo?.disabled})`);

  // type "p" into the first cell
  await evaluate(`document.querySelector(".sec-att__input").focus(); true`);
  await send("Input.insertText", { text: "p" });
  await sleep(400);
  const afterType = await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      const first = cells[0];
      return {
        value: first.value,
        cls: first.className,
        focused: document.activeElement === first,
        focusedIndex: cells.indexOf(document.activeElement),
      };
    })()
  `);
  ok(afterType?.value === "p", `typing "p" lands in the cell (value="${afterType?.value}")`);
  ok(/is-p/.test(afterType?.cls ?? ""), "the cell turns green (present)");
  ok(
    afterType?.focusedIndex === 1,
    `focus advances to the next student (index ${afterType?.focusedIndex})`,
  );

  // typing "a" over "p" must replace it (focus selects the old mark)
  await evaluate(`document.querySelectorAll(".sec-att__input")[1].focus(); true`);
  await send("Input.insertText", { text: "a" });
  await sleep(400);
  const afterReplace = await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      return { v0: cells[0].value, v1: cells[1].value, cls1: cells[1].className };
    })()
  `);
  ok(
    afterReplace?.v1 === "a" && /is-a/.test(afterReplace?.cls1 ?? ""),
    `typing "a" replaces the mark (value="${afterReplace?.v1}")`,
  );

  // an invalid character must not stick
  await evaluate(`document.querySelectorAll(".sec-att__input")[2].focus(); true`);
  await send("Input.insertText", { text: "z" });
  await sleep(400);
  const afterInvalid = await evaluate(
    `document.querySelectorAll(".sec-att__input")[2].value`,
  );
  ok(afterInvalid === "", `an invalid letter is rejected (value="${afterInvalid}")`);

  // ── the marks must reach the database ────────────────────────────────────
  await sleep(2500);
  const saved = await evaluate(`
    (async () => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      const name = document.querySelector(".sec-att__table tbody tr .sec-table__name").textContent;
      return { name, cells: cells.slice(0, 3).map((c) => c.value) };
    })()
  `);
  console.log(`   marked: ${saved?.name} → ${JSON.stringify(saved?.cells)}`);

  // read the live database back
  const dbRows = await listAttendance();
  const firstStudent = await firstStudentId();
  const dbMarks = dbRows
    .filter((r) => r.studentRowId === firstStudent)
    .map((r) => `${r.sessionDate}=${r.status}`);
  ok(
    dbMarks.some((m) => m.endsWith("=p")) && dbMarks.some((m) => m.endsWith("=a")),
    `the marks are in the live database (${dbMarks.join(", ")})`,
  );

  // clean up: clear the three cells we touched
  for (const i of [0, 1, 2]) {
    await evaluate(`
      (() => {
        const el = document.querySelectorAll(".sec-att__input")[${i}];
        el.focus();
        return true;
      })()
    `);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    await sleep(600);
  }
  await sleep(1500);
  const cleared = await evaluate(
    `[...document.querySelectorAll(".sec-att__input")].slice(0, 3).map((c) => c.value)`,
  );
  ok(
    JSON.stringify(cleared) === JSON.stringify(["", "", ""]),
    `the cells can be cleared again (${JSON.stringify(cleared)})`,
  );

  // ── the term headers switch the calendar ─────────────────────────────────
  const terms = await evaluate(`
    [...document.querySelectorAll(".sec-att__term")].map((b) => b.textContent.trim())
  `);
  ok(
    JSON.stringify(terms) === JSON.stringify(["Prelim", "Midterm", "Pre-Finals", "Finals"]),
    `the term headers are ${JSON.stringify(terms)}`,
  );
  await evaluate(`document.querySelectorAll(".sec-att__term")[1].click(); true`);
  await sleep(800);
  const activeTerm = await evaluate(
    `document.querySelector(".sec-att__term.is-active")?.textContent.trim()`,
  );
  ok(activeTerm === "Midterm", `clicking a term header switches to it (${activeTerm})`);

  const calCells = await evaluate(`document.querySelectorAll(".sec-cal__cell:not(.is-empty)").length`);
  ok(calCells >= 28, `the month calendar is drawn (${calCells} days)`);

  console.log(failures === 0 ? "\nbrowser check passed" : `\n${failures} CHECK(S) FAILED`);
} catch (err) {
  failures += 1;
  console.error("browser check crashed:", err);
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  browser.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}

process.exit(failures === 0 ? 0 : 1);
