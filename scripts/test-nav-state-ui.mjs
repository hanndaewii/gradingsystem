// The nav marks the page you are on — checked in a real browser.
//   node --env-file=.env scripts/test-nav-state-ui.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "https://gradingsystem.hanndaaewii.workers.dev";
const PORT = 9345;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

const profile = mkdtempSync(join(tmpdir(), "faculty-nav-"));
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

const navState = `
  (() => {
    const links = [...document.querySelectorAll(".sh-nav__link")];
    return {
      labels: links.map((l) => l.textContent.trim()),
      current: links.filter((l) => l.getAttribute("aria-current") === "page").map((l) => l.textContent.trim()),
      underline: links
        .filter((l) => l.getAttribute("aria-current") === "page")
        .map((l) => getComputedStyle(l).textDecorationLine),
      brandRole: document.querySelector(".sh-brand__role")?.textContent.trim() ?? null,
      path: location.pathname,
    };
  })()
`;

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

  // ── the professor ────────────────────────────────────────────────────────
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
  await sleep(2000);

  const prof = await evaluate(navState);
  ok(
    JSON.stringify(prof?.labels) === JSON.stringify(["Courses"]),
    `the professor's nav is just their courses (${JSON.stringify(prof?.labels)})`,
  );
  ok(
    prof?.current?.includes("Courses"),
    `"Courses" is marked as the current page (${JSON.stringify(prof?.current)})`,
  );
  ok(
    (prof?.underline ?? []).every((u) => u === "underline"),
    `and it is underlined (${JSON.stringify(prof?.underline)})`,
  );
  ok(prof?.brandRole === "Professor", `the brand says who you are ("${prof?.brandRole}")`);

  // a section page: nothing in the nav is current
  const href = await waitFor(`
    (() => {
      const a = document.querySelector('a[href^="/sections/"]');
      return a ? a.getAttribute("href").split("?")[0] : null;
    })()
  `);
  await evaluate(`location.href = ${JSON.stringify(`${APP}${href}`)}; true`);
  await sleep(2000);
  const onSection = await evaluate(navState);
  ok(
    (onSection?.current ?? []).length === 0,
    `on a section page no nav item claims to be current (${JSON.stringify(onSection?.current)})`,
  );

  // ── the department head ──────────────────────────────────────────────────
  await evaluate(`
    (() => {
      const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Sign out");
      if (btn) btn.click();
      return true;
    })()
  `);
  await sleep(1500);
  await send("Page.navigate", { url: APP });
  await waitFor(`document.querySelector("#sh-login-email") != null`);
  await evaluate(`
    (() => {
      const set = (el, v) => {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        d.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const head = [...document.querySelectorAll(".sh-login__role")].find((b) => b.textContent.includes("Department"));
      if (head) head.click();
      set(document.querySelector("#sh-login-email"), ${JSON.stringify(process.env.HEAD_EMAIL)});
      set(document.querySelector("#sh-login-password"), ${JSON.stringify(process.env.HEAD_PASSWORD)});
      document.querySelector("form.sh-login__form").requestSubmit();
      return true;
    })()
  `);
  await waitFor(`!document.querySelector("#sh-login-email")`, 30000);
  await sleep(2500);

  const head = await evaluate(navState);
  ok(
    JSON.stringify(head?.labels) === JSON.stringify(["Department review", "Faculty accounts", "My courses"]),
    `the head's nav lists the three places (${JSON.stringify(head?.labels)})`,
  );
  ok(
    head?.current?.includes("Department review"),
    `"Department review" is marked as the current page (${JSON.stringify(head?.current)})`,
  );
  ok(
    (head?.underline ?? []).every((u) => u === "underline"),
    `and it is underlined (${JSON.stringify(head?.underline)})`,
  );
  ok(head?.brandRole === "Department head", `the brand says who you are ("${head?.brandRole}")`);

  const shot1 = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("scripts/tmp-nav-head.png", Buffer.from(shot1.data, "base64"));

  // click "My courses" — the nav follows
  await evaluate(`
    (() => {
      const link = [...document.querySelectorAll(".sh-nav__link")].find((l) => l.textContent.trim() === "My courses");
      if (link) { link.click(); return true; }
      return false;
    })()
  `);
  await sleep(2000);
  const courses = await evaluate(navState);
  ok(
    courses?.current?.includes("My courses") && !courses?.current?.includes("Department review"),
    `clicking "My courses" moves the highlight (${JSON.stringify(courses?.current)})`,
  );

  // click "Faculty accounts"
  await evaluate(`
    (() => {
      const link = [...document.querySelectorAll(".sh-nav__link")].find((l) => l.textContent.trim() === "Faculty accounts");
      if (link) { link.click(); return true; }
      return false;
    })()
  `);
  await sleep(2000);
  const faculty = await evaluate(navState);
  ok(
    faculty?.current?.includes("Faculty accounts"),
    `and "Faculty accounts" (${JSON.stringify(faculty?.current)})`,
  );
  const mast = await evaluate(`
    (() => {
      const links = [...document.querySelectorAll(".adm-mast__link")];
      return {
        count: links.length,
        current: links.filter((l) => l.getAttribute("aria-current") === "page").map((l) => l.textContent.trim()),
      };
    })()
  `);
  ok(
    (mast?.count ?? 1) === 0,
    `the page does not repeat the nav (${mast?.count} extra links)`,
  );
  ok(
    faculty?.current?.includes("Faculty accounts"),
    `the top bar marks the page instead (${JSON.stringify(faculty?.current)})`,
  );

  const shot2 = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("scripts/tmp-nav-faculty.png", Buffer.from(shot2.data, "base64"));

  console.log(failures === 0 ? "\nnav state verified" : `\n${failures} CHECK(S) FAILED`);
} catch (err) {
  failures += 1;
  console.error("crashed:", err);
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  browser.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exit(failures === 0 ? 0 : 1);
