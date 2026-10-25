// Windows driver: runs windows-explorer.ps1 (UI Automation + Get-Process) and maps
// its output onto the fm-bench results schema. No ETW, no installation, no admin.

import { join } from "node:path";
import { summarize } from "../lib/prng.ts";
import type { HostInfo, Metric, MetricUnit, ScenarioResult } from "../schema.ts";

interface PsRun {
  run: number;
  windowMs?: number;
  firstItemMs?: number | null;
  itemsMs?: number | null;
  itemCount?: number;
  itemCountSource?: string;
  ownerPid?: number;
  ownerIsNewProcess?: boolean;
  workingSetBytes?: number | null;
  privateBytes?: number | null;
  peakWorkingSetBytes?: number | null;
  windowAliveAtEnd?: boolean;
  error?: string | null;
}

interface PsOutput {
  host: { os: string; build: string; cpu: string; logicalCpus: number; ramBytes: number; separateProcessSetting: boolean };
  runs: PsRun[] | PsRun;
}

export interface ExplorerOptions {
  folder: string;
  expectedItems: number;
  runs: number;
  timeoutSec?: number;
  dataset: { profile: string; files: number; bytes: number; seed: number };
}

function metric(name: string, unit: MetricUnit, runs: PsRun[], pick: (r: PsRun) => number | null | undefined, source: string): Metric {
  const values = runs.map(pick).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return { name, unit, values, ...summarize(values), source };
}

export async function runExplorerOpenFolder(opts: ExplorerOptions): Promise<{ host: HostInfo; result: ScenarioResult }> {
  const script = join(import.meta.dir, "windows-explorer.ps1");
  const proc = Bun.spawn(
    [
      "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
      "-Path", opts.folder,
      "-ExpectedItems", String(opts.expectedItems),
      "-Runs", String(opts.runs),
      "-TimeoutSec", String(opts.timeoutSec ?? 60),
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`windows-explorer.ps1 exited ${code}: ${stderr.trim()}`);
  const out = JSON.parse(stdout) as PsOutput;
  const runs = Array.isArray(out.runs) ? out.runs : [out.runs];

  const uia = "UI Automation (UIAutomationClient), Stopwatch from Start-Process";
  const result: ScenarioResult = {
    app: "windows-explorer",
    platform: "windows",
    scenario: "open-folder",
    dataset: opts.dataset,
    runs: runs.length,
    cache: "warm",
    metrics: [
      metric("windowMs", "ms", runs, (r) => r.windowMs, `${uia}: new CabinetWClass top-level window`),
      metric("firstItemMs", "ms", runs, (r) => r.firstItemMs, `${uia}: first ListItem under UIItemsView`),
      metric("itemsMs", "ms", runs, (r) => r.itemsMs, `${uia}: status bar MetadataLabel count == expected`),
      metric("workingSetBytes", "bytes", runs, (r) => r.workingSetBytes, "Get-Process WorkingSet64 of the window's owner process, 1.5 s after listing"),
      metric("privateBytes", "bytes", runs, (r) => r.privateBytes, "Get-Process PrivateMemorySize64 of the owner process"),
      metric("peakWorkingSetBytes", "bytes", runs, (r) => r.peakWorkingSetBytes, "Get-Process PeakWorkingSet64 of the owner process"),
    ],
    errors: runs.filter((r) => r.error).map((r) => `run ${r.run}: ${r.error}`),
    notes: [
      `owner process new per window in ${runs.filter((r) => r.ownerIsNewProcess).length}/${runs.length} runs (SeparateProcess setting: ${out.host.separateProcessSetting})`,
      `item count source: ${[...new Set(runs.map((r) => r.itemCountSource))].join(", ")}`,
      "warm cache: the OS standby list is not flushed between runs (no admin tools used)",
    ],
    raw: out,
  };
  const host: HostInfo = {
    os: out.host.os,
    build: out.host.build,
    cpu: out.host.cpu,
    logicalCpus: out.host.logicalCpus,
    ramBytes: out.host.ramBytes,
    runtime: `bun ${Bun.version}`,
  };
  return { host, result };
}
