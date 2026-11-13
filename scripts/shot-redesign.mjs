// Visual check: capture the redesigned screens for review.
//   node --env-file=.env scripts/shot-redesign.mjs   (APP_URL overrides base)
// Captures login, courses, gradebook, attendance, admin (light) and a narrow
// section view to tmp-shots/.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "http://localhost:5173";
const PORT = 9377;
const OUT = join(process.cwd(), "tmp-shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "faculty-shot-"));
const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1500,1000", "about:blank",
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
async function shot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`shot  ${name}.png`);
}
async function login(email, password) {
  await waitFor(`document.querySelector("#sh-login-email") != null`);
  await evaluate(`
    (() => {
      const set = (el, v) => {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        d.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      set(document.querySelector("#sh-login-email"), ${JSON.stringify(email)});
      set(document.querySelector("#sh-login-password"), ${JSON.stringify(password)});
      document.querySelector("form.sh-login__form").requestSubmit();
      return true;
    })()
  `);
  await waitFor(`!document.querySelector("#sh-login-email")`, 30000);
  await sleep(2500);
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
  await send("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false });

  // 1 · login screen
  await send("Page.navigate", { url: APP });
  await sleep(2500);
  await shot("01-login");

  // 2 · professor courses (spine)
  await login(process.env.HEAD_EMAIL, process.env.PROF_PASSWORD);
  await shot("02-courses");

  // 3 · section gradebook (period strip + ledger)
  await send("Page.navigate", { url: `${APP}/sections/0c5e8324-32b6-4f3c-83c3-d2f5a801f250` });
  await waitFor(`document.querySelector('[aria-label="Grading periods"]') != null`);
  await sleep(2500);
  await shot("03-gradebook");

  // 4 · attendance view
  const attLink = await evaluate(`
    (() => {
      const el = [...document.querySelectorAll(".sec-sidenav__item")].find((b) => /attendance/i.test(b.textContent));
      if (el) { el.click(); return true; }
      return false;
    })()
  `);
  if (attLink) {
    await sleep(2000);
    await shot("04-attendance");
  }

  // 5 · admin home (head account — sign out first, sessions persist)
  await evaluate(`
    (() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Sign out");
      if (btn) btn.click();
      return true;
    })()
  `);
  await sleep(2000);
  await send("Page.navigate", { url: APP });
  await sleep(1500);
  await login(process.env.HEAD_EMAIL, process.env.HEAD_PASSWORD);
  await sleep(1500);
  await shot("05-admin");

  // 6 · narrow screen (spine collapses to top bar)
  await send("Emulation.setDeviceMetricsOverride", { width: 900, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${APP}/sections/0c5e8324-32b6-4f3c-83c3-d2f5a801f250` });
  await waitFor(`document.querySelector('[aria-label="Grading periods"]') != null`);
  await sleep(2000);
  await shot("06-mobile-section");

  console.log("DONE");
} catch (err) {
  console.error("ERROR", err);
  process.exitCode = 1;
} finally {
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  try { browser.kill(); } catch { /* ignore */ }
}
