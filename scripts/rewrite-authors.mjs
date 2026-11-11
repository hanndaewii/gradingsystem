// Rewrites every commit's author/committer identity to the given name/email,
// preserving trees, parents, messages and dates exactly. Used to attribute the
// portal's history to the real GitHub account instead of the build bot.
import { execFileSync } from "node:child_process";

const [name, email] = process.argv.slice(2);
if (!name || !email) {
  console.error("usage: node rewrite-authors.mjs <name> <email>");
  process.exit(1);
}

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

const origTip = git("rev-parse", "main");
const origTree = git("rev-parse", "main^{tree}");
const commits = git("rev-list", "--reverse", "main").split("\n").filter(Boolean);

const map = new Map();
for (const sha of commits) {
  const raw = git("cat-file", "commit", sha);
  const [header, ...messageParts] = raw.split("\n\n");
  const message = messageParts.join("\n\n");
  const tree = /tree ([0-9a-f]+)/.exec(header)[1];
  const parents = [...header.matchAll(/^parent ([0-9a-f]+)/gm)].map((m) => m[1]);
  const author = /^author (.*) (\d+ [+-]\d{4})$/m.exec(header)[2];
  const committer = /^committer (.*) (\d+ [+-]\d{4})$/m.exec(header)[2];

  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_AUTHOR_DATE: author,
    GIT_COMMITTER_NAME: name,
    GIT_COMMITTER_EMAIL: email,
    GIT_COMMITTER_DATE: committer,
  };
  const args = ["commit-tree", tree];
  for (const p of parents) args.push("-p", map.get(p) ?? p);
  args.push("-m", message);
  const created = execFileSync("git", args, { encoding: "utf8", env }).trim();
  map.set(sha, created);
}

const newTip = map.get(origTip);
const newTree = git("rev-parse", `${newTip}^{tree}`);
if (newTree !== origTree) {
  console.error("ABORT: tree mismatch —", origTree, "vs", newTree);
  process.exit(1);
}

// point main + the restore tag at the rewritten commits
git("update-ref", "refs/heads/main", newTip);
const firstOriginal = commits[0];
git("tag", "-f", "restore-101", map.get(firstOriginal));

console.log(`rewrote ${commits.length} commits`);
console.log(`  main:          ${origTip.slice(0, 8)} → ${newTip.slice(0, 8)}`);
console.log(`  restore-101:   → ${map.get(firstOriginal).slice(0, 8)}`);
console.log(`  tree unchanged: ${newTree.slice(0, 12)} ✓`);
