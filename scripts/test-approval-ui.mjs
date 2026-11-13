// Drives a real browser to prove the head's sign-off works in the interface:
// a submitted period offers Approve on the section page, approving turns the
// pill green (Approved) and lands in history, Department review shows the same
// pill, and Unlock for editing sends it back to Draft.
//
// The period's real state is saved first and restored at the end.
//   node --env-file=.env scripts/test-approval-ui.mjs
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "https://gradingsystem.hanndaaewii.workers.dev";
const SECTION = "0c5e8324-32b6-4f3c-83c3-d2f5a801f250";   // CS101 · BSBA
const PERIOD = "prelim";
const PORT = 9371;

const H = {
  apikey: process.env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };

const periodRow = async () =>
  (await (await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/faculty_periods?select=status,submitted_at&section_id=eq.${SECTION}&period=eq.${PERIOD}`,
    { headers: H },
  )).json())[0];
const patchPeriod = async (body) => {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faculty_periods?section_id=eq.${SECTION}&period=eq.${PERIOD}`, {
    method: "PATCH", headers: H, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`could not set the period: ${res.status}`);
};

const profile = mkdtempSync(join(tmpdir(), "approval-ui-"));
const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu",
  "--window-size=1440,1000", "about:blank",
], { stdio: "ignore" });

let ws; let nextId = 0; const pending = new Map();
const send = (m, p = {}) => {
  const id = ++nextId;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method: m, params: p })); });
};
async function evaluate(expression) {
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
  return res.result.value;
}
async function waitFor(fn, timeout = 40000, every = 300) {
  const end = Date.now() + timeout;
  for (;;) { const v = await evaluate(fn); if (v) return v; if (Date.now() > end) throw new Error(`timed out: ${fn.slice(0, 80)}`); await sleep(every); }
}
const clickButton = (text) => evaluate(`
  (() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === ${JSON.stringify(text)});
    if (!b) return false;
    b.click();
    return true;
  })()
`);
/** The confirm dialog repeats the action's label — click inside the dialog. */
const clickDialogButton = (text) => evaluate(`
  (() => {
    const dialog = document.querySelector("[role=dialog]");
    if (!dialog) return false;
    const b = [...dialog.querySelectorAll("button")].find((x) => x.textContent.trim() === ${JSON.stringify(text)});
    if (!b) return false;
    b.click();
    return true;
  })()
`);
const barText = () => evaluate(`document.querySelector(".sec-submitbar")?.textContent.replace(/\\s+/g, " ").trim() ?? null`);

let original = null;

