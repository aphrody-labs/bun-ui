#!/usr/bin/env bun
// SPDX-License-Identifier: Apache-2.0
// Pins upstream sources from upstream.json into upstream/<group>/<name> without Git submodules.
//
//   bun tools/upstream-sync.ts status            show missing / pinned / drifted / dirty checkouts
//   bun tools/upstream-sync.ts sync              clone missing sources and check out the pinned commit
//   bun tools/upstream-sync.ts update            move pins to the tip of each tracked branch, then sync
//
// Options: --group <name> (repeatable), --name <name> (repeatable), --jobs <n> (default 4),
// --root <dir> (default: the repository containing this script). Clones are blobless
// (--filter=blob:none) with full history. Large upstreams are meant for the VPS; the
// workstation does not need them.

interface Upstream {
  group: string;
  name: string;
  path: string;
  url: string;
  upstream?: string | null;
  fork?: string | null;
  branch: string;
  commit: string;
  license?: string | null;
  license_files?: string[];
  role?: string | null;
}

interface Manifest {
  schema: number;
  upstreams: Upstream[];
}

const args = Bun.argv.slice(2);
const command = args[0] ?? "status";
const option = (name: string) => args.flatMap((arg, i) => (arg === name && args[i + 1] ? [args[i + 1]] : []));
const root = option("--root")[0] ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const groups = new Set(option("--group"));
const names = new Set(option("--name"));
const jobs = Math.max(1, Number(option("--jobs")[0] ?? 4));
const manifestPath = `${root}/upstream.json`;

if (!["status", "sync", "update"].includes(command)) {
  console.error("usage: bun tools/upstream-sync.ts <status|sync|update> [--group g] [--name n] [--jobs n] [--root dir]");
  process.exit(2);
}

const manifest: Manifest = await Bun.file(manifestPath).json();
const selected = manifest.upstreams.filter(
  entry => (groups.size === 0 || groups.has(entry.group)) && (names.size === 0 || names.has(entry.name)),
);

async function git(cwd: string, argv: string[], timeoutMs = 30 * 60_000) {
  const proc = Bun.spawn(["git", ...argv], { cwd, stdout: "pipe", stderr: "pipe", timeout: timeoutMs });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { ok: code === 0, stdout: stdout.trim(), stderr: stderr.trim() };
}

async function exists(path: string) {
  return (await Bun.file(`${path}/.git`).exists()) || (await git(root, ["-C", path, "rev-parse", "--git-dir"], 15_000)).ok;
}

type State = "missing" | "pinned" | "drift" | "dirty" | "error";

async function inspect(entry: Upstream): Promise<{ state: State; head?: string }> {
  const dir = `${root}/${entry.path}`;
  if (!(await exists(dir))) return { state: "missing" };
  const head = await git(dir, ["rev-parse", "HEAD"], 30_000);
  if (!head.ok) return { state: "error" };
  const dirty = await git(dir, ["status", "--porcelain", "--untracked-files=no"], 120_000);
  if (dirty.ok && dirty.stdout) return { state: "dirty", head: head.stdout };
  return { state: head.stdout === entry.commit ? "pinned" : "drift", head: head.stdout };
}

async function checkout(entry: Upstream): Promise<string> {
  const dir = `${root}/${entry.path}`;
  if (!(await exists(dir))) {
    const clone = await git(root, ["clone", "--quiet", "--filter=blob:none", "--no-checkout", entry.url, entry.path]);
    if (!clone.ok) return `clone failed: ${clone.stderr.split("\n").pop()}`;
    if (entry.upstream && entry.upstream !== entry.url) await git(dir, ["remote", "add", "upstream", entry.upstream]);
  }
  const state = await inspect(entry);
  if (state.state === "dirty") return "dirty: left untouched";
  if (state.head === entry.commit) return "pinned";
  if (!(await git(dir, ["cat-file", "-e", `${entry.commit}^{commit}`], 30_000)).ok) {
    const fetch = await git(dir, ["fetch", "--quiet", "--filter=blob:none", "origin", entry.branch]);
    if (!fetch.ok || !(await git(dir, ["cat-file", "-e", `${entry.commit}^{commit}`], 30_000)).ok) {
      const direct = await git(dir, ["fetch", "--quiet", "--filter=blob:none", "origin", entry.commit]);
      if (!direct.ok) return `fetch failed: ${direct.stderr.split("\n").pop()}`;
    }
  }
  const co = await git(dir, ["-c", "advice.detachedHead=false", "checkout", "--quiet", "--detach", entry.commit]);
  return co.ok ? "checked out" : `checkout failed: ${co.stderr.split("\n").pop()}`;
}

async function bump(entry: Upstream): Promise<string> {
  const remote = await git(root, ["ls-remote", entry.url, `refs/heads/${entry.branch}`], 120_000);
  const tip = remote.stdout.split(/\s+/)[0];
  if (!remote.ok || !/^[0-9a-f]{40}$/.test(tip ?? "")) return `ls-remote failed`;
  if (tip === entry.commit) return "current";
  const previous = entry.commit;
  entry.commit = tip;
  return `${previous.slice(0, 12)} -> ${tip.slice(0, 12)}`;
}

async function pool<T>(items: T[], run: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(jobs, items.length) }, async () => {
      while (next < items.length) await run(items[next++]!);
    }),
  );
}

const counts = new Map<string, number>();
const note = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

if (command === "update") {
  await pool(selected, async entry => {
    const result = await bump(entry);
    note(result.includes("->") ? "bumped" : result);
    if (result !== "current") console.log(`${entry.path}: ${result}`);
  });
  await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`);
}

if (command === "status") {
  await pool(selected, async entry => {
    const { state, head } = await inspect(entry);
    note(state);
    if (state !== "pinned") console.log(`${state.padEnd(7)} ${entry.path}${head ? ` (${head.slice(0, 12)})` : ""}`);
  });
} else {
  await pool(selected, async entry => {
    const result = await checkout(entry);
    note(result.split(":")[0]!);
    if (result !== "pinned") console.log(`${entry.path}: ${result}`);
  });
}

console.log(`${command}: ${selected.length} upstreams; ${[...counts].map(([k, v]) => `${k} ${v}`).join(", ")}`);
if ([...counts.keys()].some(key => /failed|error|missing|dirty|drift/.test(key)) && command === "status") process.exitCode = 1;
