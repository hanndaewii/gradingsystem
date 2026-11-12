// The faculty accounts desk, checked against the deployed site.
//   node --env-file=.env scripts/test-faculty-ui.mjs
//
// Phase 1 runs against the real backend. Phases 2-4 shim `fetch` for the
// faculty-admin Worker only (in-page, per-document) so the empty state, the
// one-time password banner and the expired-session redirect can be exercised
// without creating or changing a single real account.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "https://gradingsystem.hanndaaewii.workers.dev";
const PORT = 9350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

const SHIM = `
  (() => {
    if (!sessionStorage.getItem("fac-shim")) return;
    const original = window.fetch;
    const json = (body, status) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    const row = (hasAccess) => ({
      id: "t1",
      email: "row@college.edu",
      name: "Row One",
      department: "Science",
      role: "professor",
      hasAccess,
    });
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      const method = String((init && init.method) || "GET").toUpperCase();
      if (url.includes("/revoke-access")) {
        sessionStorage.setItem("fac-shim", "revoked");
        return json({ ok: true, email: "row@college.edu" }, 200);
      }
      if (!url.includes("/teachers")) return original(input, init);
      const flag = sessionStorage.getItem("fac-shim");
      if (flag === "401") return json({ error: "Your session has expired — sign in again." }, 401);
      if (method === "POST") {
        // Creating an account flips the list from empty to one row.
        sessionStorage.setItem("fac-shim", "after");
        return json({ email: "generated@college.edu", password: "Gen-9x2-Password" }, 200);
      }
      if (flag === "slow") await new Promise((r) => setTimeout(r, 1500));
      const current = sessionStorage.getItem("fac-shim");
      if (current === "revoked") return json({ teachers: [row(false)] }, 200);
      if (current === "after") return json({ teachers: [row(true)] }, 200);
      return json({ teachers: [] }, 200);
    };
  })();
`;

const profile = mkdtempSync(join(tmpdir(), "faculty-desk-"));
const browser = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1500,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

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
async function signIn() {
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
  await sleep(3000);
}
const TYPE = (sel, value) => `
  (() => {
    const el = document.querySelector("#" + ${JSON.stringify(sel)});
    if (!el) return false;
    const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    d.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  })()
`;