try {
  original = await periodRow();
  await patchPeriod({ status: "submitted", submitted_at: new Date().toISOString() });

  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch {}
    await sleep(250);
  }
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  await send("Page.enable"); await send("Runtime.enable");

  // sign in with the HEAD password → the department head's hat
  await send("Page.navigate", { url: APP });
  await waitFor(`document.querySelector("#sh-login-email") != null`);
  await evaluate(`
    (() => {
      const set = (el, v) => { const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; d.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
      set(document.querySelector("#sh-login-email"), ${JSON.stringify(process.env.HEAD_EMAIL)});
      set(document.querySelector("#sh-login-password"), ${JSON.stringify(process.env.HEAD_PASSWORD)});
      document.querySelector("form.sh-login__form").requestSubmit();
      return true;
    })()
  `);
  await waitFor(`!document.querySelector("#sh-login-email")`, 30000);
  await sleep(1500);
  const brand = await evaluate(`document.querySelector(".sh-brand__role")?.textContent.trim() ?? null`);
  ok(brand === "Department head", `signed in as the department head (${brand})`);

  await evaluate(`location.href = ${JSON.stringify(`${APP}/sections/${SECTION}?period=${PERIOD}`)}; true`);
  await waitFor(`document.querySelector(".sec-submitbar") != null`, 40000);
  await sleep(900);

  const before = await barText();
  ok((before ?? "").includes("Submitted"), `the bar shows the submission (${(before ?? "").slice(0, 70)}…)`);
  ok((before ?? "").includes("Approve Prelim"), "and offers Approve Prelim to the head");
  ok(!(before ?? "").includes("Submit Prelim"), "the head is never offered the professor's submit");

  ok(await clickButton("Approve Prelim"), "click Approve Prelim");
  await waitFor(`document.querySelector("[role=dialog]") != null`, 8000);
  const dialog = await evaluate(`document.querySelector("[role=dialog]")?.textContent.replace(/\\s+/g, " ").trim() ?? ""`);
  ok(dialog.includes("cannot change an approved period"), "the confirmation explains what approval means");
  ok(await clickDialogButton("Approve Prelim"), "confirm it");
  await waitFor(`document.querySelector(".sec-submitbar")?.textContent.includes("Approved") === true`, 20000);
  await sleep(600);
  const after = await barText();
  ok((after ?? "").includes("Unlock for editing"), "and now offers Unlock for editing");
  ok((await periodRow()).status === "approved", "the period really is approved");

  // the professor's own view is read-only about it
  const pill = await evaluate(`document.querySelector(".sec-submitbar .ui-pill")?.textContent.trim() ?? null`);
  ok(pill === "Approved", `the pill reads Approved (${pill})`);

  // history shows both the submit and the approval
  await evaluate(`location.href = ${JSON.stringify(`${APP}/sections/${SECTION}?period=${PERIOD}&view=history`)}; true`);
  await waitFor(`document.querySelector(".sec-history") != null`, 30000);
  await sleep(1200);
  const history = await evaluate(`document.querySelector(".sec-history")?.textContent.replace(/\\s+/g, " ").slice(0, 400) ?? ""`);
  ok(history.includes("Approved"), "history lists the approval");

  // Department review (the head's home) shows the same pill
  await evaluate(`location.href = ${JSON.stringify(APP + "/")}; true`);
  await waitFor(`document.querySelector(".adm-mast") != null`, 30000);
  await sleep(1800);
  const review = await evaluate(`
    (() => {
      const pills = [...document.querySelectorAll(".ui-pill")].map((p) => p.textContent.trim());
      return { pills, hasApproved: pills.includes("Approved") };
    })()
  `);
  ok(review?.hasApproved === true, `Department review shows the Approved pill (${JSON.stringify(review?.pills?.slice(0, 6))})`);

  // the head takes the sign-off back
  await evaluate(`location.href = ${JSON.stringify(`${APP}/sections/${SECTION}?period=${PERIOD}`)}; true`);
  await waitFor(`document.querySelector(".sec-submitbar") != null`, 30000);
  await sleep(900);
  ok(await clickButton("Unlock for editing"), "click Unlock for editing");
  await waitFor(`document.querySelector("[role=dialog]") != null`, 8000);
  ok(await clickDialogButton("Unlock for editing"), "confirm the unlock");
  await waitFor(`document.querySelector(".sec-submitbar")?.textContent.includes("Draft") === true`, 20000);
  await sleep(600);
  const afterUnlock = await barText();
  const draftPill = await evaluate(`document.querySelector(".sec-submitbar .ui-pill")?.textContent.trim() ?? null`);
  ok(draftPill === "Draft", `the pill is back to Draft (${draftPill})`);
  ok((await periodRow()).status === "draft", `the period really is draft again (${(afterUnlock ?? "").slice(0, 50)}…)`);
} catch (err) {
  console.log("ERROR", err?.message ?? err);
  fails.push("threw");
} finally {
  // restoring the fixture must survive a transient network blip
  let restored = false;
  for (let i = 0; i < 3 && !restored; i += 1) {
    try {
      await patchPeriod({
        status: original?.status ?? "not_started",
        submitted_at: original?.submitted_at ?? null,
        approved_at: null,
        approved_by: null,
      });
      restored = true;
    } catch (e) {
      console.log(`restore attempt ${i + 1} failed: ${e?.message ?? e}`);
      await sleep(1500);
    }
  }
  if (!restored) {
    fails.push("could not restore the period row");
    process.exitCode = 1;
  }
  try { browser.kill(); } catch {}
  console.log(fails.length === 0 ? "\nhead approval verified" : `\nFAILED: ${fails.join(" | ")}`);
  process.exitCode = fails.length === 0 ? 0 : 1;
}
