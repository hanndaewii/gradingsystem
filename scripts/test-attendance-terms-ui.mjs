// The new attendance behaviour, checked in a real browser:
//   node --env-file=.env scripts/test-attendance-terms-ui.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "https://gradingsystem.hanndaaewii.workers.dev";
const PORT = 9343;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

// ── the live API ───────────────────────────────────────────────────────────
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
const api = createSupabaseApi();
await api.signInWithRole(process.env.HEAD_EMAIL, process.env.PROF_PASSWORD, "professor");
const courses = await api.listCourses({ academicYear: "2025-2026", semester: 1 });
const section = (await api.listSections(courses[0].id))[0];
const student = (await api.listStudents(section.id))[0];
const SCRATCH = "2026-12-16";

const profile = mkdtempSync(join(tmpdir(), "faculty-terms-"));
const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1500,1100", "about:blank",
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
  await send("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false });

  const signIn = async () => {
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
    await sleep(1200);
  };

  await signIn();
  const go = async (url) => {
    await evaluate(`location.href = ${JSON.stringify(`${APP}${url}`)}; true`);
    await sleep(1200);
  };

  await go(`/sections/${section.id}?period=prelim`);
  await waitFor(`document.querySelector(".sec-att__table") != null`, 30000);
  await sleep(600);

  // ── 1 · no inner term buttons ────────────────────────────────────────────
  const terms = await evaluate(`
    (() => ({
      inner: document.querySelectorAll(".sec-att__term").length,
      headers: [...document.querySelectorAll("th.sec-att__rate")].map((h) => h.textContent.trim()),
      month: document.querySelector(".sec-att__month")?.textContent.trim(),
      noClassBtn: document.querySelector(".sec-att__noclass")?.textContent.trim() ?? null,
    }))()
  `);
  ok(terms?.inner === 0, `the panel has no term buttons of its own (${terms?.inner})`);
  ok(
    JSON.stringify(terms?.headers) === JSON.stringify(["Rate", "Term"]),
    `the sheet shows a month rate and a term rate (${JSON.stringify(terms?.headers)})`,
  );
  ok(terms?.noClassBtn != null, `there is a way to mark a no-class day ("${terms?.noClassBtn}")`);

  // ── 2 · the month follows the term's own dates ──────────────────────────
  await api.setTermDates(section.id, "prelim", "2026-11-01", "2026-11-30");
  await go(`/sections/${section.id}?period=prelim`);
  await waitFor(`document.querySelector(".sec-att__table") != null`, 30000);
  await sleep(600);
  const month = await evaluate(`document.querySelector(".sec-att__month")?.textContent.trim()`);
  ok(month === "November 2026", `the calendar follows the Prelim window (${month})`);

  const marked = await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      return {
        count: cells.length,
        values: cells.map((c) => c.value).filter(Boolean),
        disabled: cells.filter((c) => c.disabled).length,
      };
    })()
  `);
  ok((marked?.values?.length ?? 0) >= 1, `the November marks are on screen (${marked?.values?.length} marked)`);
  ok((marked?.disabled ?? 1) === 0, "the marks are editable (they belong to Prelim)");

  // ── 3 · a day belonging to another term is greyed with a tag ─────────────
  await api.setTermDates(section.id, "midterm", "2026-12-01", "2026-12-31");
  await api.setAttendance(section.id, "prelim", student.id, SCRATCH, "p");
  await go(`/sections/${section.id}?period=prelim`);
  await waitFor(`document.querySelector(".sec-att__table") != null`, 30000);
  await sleep(600);

  // the December day belongs to Midterm — find it by jumping to December
  await evaluate(`
    (() => {
      const btn = [...document.querySelectorAll(".sec-att__nav")].find((b) => b.getAttribute("aria-label") === "Next month");
      if (btn) btn.click();
      return true;
    })()
  `);
  await sleep(700);
  const december = await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".sec-att__input")];
      const ths = [...document.querySelectorAll(".sec-att__day")];
      const idx = ths.findIndex((th) => th.className.includes("is-other"));
      const tag = document.querySelector(".sec-att__daytag");
      return {
        month: document.querySelector(".sec-att__month")?.textContent.trim(),
        otherColumns: ths.filter((th) => th.className.includes("is-other")).length,
        tag: tag ? tag.textContent.trim() : null,
        firstDisabled: cells[0] ? cells[0].disabled : null,
      };
    })()
  `);
  ok(december?.month === "December 2026", `the month arrows still work (${december?.month})`);
  ok((december?.otherColumns ?? 0) >= 1, `another term's days are greyed (${december?.otherColumns} columns)`);
  ok(december?.tag === "Midterm", `the column carries a tag ("${december?.tag}")`);
  ok(december?.firstDisabled === true, "those days cannot be typed on");

  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync("scripts/tmp-terms.png", Buffer.from(shot.data, "base64"));

  // the tag jumps to the other term
  await evaluate(`document.querySelector(".sec-att__daytag").click(); true`);
  await sleep(1500);
  const jumped = await evaluate(`location.search`);
  ok(jumped.includes("period=midterm"), `the tag takes you to that term (${jumped})`);

  // ── 4 · the summary carries the term dates ───────────────────────────────
  await go(`/sections/${section.id}?period=prelim&view=summary`);
  await waitFor(`document.querySelector(".sec-termdates") != null`, 30000);
  await sleep(500);
  const editor = await evaluate(`
    (() => {
      const rows = [...document.querySelectorAll(".sec-termdates__table tbody tr")];
      return {
        rows: rows.length,
        labels: rows.map((r) => r.querySelector("td")?.textContent.trim()),
        dates: rows.map((r) => [...r.querySelectorAll("input")].map((i) => i.value)),
      };
    })()
  `);
  ok(editor?.rows === 4, `the editor has a row per term (${editor?.rows})`);
  ok(
    JSON.stringify(editor?.labels) === JSON.stringify(["Prelim", "Midterm", "Semi-Finals", "Finals"]),
    `and they are named consistently (${JSON.stringify(editor?.labels)})`,
  );
  ok(
    editor?.dates?.[0]?.[0] === "2026-11-01",
    `the Prelim window is filled in (${editor?.dates?.[0]?.join(" → ")})`,
  );

  // ── 5 · a date change that would move marks warns first ────────────────
  await evaluate(`
    (() => {
      const row = [...document.querySelectorAll(".sec-termdates__table tbody tr")][0];
      const inputs = [...row.querySelectorAll("input")];
      const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      d.call(inputs[1], "2026-10-31");
      inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
      inputs[1].dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()
  `);
  await sleep(400);
  await evaluate(`
    (() => {
      const row = [...document.querySelectorAll(".sec-termdates__table tbody tr")][0];
      const save = [...row.querySelectorAll("button")].find((b) => b.textContent.trim() === "Save");
      if (save) save.click();
      return true;
    })()
  `);
  await sleep(2000);
  const dialog = await evaluate(`
    (() => {
      const modal = document.querySelector(".ui-modal, [role=dialog]");
      if (!modal) return null;
      return {
        title: modal.querySelector("h2, h3")?.textContent.trim() ?? null,
        text: modal.innerText.replace(/\\s+/g, " ").trim().slice(0, 240),
      };
    })()
  `);
  ok(dialog != null, `a warning appears before the marks move ("${dialog?.title}")`);
  ok(
    /move/i.test(dialog?.text ?? "") && /\d+/.test(dialog?.text ?? ""),
    `and it says how many marks would move ("${dialog?.text?.slice(0, 160)}")`,
  );

  // cancel — nothing must change
  await evaluate(`
    (() => {
      const btn = [...document.querySelectorAll(".ui-modal button")].find((b) => b.textContent.trim() === "Cancel");
      if (btn) btn.click();
      return true;
    })()
  `);
  await sleep(1200);
  const datesAfterCancel = await api.listTermDates(section.id);
  ok(
    datesAfterCancel.prelim.endDate === "2026-11-30",
    `cancelling changes nothing (${datesAfterCancel.prelim.startDate} → ${datesAfterCancel.prelim.endDate})`,
  );

  console.log(failures === 0 ? "\nattendance terms verified" : `\n${failures} CHECK(S) FAILED`);
} catch (err) {
  failures += 1;
  console.error("crashed:", err);
} finally {
  try {
    await api.setAttendance(section.id, "prelim", student.id, SCRATCH, null);
    await api.setTermDates(section.id, "prelim", null, null);
    await api.setTermDates(section.id, "midterm", null, null);
    const left = (await api.listAttendance(section.id)).filter((r) => r.studentRowId === student.id);
    console.log(`   marks left: ${left.length}`);
  } catch (err) {
    console.error("could not clean up:", err);
  }
  try { ws?.close(); } catch { /* ignore */ }
  browser.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exit(failures === 0 ? 0 : 1);
