// Marks attendance in the browser, then checks the gradebook shows the score
// straight away — no page reload, no waiting for a refetch.
//
// The cells it touches are put back exactly as they were.
//   node --env-file=.env scripts/test-attendance-instant-ui.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "https://gradingsystem.hanndaaewii.workers.dev";
const PORT = 9338;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

const profile = mkdtempSync(join(tmpdir(), "faculty-inst-"));
const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--window-size=1600,1200",
  "about:blank",
], { stdio: "ignore" });

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
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
  return res.result.value;
}
async function waitFor(fn, timeout = 30000) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await evaluate(fn);
    if (v) return v;
    if (Date.now() > end) throw new Error(`timeout: ${fn.slice(0, 90)}`);
    await sleep(250);
  }
}
async function typeIn(index, letter) {
  await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      if (!cells[${index}]) return false;
      cells[${index}].focus();
      return true;
    })()
  `);
  await send("Input.insertText", { text: letter });
  await sleep(300);
}
async function clearCell(index) {
  await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      if (!cells[${index}]) return false;
      cells[${index}].focus();
      return true;
    })()
  `);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await sleep(500);
}

const TOUCHED = [0, 1, 2];

// ── the live API, so the expected score can be computed ────────────────────
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
await dbApi.signInWithRole(process.env.HEAD_EMAIL, process.env.PROF_PASSWORD, "professor");

/**
 * The score the criterion must hold after the three test marks: the average
 * credit over every marked day of the Prelim period (blank days ignored).
 */
async function expectedScore(sectionId, studentId, changes) {
  const rows = (await dbApi.listAttendance(sectionId)).filter(
    (r) => r.studentRowId === studentId && r.period === "prelim",
  );
  const map = new Map(rows.map((r) => [r.sessionDate, r.status]));
  for (const [day, status] of changes) map.set(day, status);
  const list = [...map.values()];
  const credit = list.reduce(
    (sum, st) => sum + (st === "p" ? 1 : st === "l" ? 0.75 : 0),
    0,
  );
  return Math.round((credit / list.length) * 100 * 100) / 100;
}

try {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) break;
    } catch { /* wait */ }
    await sleep(250);
  }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", rej);
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
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });

  await send("Page.navigate", { url: APP });
  await waitFor(`document.querySelector("#sh-login-email") != null`);
  await evaluate(`
    (() => {
      const set = (el, v) => {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        d.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      set(document.querySelector("#sh-login-email"), ${JSON.stringify(process.env.HEAD_EMAIL)});
      set(document.querySelector("#sh-login-password"), ${JSON.stringify(process.env.PROF_PASSWORD)});
      document.querySelector("form.sh-login__form").requestSubmit();
      return true;
    })()
  `);
  await waitFor(`!document.querySelector("#sh-login-email")`, 30000);
  await sleep(1500);
  await evaluate(`location.href = ${JSON.stringify(`${APP}/`)}; true`);
  await sleep(2000);
  const href = await waitFor(`
    (() => {
      const a = document.querySelector('a[href^="/sections/"]');
      return a ? a.getAttribute("href").split("?")[0] : null;
    })()
  `);
  const base = href.split("?")[0];
  const sectionId = base.replace("/sections/", "");
  const students = await dbApi.listStudents(sectionId);
  const studentId = students[0].id;

  await evaluate(`location.href = ${JSON.stringify(`${APP}${base}?view=attendance`)}; true`);
  await sleep(1200);
  await waitFor(`document.querySelector(".sec-att__table") != null`, 30000);
  await sleep(500);

  const original = await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      return ${JSON.stringify(TOUCHED)}.map((i) => (cells[i] ? cells[i].value : ""));
    })()
  `);
  console.log(`   the cells start as ${JSON.stringify(original)}`);

  // the three days the test touches — read them off the sheet's month
  const monthLabel = await evaluate(
    `document.querySelector(".sec-att__month")?.textContent.trim()`,
  );
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const m = /^(\w+)\s+(\d{4})$/.exec(monthLabel ?? "");
  if (!m) throw new Error(`could not read the month from "${monthLabel}"`);
  const year = Number(m[2]);
  const monthIndex = MONTHS.indexOf(m[1]);
  const visibleDays = [];
  const total = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= total; d += 1) {
    const date = new Date(year, monthIndex, d);
    if (date.getDay() === 0) continue; // Sundays are hidden by default
    visibleDays.push(
      `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  const changes = [
    [visibleDays[0], "p"],
    [visibleDays[1], "l"],
    [visibleDays[2], "a"],
  ];
  console.log(`   the test touches ${changes.map(([d]) => d).join(", ")}`);

  // what the criterion must hold now
  const want = await expectedScore(sectionId, studentId, changes);
  console.log(`   the Attendance score must be ${want}`);

  // mark three days: p, l, a
  const t0 = Date.now();
  for (const [i, letter] of ["p", "l", "a"].entries()) {
    await typeIn(i, letter);
  }
  console.log(`   three marks typed in ${Date.now() - t0} ms`);

  // switch to the gradebook without reloading the page (a client-side nav)
  await evaluate(`
    (() => {
      const btn = [...document.querySelectorAll(".sec-sidenav__item")]
        .find((b) => b.textContent.trim().startsWith("Gradebook"));
      if (btn) { btn.click(); return true; }
      return false;
    })()
  `);
  await sleep(800);
  await waitFor(`document.querySelector(".sec-table") != null`, 20000);
  await sleep(500);

  const cell = await evaluate(`
    (() => {
      const rows = [...document.querySelectorAll(".sec-table tbody tr")];
      if (!rows[0]) return null;
      const inputs = [...rows[0].querySelectorAll("input")];
      const tds = [...rows[0].querySelectorAll("td")];
      return {
        first: inputs[0] ? inputs[0].value : null,
        weight: tds[2] ? tds[2].textContent.trim() : null,
      };
    })()
  `);
  // p + l + a over the marked days of the period
  ok(cell?.first === String(want), `the gradebook shows the new score right away (${cell?.first}, expected ${want})`);
  const wantWeight = `${Math.round((want / 100) * 10 * 100) / 100}%`;
  ok(cell?.weight === wantWeight, `the weight column follows (${cell?.weight}, expected ${wantWeight})`);

  const note = await evaluate(`
    (() => {
      location.href = location.pathname + "?view=attendance";
      return true;
    })()
  `);
  await sleep(1500);
  await waitFor(`document.querySelector(".sec-att__note") != null`, 20000);
  const noteText = await evaluate(`document.querySelector(".sec-att__note").textContent.trim()`);
  ok(/blank days are not counted/i.test(noteText), `the sheet explains the blank days ("${noteText}")`);

  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync("scripts/tmp-attendance-note.png", Buffer.from(shot.data, "base64"));

  // put the cells back
  for (let i = 0; i < TOUCHED.length; i += 1) {
    const want = original[i] ?? "";
    if (want === "") await clearCell(i);
    else await typeIn(i, want);
  }
  await sleep(2000);
  const restored = await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      return ${JSON.stringify(TOUCHED)}.map((i) => (cells[i] ? cells[i].value : ""));
    })()
  `);
  ok(
    JSON.stringify(restored) === JSON.stringify(original),
    `the cells are back as they were (${JSON.stringify(restored)})`,
  );

  console.log(failures === 0 ? "\ninstant gradebook verified" : `\n${failures} CHECK(S) FAILED`);
} catch (err) {
  failures += 1;
  console.error("crashed:", err);
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  browser.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exit(failures === 0 ? 0 : 1);
