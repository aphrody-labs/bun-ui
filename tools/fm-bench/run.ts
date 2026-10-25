#!/usr/bin/env bun
// fm-bench runner.
//
//   bun tools/fm-bench/run.ts --app windows-explorer --scenario open-folder --runs 5 \
//       --data <dataset-root> --out results.json [--report report.md] [--cleanup]
//   bun tools/fm-bench/run.ts --app gnome-nautilus --compositor weston ...      (Linux/VPS)
//   bun tools/fm-bench/run.ts --app webos-files --chrome /usr/bin/chromium ...  (browser)
//   bun tools/fm-bench/run.ts --list
//
// The dataset is generated on demand (deterministic, seed 1) and removed with --cleanup.

import { rm } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { generate, type ProfileName } from "./gen-dataset.ts";
import { APPS, SCENARIOS } from "./scenarios.ts";
import { renderReport } from "./report.ts";
import type { AppId, HostInfo, ResultsDocument, ScenarioId, ScenarioResult } from "./schema.ts";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    app: { type: "string", default: "windows-explorer" },
    scenario: { type: "string", default: "open-folder" },
    runs: { type: "string" },
    data: { type: "string" },
    seed: { type: "string", default: "1" },
    out: { type: "string", default: "fm-bench-results.json" },
    report: { type: "string" },
    cleanup: { type: "boolean", default: false },
    compositor: { type: "string", default: "weston" },
    chrome: { type: "string" },
    headed: { type: "boolean", default: false },
    list: { type: "boolean", default: false },
  },
});

if (values.list) {
  for (const a of APPS) console.log(`${a.id.padEnd(20)} ${a.platform.padEnd(8)} ${a.status.padEnd(13)} ${a.name}`);
  console.log();
  for (const s of SCENARIOS) console.log(`${s.id.padEnd(24)} ${s.dataset.padEnd(10)} ${s.title}`);
  process.exit(0);
}

const app = APPS.find((a) => a.id === values.app);
const scenario = SCENARIOS.find((s) => s.id === values.scenario);
if (!app || !scenario) throw new Error(`unknown app/scenario: ${values.app} / ${values.scenario} (try --list)`);
if (scenario.id !== "open-folder" && scenario.id !== "open-100k-folder") {
  throw new Error(`scenario ${scenario.id} is designed (see docs/bench/file-managers.md) but has no automated driver step yet`);
}

const dataRoot = values.data ?? join(Bun.env.TEMP ?? Bun.env.TMPDIR ?? "/tmp", "fm-bench-data");
const seed = Number(values.seed);
const runs = Number(values.runs ?? scenario.runs);
const manifest = await generate(dataRoot, scenario.dataset as ProfileName, seed);
const dataset = { profile: manifest.profile, files: manifest.files, bytes: manifest.bytes, seed };
const expectedItems = manifest.files + (manifest.profile.startsWith("flat") ? 0 : manifest.directories);

let host: HostInfo;
let result: ScenarioResult;
try {
  if (app.driver === "windows") {
    const { runExplorerOpenFolder } = await import("./drivers/windows.ts");
    ({ host, result } = await runExplorerOpenFolder({ folder: manifest.root, expectedItems, runs, dataset }));
  } else if (app.driver === "linux") {
    const { LINUX_APPS, runLinuxOpenFolder } = await import("./drivers/linux.ts");
    const la = LINUX_APPS.find((x) => x.id === app.id)!;
    result = await runLinuxOpenFolder({ app: la, folder: manifest.root, expectedItems, runs, dataset, compositor: values.compositor as "cage" | "weston" });
    host = await linuxHost();
  } else {
    const { BROWSER_APPS, runBrowserOpenFolder } = await import("./drivers/cdp.ts");
    const ba = BROWSER_APPS.find((x) => x.id === app.id)!;
    if (!values.chrome) throw new Error("--chrome <path to chrome/chromium> is required for browser apps");
    result = await runBrowserOpenFolder({ app: ba, chrome: values.chrome, folder: manifest.root, expectedItems, runs, dataset, headless: !values.headed });
    host = { os: process.platform, cpu: "unknown", logicalCpus: navigator.hardwareConcurrency, ramBytes: 0, runtime: `bun ${Bun.version}` };
  }
} finally {
  if (values.cleanup) await rm(dataRoot, { recursive: true, force: true });
}
result.scenario = scenario.id as ScenarioId;

const doc: ResultsDocument = { schema: "fm-bench.results/v1", generatedAt: new Date().toISOString(), host, results: [result] };
await Bun.write(values.out, JSON.stringify(doc, null, 2) + "\n");
if (values.report) await Bun.write(values.report, renderReport(doc) + "\n");
for (const m of result.metrics) console.log(`${(app.id as AppId).padEnd(18)} ${m.name.padEnd(20)} median=${m.median} (n=${m.values.length})`);
if (result.errors.length) console.log(result.errors.join("\n"));

async function linuxHost(): Promise<HostInfo> {
  const os = (await Bun.file("/etc/os-release").text()).match(/PRETTY_NAME="([^"]+)"/)?.[1] ?? "Linux";
  const cpu = (await Bun.file("/proc/cpuinfo").text()).match(/model name\s*:\s*(.+)/)?.[1] ?? "unknown";
  const mem = Number((await Bun.file("/proc/meminfo").text()).match(/MemTotal:\s+(\d+)/)?.[1] ?? 0) * 1024;
  return { os, cpu, logicalCpus: navigator.hardwareConcurrency, ramBytes: mem, runtime: `bun ${Bun.version}` };
}
