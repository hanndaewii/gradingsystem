// The sign-in screen has no role picker: the password decides the role and
// each person lands in the right place. Checked against the deployed site.
//   node --env-file=.env scripts/test-login-flow.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "https://gradingsystem.hanndaaewii.workers.dev";
const PORT = 9339;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

const profile = mkdtempSync(join(tmpdir(), "faculty-login-"));
const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--window-size=1500,1000",
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

async function fillLogin(email, password) {
  await evaluate(`location.href = ${JSON.stringify(`${APP}/login`)}; true`);
  await sleep(1200);
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
}

async function signOut() {
  await evaluate(`
    (() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Sign out");
      if (btn) { btn.click(); return true; }
      return false;
    })()
  `);
  await sleep(1500);
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

  await send("Page.navigate", { url: `${APP}/login` });
  await waitFor(`document.querySelector("#sh-login-email") != null`);

  // ── no role picker ───────────────────────────────────────────────────────
  const roles = await evaluate(`
    (() => {
      const group = document.querySelector(".sh-login__roles");
      const radios = [...document.querySelectorAll(".sh-login__role")];
      return {
        group: group != null,
        count: radios.length,
        labels: radios.map((b) => b.textContent.trim()),
      };
    })()
  `);
  ok(roles?.group === false && roles?.count === 0, `the sign-in screen has no role picker (${roles?.count} buttons)`);

  const shot0 = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync("scripts/tmp-login.png", Buffer.from(shot0.data, "base64"));

  // ── the professor password lands on the teaching view ───────────────────
  await fillLogin(process.env.HEAD_EMAIL, process.env.PROF_PASSWORD);
  await waitFor(`!document.querySelector("#sh-login-email")`, 30000);
  await sleep(2000);
  const prof = await evaluate(`
    (() => ({
      url: location.pathname,
      brand: document.querySelector(".sh-brand__role")?.textContent.trim() ?? null,
      nav: document.querySelector(".sh-nav__link")?.textContent.trim() ?? null,
      places: [...document.querySelectorAll(".sh-nav__link")].map((l) => l.textContent.trim()),
    }))()
  `);
  ok(prof?.brand === "Professor", `the professor password shows the Professor view ("${prof?.brand}")`);
  ok(
    (prof?.places ?? []).includes("Courses"),
    `the professor's places are listed (${JSON.stringify(prof?.places)})`,
  );
  ok(prof?.nav === "Courses", `the nav reads "Courses" ("${prof?.nav}")`);

  await signOut();

  // ── the head password lands on the department review ────────────────────
  await fillLogin(process.env.HEAD_EMAIL, process.env.HEAD_PASSWORD);
  await waitFor(`!document.querySelector("#sh-login-email")`, 30000);
  await sleep(2500);
  const head = await evaluate(`
    (() => ({
      url: location.pathname,
      brand: document.querySelector(".sh-brand__role")?.textContent.trim() ?? null,
      nav: document.querySelector(".sh-nav__link")?.textContent.trim() ?? null,
      places: [...document.querySelectorAll(".sh-nav__link")].map((l) => l.textContent.trim()),
    }))()
  `);
  ok(head?.brand === "Department head", `the head password shows the department head ("${head?.brand}")`);
  ok(
    head?.nav === "Department review",
    `the head lands on the Department review ("${head?.nav}")`,
  );
  ok(
    (head?.places ?? []).includes("Department review"),
    `the head's places are listed (${JSON.stringify(head?.places)})`,
  );

  const shot1 = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync("scripts/tmp-login-head.png", Buffer.from(shot1.data, "base64"));

  // ── a wrong password explains itself ────────────────────────────────────
  await signOut();
  await fillLogin(process.env.HEAD_EMAIL, "wrong-password");
  await sleep(2500);
  const error = await evaluate(
    `document.querySelector(".sh-login__alert")?.textContent.trim() ?? null`,
  );
  ok(
    /incorrect/i.test(error ?? "") && /separate password/i.test(error ?? ""),
    `a wrong password explains the two passwords ("${error}")`,
  );

  console.log(failures === 0 ? "\nlogin flow verified" : `\n${failures} CHECK(S) FAILED`);
} catch (err) {
  failures += 1;
  console.error("crashed:", err);
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  browser.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exit(failures === 0 ? 0 : 1);
