// The department review, checked against the deployed site.
//   node --env-file=.env scripts/test-review-ui.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const APP = process.env.APP_URL ?? "https://gradingsystem.hanndaaewii.workers.dev";
const PORT = 9348;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

const profile = mkdtempSync(join(tmpdir(), "faculty-rev-"));
const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--window-size=1500,900", "about:blank",
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

const CONTRAST = `
  (() => {
    const lum = (c) => {
      const [r, g, b] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => {
      const m = s.match(/rgba?\\(([^)]+)\\)/);
      if (!m) return null;
      const p = m[1].split(",").map((v) => parseFloat(v));
      return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
    };
    const bgOf = (el) => {
      let node = el;
      while (node) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c.a > 0.5) return c.rgb;
        node = node.parentElement;
      }
      return [255, 255, 255];
    };
    const ratio = (fg, bg) => {
      const a = lum(fg);
      const b = lum(bg);
      return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    };
    const check = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      if (!fg) return null;
      return { ratio: ratio(fg.rgb, bgOf(el)), color: cs.color, size: cs.fontSize };
    };
    return {
      count: check(".adm-filters__count"),
      header: check(".adm-table thead th"),
      label: check(".adm-stats__cell .mono-label"),
      meta: check(".adm-table__sec-meta"),
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
  await send("Emulation.setDeviceMetricsOverride", { width: 1500, height: 900, deviceScaleFactor: 1, mobile: false });

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
  await sleep(3000);
  await waitFor(`document.querySelector(".adm-stats") != null`, 20000);
  await sleep(600);

  // ── 1 · one nav, not two ──────────────────────────────────────────────────
  const nav = await evaluate(`
    (() => ({
      header: [...document.querySelectorAll(".sh-nav__link")].map((l) => l.textContent.trim()),
      masthead: document.querySelectorAll(".adm-mast__link").length,
      sub: document.querySelector(".adm-mast__sub")?.textContent.trim() ?? null,
    }))()
  `);
  ok(
    JSON.stringify(nav?.header) === JSON.stringify(["Department review", "Faculty accounts", "My courses"]),
    `the top bar holds the three places (${JSON.stringify(nav?.header)})`,
  );
  ok((nav?.masthead ?? 1) === 0, "the page's own duplicate row of links is gone");
  ok((nav?.sub ?? "").length > 20, `the freed space carries a line of explanation ("${nav?.sub}")`);

  // ── 2 · OPEN is a real button ────────────────────────────────────────────
  const open = await evaluate(`
    (() => {
      const el = document.querySelector(".adm-table__open");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        text: el.textContent.trim(),
        tag: el.tagName,
        bg: cs.backgroundColor,
        color: cs.color,
        rowCursor: getComputedStyle(document.querySelector(".adm-table__row")).cursor,
      };
    })()
  `);
  ok(open?.tag === "A" && open?.text === "Review", `it is a button labelled "Review" (${open?.text})`);
  ok(
    open?.bg !== "rgba(0, 0, 0, 0)" && open?.bg !== "transparent",
    `it is filled, not a bare link (${open?.bg})`,
  );
  ok(open?.rowCursor === "pointer", "the whole row is clickable");

  // ── 3 · the class average waits for a submission ─────────────────────────
  const avg = await evaluate(`
    (() => {
      const cell = document.querySelector(".adm-table__cell-avg");
      return cell ? cell.textContent.trim() : null;
    })()
  `);
  ok(avg === "—", `the class average is "—" until a period is submitted (${avg})`);

  // ── 4 · contrast ─────────────────────────────────────────────────────────
  const contrast = await evaluate(CONTRAST);
  for (const [name, v] of Object.entries(contrast)) {
    ok(v != null && v.ratio >= 4.5, `${name} is ${v?.ratio}:1 (${v?.color}, ${v?.size})`);
  }
  const clearHidden = await evaluate(
    `document.querySelectorAll(".adm-filters__end button").length`,
  );
  ok(clearHidden === 0, `"Clear filters" is not offered when there is nothing to clear`);

  // ── 5 · the pills mean something ──────────────────────────────────────────
  const pills = await evaluate(`
    (() => {
      const el = document.querySelector(".adm-table .ui-pill");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { label: el.textContent.trim(), bg: cs.backgroundColor, color: cs.color };
    })()
  `);
  ok(pills?.label === "Not started", `the pill still reads "Not started" (${pills?.label})`);
  ok(
    pills?.bg === "rgb(255, 255, 255)" || pills?.bg === "rgb(232, 242, 224)",
    `and it is grey, not the page's green (${pills?.bg})`,
  );

  // ── 6 · the summary strip ────────────────────────────────────────────────
  const stats = await evaluate(`
    (() => {
      const cells = [...document.querySelectorAll(".adm-stats__cell")];
      return {
        count: cells.length,
        values: cells.map((c) => c.querySelector(".adm-stats__value").textContent.trim()),
        labels: cells.map((c) => c.querySelector(".mono-label").textContent.trim()),
        height: cells[0] ? Math.round(cells[0].getBoundingClientRect().height) : null,
        tone: cells.map((c) => getComputedStyle(c.querySelector(".adm-stats__value")).color),
      };
    })()
  `);
  ok((stats?.count ?? 0) === 6, `the strip has six tiles (${stats?.count})`);
  ok(
    (stats?.labels ?? []).includes("Awaiting a submission"),
    `one of them is actionable (${JSON.stringify(stats?.labels)})`,
  );
  ok((stats?.height ?? 99) < 70, `the tiles are compact (${stats?.height}px tall)`);

  // ── 7 · the small things ─────────────────────────────────────────────────
  const polish = await evaluate(`
    (() => {
      const select = document.querySelector(".adm-filters__field select");
      const label = document.querySelector(".adm-filters__field .mono-label");
      const role = document.querySelector(".sh-brand__role");
      const toggle = document.querySelector(".sh-theme-toggle");
      const rs = getComputedStyle(role);
      return {
        selectSize: select ? getComputedStyle(select).fontSize : null,
        labelSize: label ? getComputedStyle(label).fontSize : null,
        roleBg: rs.backgroundColor,
        roleBorder: rs.borderTopWidth,
        roleRadius: rs.borderRadius,
        toggleW: toggle ? Math.round(toggle.getBoundingClientRect().width) : null,
        toggleH: toggle ? Math.round(toggle.getBoundingClientRect().height) : null,
        toggleTitle: toggle ? toggle.getAttribute("title") : null,
      };
    })()
  `);
  ok(
    polish?.selectSize === polish?.labelSize,
    `the dropdowns match the text around them (${polish?.selectSize} vs ${polish?.labelSize})`,
  );
  ok(
    (polish?.roleBg ?? "none") !== "rgba(0, 0, 0, 0)" && (polish?.roleRadius ?? "0") !== "0px",
    `the role is a badge (${polish?.roleBg}, radius ${polish?.roleRadius})`,
  );
  ok((polish?.toggleW ?? 0) >= 36 && (polish?.toggleH ?? 0) >= 36, `the theme toggle is big enough to hit (${polish?.toggleW}×${polish?.toggleH})`);
  ok((polish?.toggleTitle ?? "").length > 5, `and it has a tooltip ("${polish?.toggleTitle}")`);

  // ── the empty state ──────────────────────────────────────────────────────
  await evaluate(`
    (() => {
      const select = document.querySelector("#adm-f-period");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
      setter.call(select, "finals");
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()
  `);
  await sleep(1200);
  const empty = await evaluate(`
    (() => {
      const es = document.querySelector(".ui-empty, .empty-state, [class*=empty]");
      return {
        has: document.body.innerText.includes("No sections match"),
        text: es ? es.textContent.replace(/\\s+/g, " ").trim().slice(0, 90) : null,
        clearButton: [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Clear the filters")),
      };
    })()
  `);
  ok(empty?.has === true, `the empty state appears when the filters return nothing ("${empty?.text}")`);
  ok(empty?.clearButton === true, "and it offers a way out");

  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync("scripts/tmp-review-empty.png", Buffer.from(shot.data, "base64"));

  console.log(failures === 0 ? "\ndepartment review verified" : `\n${failures} CHECK(S) FAILED`);
} catch (err) {
  failures += 1;
  console.error("crashed:", err);
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  browser.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exit(failures === 0 ? 0 : 1);
