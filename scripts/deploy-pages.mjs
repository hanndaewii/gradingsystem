// Deploys the built site to the Cloudflare Pages project.
//
//   npm run deploy            → production branch (main)
//   npm run deploy:preview    → preview branch
//
// Run inside a Cloudflare Pages build (the Deploy command field) or locally
// after `npx wrangler login`.
//
// The Pages build environment provides its own scoped credentials. If a
// custom CLOUDFLARE_API_TOKEN is also set in the project settings, it takes
// precedence and usually lacks the "Cloudflare Pages: Edit" permission —
// remove it and this deploy succeeds.
import { spawnSync } from "node:child_process";

const project = process.env.CF_PAGES_PROJECT_NAME ?? "gradingsystem";
const isPreview = process.argv.includes("--preview");
const branch = process.env.CF_PAGES_BRANCH ?? (isPreview ? "preview" : "main");

const args = [
  "wrangler",
  "pages",
  "deploy",
  "dist",
  `--project-name=${project}`,
  `--branch=${branch}`,
  "--commit-dirty=true",
];
if (process.env.CF_PAGES_COMMIT_SHA) args.push(`--commit-hash=${process.env.CF_PAGES_COMMIT_SHA}`);
if (process.env.CF_PAGES_COMMIT_MESSAGE) {
  args.push(`--commit-message=${process.env.CF_PAGES_COMMIT_MESSAGE.replace(/\s+/g, " ").slice(0, 100)}`);
}

console.log(`→ deploying dist to Cloudflare Pages project "${project}" (branch: ${branch})`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
