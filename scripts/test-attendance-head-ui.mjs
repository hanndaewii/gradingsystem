// One-off: the department head must see the attendance read-only (no crash).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "https://gradingsystem.hanndaaewii.workers.dev";
const EMAIL = process.env.HEAD_EMAIL;
const PASSWORD = process.env.HEAD_PASSWORD;
const PORT = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

const profile = mkdtempSync(join(tmpdir(), "faculty-admin-"));
const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--window-size=1440,1000",
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
async function waitFor(fn, timeout = 25000) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await evaluate(fn);
    if (v) return v;
    if (Date.now() > end) throw new Error(`timeout: ${fn.slice(0, 80)}`);
    await sleep(300);
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

  await send("Page.navigate", { url: APP });
  await waitFor(`document.querySelector("#sh-login-email") != null`);
  await evaluate(`
    (() => {
      const set = (el, v) => {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        d.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const heads = [...document.querySelectorAll(".sh-login__role")];
      const head = heads.find((b) => b.textContent.includes("Department"));
      if (head) head.click();
      set(document.querySelector("#sh-login-email"), ${JSON.stringify(EMAIL)});
      set(document.querySelector("#sh-login-password"), ${JSON.stringify(PASSWORD)});
      document.querySelector("form.sh-login__form").requestSubmit();
      return true;
    })()
  `);
  await sleep(6000);
  const loginErr = await evaluate(`
    (() => {
      const a = document.querySelector(".sh-login__alert");
      return a ? a.textContent.trim() : null;
    })()
  `);
  if (loginErr) console.log("login error:", loginErr);
  await waitFor(`!document.querySelector("#sh-login-email")`, 30000);
  await sleep(1500);

  // the admin home lists every professor's sections
  await evaluate(`location.href = ${JSON.stringify(`${APP}/`)}; true`);
  await sleep(2500);
  const href = await waitFor(`
    (() => {
      const a = document.querySelector('a[href^="/sections/"]');
      return a ? a.getAttribute("href").split("?")[0] : null;
    })()
  `);
  await evaluate(`location.href = ${JSON.stringify(`${APP}${href}?view=attendance`)}; true`);
  await sleep(1000);
  await waitFor(`document.querySelector(".sec-att__table") != null`, 30000);
  await sleep(500);

  const state = await evaluate(`
    (() => {
      const el = document.querySelector(".sec-att__input");
      const notice = document.querySelector(".sec-att__notice");
      return {
        rendered: document.querySelector(".sec-att__table") != null,
        disabled: el ? el.disabled : null,
        notice: notice ? notice.textContent.trim().slice(0, 80) : null,
        innerTerms: document.querySelectorAll(".sec-att__term").length,
        terms: [...document.querySelectorAll('[aria-label="Grading periods"] button, [aria-label="Grading periods"] [role=tab]')]
          .map((b) => (b.textContent.trim().match(/^(Prelim|Midterm|Semi-Finals|Finals)/) ?? [""])[0]),
      };
    })()
  `);
  if (!state?.rendered) {
    console.log("url:", await evaluate("location.href"));
    console.log("body:", (await evaluate("document.body.innerText") ?? "").slice(0, 600));
  }
  ok(state?.rendered === true, "the head sees the attendance sheet");
  ok(state?.disabled === true, `the cells are read-only for the head (disabled=${state?.disabled})`);
  ok(/department head/i.test(state?.notice ?? ""), `the read-only notice is shown ("${state?.notice}")`);
  ok(
    state?.innerTerms === 0,
    "the attendance panel has no term buttons of its own",
  );
  ok(
    JSON.stringify(state?.terms) === JSON.stringify(["Prelim", "Midterm", "Semi-Finals", "Finals"]),
    `the page's period tabs carry the terms (${JSON.stringify(state?.terms)})`,
  );
  console.log(failures === 0 ? "\nhead view verified" : `\n${failures} CHECK(S) FAILED`);
} catch (err) {
  failures += 1;
  console.error("head check crashed:", err);
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  browser.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exit(failures === 0 ? 0 : 1);
