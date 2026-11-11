// Publishes the built site to Cloudflare.
//
//   npm run deploy            → the "gradingsystem" Workers project (assets)
//
// Run inside a Cloudflare build (the Deploy command field) or locally after
// `npx wrangler login`.
//
// The build environment provides its own scoped credential. If a custom
// CLOUDFLARE_API_TOKEN is also set in the project settings, it takes
// precedence and usually lacks the needed permissions — remove it.
import { spawnSync } from "node:child_process";

const project = process.env.CF_PAGES_PROJECT_NAME ?? "gradingsystem";
const args = ["wrangler", "deploy"];
if (process.env.CF_PAGES_COMMIT_SHA) args.push(`--commit-hash=${process.env.CF_PAGES_COMMIT_SHA}`);
if (process.env.CF_PAGES_COMMIT_MESSAGE) {
  args.push(`--commit-message=${process.env.CF_PAGES_COMMIT_MESSAGE.replace(/\s+/g, " ").slice(0, 100)}`);
}

console.log(`→ deploying dist to Cloudflare project "${project}"`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