try {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) break;
    } catch {
      /* wait */
    }
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
  await send("Page.addScriptToEvaluateOnNewDocument", { source: SHIM });

  // ── phase 1 · the real desk ──────────────────────────────────────────────
  await send("Page.navigate", { url: APP });
  await waitFor(`document.querySelector("#sh-login-email") != null`);
  await signIn();
  await send("Page.navigate", { url: `${APP}/faculty` });
  await waitFor(`document.querySelector(".adm-mast__title") != null`);
  await sleep(1500);

  const mast = await evaluate(`
    (() => ({
      title: document.querySelector(".adm-mast__title")?.childNodes[0]?.textContent.trim(),
      sub: document.querySelector(".adm-mast__sub")?.textContent.trim() ?? null,
      subIsUnderTitle: (() => {
        const head = document.querySelector(".adm-mast__head");
        if (!head) return false;
        const kids = [...head.children];
        return kids[0]?.tagName === "H1" && kids[1]?.tagName === "P";
      })(),
      dupes: document.querySelectorAll(".adm-mast__link").length,
      current: [...document.querySelectorAll(".sh-nav__link")]
        .filter((l) => l.getAttribute("aria-current") === "page")
        .map((l) => l.textContent.trim()),
    }))()
  `);
  ok(mast?.title === "Faculty accounts", `the page title is "Faculty accounts" (${mast?.title})`);
  ok((mast?.sub ?? "").length > 20, `the subtitle sits under the title ("${mast?.sub}")`);
  ok(mast?.subIsUnderTitle === true, "the subtitle is on its own line, below the H1");
  ok((mast?.dupes ?? 1) === 0, `the duplicate row of links is gone (${mast?.dupes})`);
  ok(
    JSON.stringify(mast?.current) === JSON.stringify(["Faculty accounts"]),
    `the top bar marks this page (${JSON.stringify(mast?.current)})`,
  );

  // the count is only shown once a real response has come back
  const panels = await evaluate(`
    (() => [...document.querySelectorAll(".adm-faculty .ui-panel__label")].map((l) => l.textContent.trim()))()
  `);
  const listLabel = (panels ?? [])[1] ?? "";
  const count = /\((\d+)\)/.exec(listLabel)?.[1];
  ok(count !== null && Number(count) > 0, `the list shows a real count, never "(0)" (${listLabel})`);

  const labels = await evaluate(`
    (() => {
      const lab = (id) => [...document.querySelectorAll("label")].find((l) => l.htmlFor === id)?.textContent.trim();
      return {
        name: lab("adm-fac-name"),
        dept: lab("adm-fac-dept"),
        email: lab("adm-fac-email"),
        pass: lab("adm-fac-pass"),
        required: ["adm-fac-name", "adm-fac-dept", "adm-fac-email"].map(
          (id) => document.querySelector("#" + id)?.required === true,
        ),
      };
    })()
  `);
  ok(
    labels?.name?.endsWith("*") === true && labels?.dept?.endsWith("*") === true && labels?.email?.endsWith("*") === true,
    `required fields carry an asterisk (${labels?.name} · ${labels?.dept} · ${labels?.email})`,
  );
  ok((labels?.pass ?? "").includes("(optional)"), `password reads as optional (${labels?.pass})`);
  ok(labels?.required?.every === true || labels?.required?.every((v) => v === true), "the inputs are marked required for assistive tech");

  const placeholders = await evaluate(`
    (() => {
      const ids = ["adm-fac-name", "adm-fac-dept", "adm-fac-email"];
      const lum = (c) => {
        const [r, g, b] = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const parse = (s) => (s.match(/rgba?\\(([^)]+)\\)/)?.[1] ?? "").split(",").map((v) => parseFloat(v));
      const out = [];
      for (const id of ids) {
        const el = document.querySelector("#" + id);
        if (!el) continue;
        out.push({
          id,
          placeholder: getComputedStyle(el, "::placeholder").color,
          typed: getComputedStyle(el).color,
        });
      }
      const colors = new Set(out.map((o) => o.placeholder));
      const lighter = out.every((o) => lum(parse(o.placeholder)) > lum(parse(o.typed)));
      return { same: colors.size === 1, lighter, sample: out[0] };
    })()
  `);
  ok(placeholders?.same === true, "every field uses the same placeholder style");
  ok(
    placeholders?.lighter === true,
    `placeholders are clearly lighter than typed text (${placeholders?.sample?.placeholder} vs ${placeholders?.sample?.typed})`,
  );

  // ── inline validation, without touching the network ──────────────────────
  await evaluate(`document.querySelector(".adm-faculty__form button[type=submit]").click(); true`);
  await sleep(400);
  const emptySubmit = await evaluate(`
    (() => ({
      errors: [...document.querySelectorAll(".adm-faculty__form .ui-field__error")].map((e) => e.textContent.trim()),
      stillHere: location.pathname === "/faculty",
    }))()
  `);
  ok((emptySubmit?.errors ?? []).length === 3, `submitting empty shows three inline errors (${JSON.stringify(emptySubmit?.errors)})`);
  ok(emptySubmit?.stillHere === true, "and nothing is sent — the page stays put");

  await evaluate(TYPE("adm-fac-email", "not-an-email"));
  await sleep(300);
  const badEmail = await evaluate(`
    (() => {
      const el = document.querySelector("#adm-fac-email");
      const err = el?.closest(".ui-field")?.querySelector(".ui-field__error");
      return { text: err?.textContent.trim() ?? null, invalid: el?.getAttribute("aria-invalid") };
    })()
  `);
  ok((badEmail?.text ?? "").includes("valid email"), `a bad email is caught on blur (${badEmail?.text})`);
  ok(badEmail?.invalid === "true", "and the field is marked invalid");

  // ── phase 2 · while it loads, then when it is genuinely empty ────────────
  await evaluate(`sessionStorage.setItem("fac-shim", "slow"); true`);
  await send("Page.navigate", { url: `${APP}/faculty` });
  await waitFor(`document.querySelector(".adm-mast__title") != null`);
  const duringLoad = await evaluate(`
    (() => ({
      label: [...document.querySelectorAll(".adm-faculty .ui-panel__label")].map((l) => l.textContent.trim())[1] ?? null,
      skeleton: document.querySelector(".adm-skeleton") != null,
      count: document.body.innerText.includes("Current faculty ("),
    }))()
  `);
  ok(duringLoad?.skeleton === true, "while the list is fetching, a skeleton is shown");
  ok(duringLoad?.count === false, `and no count is invented yet (${duringLoad?.label})`);

  await waitFor(`document.querySelector(".adm-empty") != null || document.querySelector(".adm-faclist") != null`, 20000);
  const empty = await evaluate(`
    (() => ({
      label: [...document.querySelectorAll(".adm-faculty .ui-panel__label")].map((l) => l.textContent.trim())[1] ?? null,
      has: document.body.innerText.includes("No faculty accounts yet."),
      body: document.querySelector(".adm-empty__body")?.textContent.trim() ?? null,
      icon: document.querySelector(".adm-empty__icon") != null,
    }))()
  `);
  ok(empty?.has === true, `the empty state says "No faculty accounts yet." (icon: ${empty?.icon})`);
  ok((empty?.body ?? "").includes("Add your first professor using the form."), `and points at the form ("${empty?.body}")`);
  ok(empty?.label === "Current faculty (0)", `only a successful fetch earns the count (${empty?.label})`);

  // ── phase 3 · creating an account shows the password once ────────────────
  await evaluate(TYPE("adm-fac-name", "Prof. Test Faculty"));
  await evaluate(TYPE("adm-fac-dept", "Department of Testing"));
  await evaluate(TYPE("adm-fac-email", "generated@college.edu"));
  await evaluate(`document.querySelector(".adm-faculty__form button[type=submit]").click(); true`);
  await waitFor(`document.querySelector(".adm-issued") != null`, 20000);
  const issued = await evaluate(`
    (() => ({
      title: document.querySelector(".adm-issued__title")?.textContent.trim() ?? null,
      note: document.querySelector(".adm-issued__note")?.textContent.trim() ?? null,
      line: document.querySelector(".adm-issued__line")?.textContent.trim() ?? null,
      copy: [...document.querySelectorAll(".adm-issued button")].some((b) => b.textContent.trim() === "Copy"),
      status: document.querySelector(".adm-issued")?.getAttribute("role"),
      cleared: ["adm-fac-name", "adm-fac-dept", "adm-fac-email"].every(
        (id) => document.querySelector("#" + id)?.value === "",
      ),
      refreshed: document.body.innerText.includes("Row One"),
      count: [...document.querySelectorAll(".adm-faculty .ui-panel__label")].map((l) => l.textContent.trim())[1] ?? null,
    }))()
  `);
  ok((issued?.title ?? "").includes("generated@college.edu"), `the success message names the account (${issued?.title})`);
  ok((issued?.note ?? "").includes("won't be shown again"), `and warns it is shown once ("${issued?.note}")`);
  ok((issued?.line ?? "").includes("Gen-9x2-Password"), `the generated password is right there (${issued?.line})`);
  ok(issued?.copy === true, "with a Copy button");
  ok(issued?.status === "status", "announced to screen readers");
  ok(issued?.cleared === true, "the form is cleared after a successful create");
  ok(issued?.refreshed === true, "the faculty list refreshes without a page reload");
  ok((issued?.count ?? "").includes("(1)"), `and the count updates (${issued?.count})`);

  // ── phase 3b · removing access, and the way back ────────────────────────
  const menuOpened = await evaluate(`
    (() => {
      const trigger = document.querySelector(".adm-faclist .ui-menu__trigger");
      if (!trigger) return false;
      trigger.click();
      return true;
    })()
  `);
  ok(menuOpened === true, "the row's ⋯ menu is there");
  await sleep(300);
  const menuItems = await evaluate(`
    [...document.querySelectorAll(".ui-menu__item")].map((b) => b.textContent.trim())
  `);
  ok(
    (menuItems ?? []).includes("Remove access"),
    `and it offers "Remove access" (${JSON.stringify(menuItems)})`,
  );
  await evaluate(`
    [...document.querySelectorAll(".ui-menu__item")]
      .find((b) => b.textContent.trim() === "Remove access")
      ?.click();
    true
  `);
  await waitFor(`document.querySelector("[role=dialog]") != null`, 10000);
  const dialog = await evaluate(`
    (() => ({
      text: document.querySelector("[role=dialog]")?.textContent.replace(/\\s+/g, " ").trim() ?? null,
      confirm: [...document.querySelectorAll("[role=dialog] button")].some(
        (b) => b.textContent.trim() === "Remove access",
      ),
      cancel: [...document.querySelectorAll("[role=dialog] button")].some(
        (b) => b.textContent.trim() === "Cancel",
      ),
    }))()
  `);
  ok(
    (dialog?.text ?? "").includes("will no longer be able to sign in"),
    `the confirmation says what happens ("${(dialog?.text ?? "").slice(0, 90)}…")`,
  );
  ok((dialog?.text ?? "").includes("courses, grades"), "and promises the grades stay");
  ok(dialog?.confirm === true && dialog?.cancel === true, "with Remove access and Cancel");

  await evaluate(`
    [...document.querySelectorAll("[role=dialog] button")]
      .find((b) => b.textContent.trim() === "Remove access")
      ?.click();
    true
  `);
  await waitFor(`document.querySelector(".adm-faclist .ui-pill") != null`, 15000);
  const revoked = await evaluate(`
    (() => ({
      pill: document.querySelector(".adm-faclist .ui-pill")?.textContent.trim() ?? null,
      restore: [...document.querySelectorAll(".adm-faclist__set button")].some(
        (b) => b.textContent.trim() === "Restore access",
      ),
      stillThere: document.body.innerText.includes("Row One"),
      count: [...document.querySelectorAll(".adm-faculty .ui-panel__label")].map((l) => l.textContent.trim())[1] ?? null,
    }))()
  `);
  ok(revoked?.pill === "No access", `the row now says it has no access (${revoked?.pill})`);
  ok(revoked?.restore === true, "and offers Restore access");
  ok(revoked?.stillThere === true, "while the person stays on the list");
  ok((revoked?.count ?? "").includes("(1)"), `and the count does not change (${revoked?.count})`);

  // ── phase 4 · an expired session goes back to sign in, keeping the URL ───
  await evaluate(`sessionStorage.setItem("fac-shim", "401"); true`);
  await send("Page.navigate", { url: `${APP}/faculty` });
  await waitFor(`location.pathname === "/login"`, 25000);
  const redirected = await evaluate(`
    (() => ({ path: location.pathname, search: location.search, form: document.querySelector("#sh-login-email") != null }))()
  `);
  ok(redirected?.path === "/login", `an expired session lands on sign-in (${redirected?.path})`);
  ok(
    decodeURIComponent(redirected?.search ?? "").includes("next=/faculty"),
    `and keeps where you were (${redirected?.search})`,
  );
  ok(redirected?.form === true, "with the sign-in form ready");

  console.log(failures === 0 ? "\nfaculty desk verified" : `\n${failures} CHECK(S) FAILED`);
} catch (err) {
  failures += 1;
  console.error("crashed:", err);
} finally {
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  browser.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
process.exit(failures === 0 ? 0 : 1);
