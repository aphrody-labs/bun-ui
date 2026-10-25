// Linux driver (designed for the VPS; not run on the Windows workstation).
//
// Each run:
//   1. start a private session bus + AT-SPI bus (dbus-run-session wraps the whole run);
//   2. start a headless Wayland compositor (cage or weston headless) on its own socket;
//   3. launch the app on that WAYLAND_DISPLAY with GTK_A11Y/QT_ACCESSIBILITY enabled;
//   4. poll AT-SPI over `gdbus` for the app's frame (windowMs), the first list/grid
//      child (firstItemMs) and the item count (itemsMs); when an app does not expose a
//      reliable count, fall back to CPU quiescence of the process tree;
//   5. sample /proc/<pid>/status (VmRSS, VmHWM) summed over the app's process tree.
//
// Requirements on the host: see docs/bench/file-managers.md ("Linux runs").

import { readdirSync, readFileSync } from "node:fs";
import { summarize } from "../lib/prng.ts";
import type { AppId, Metric, ScenarioResult } from "../schema.ts";

export interface LinuxApp {
  id: AppId;
  argv: (dir: string) => string[];
  /** process names whose tree is summed for memory (e.g. dolphin + kioworker) */
  processNames: string[];
  /** AT-SPI roles that hold the item view */
  viewRoles: string[];
  env?: Record<string, string>;
}

export const LINUX_APPS: LinuxApp[] = [
  { id: "gnome-nautilus", argv: (d) => ["nautilus", "--new-window", d], processNames: ["nautilus"], viewRoles: ["table", "list", "tree table", "list box"], env: { GTK_A11Y: "atspi" } },
  { id: "kde-dolphin", argv: (d) => ["dolphin", "--new-window", d], processNames: ["dolphin", "kioworker", "kioslave5"], viewRoles: ["list", "table", "tree table"], env: { QT_ACCESSIBILITY: "1", QT_LINUX_ACCESSIBILITY_ALWAYS_ON: "1", QT_QPA_PLATFORM: "wayland" } },
  { id: "cosmic-files", argv: (d) => ["cosmic-files", d], processNames: ["cosmic-files"], viewRoles: ["list", "table", "grid"] },
  { id: "spacedrive", argv: () => ["spacedrive"], processNames: ["spacedrive", "sd-server"], viewRoles: ["list", "table", "grid"], env: { WEBKIT_DISABLE_COMPOSITING_MODE: "1" } },
];

export type Compositor = "cage" | "weston";

export function compositorArgv(kind: Compositor, socket: string): { argv: string[]; env: Record<string, string> } {
  if (kind === "cage") {
    // cage runs exactly one client; we pass a sleeper and launch apps on its socket.
    return { argv: ["cage", "-d", "--", "sleep", "infinity"], env: { WLR_BACKENDS: "headless", WLR_RENDERER: "pixman", WLR_LIBINPUT_NO_DEVICES: "1" } };
  }
  return { argv: ["weston", "--backend=headless", `--socket=${socket}`, "--width=1920", "--height=1080", "--idle-time=0"], env: {} };
}

// ---------- /proc helpers ----------

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

export function processTree(rootPid: number): number[] {
  const parent = new Map<number, number>();
  for (const name of readdirSync("/proc")) {
    if (!/^\d+$/.test(name)) continue;
    const stat = readText(`/proc/${name}/stat`);
    if (!stat) continue;
    const ppid = Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
    parent.set(Number(name), ppid);
  }
  const out = [rootPid];
  for (let i = 0; i < out.length; i++) for (const [pid, ppid] of parent) if (ppid === out[i]) out.push(pid);
  return out;
}

export function memoryOf(pids: number[]): { rss: number; hwm: number } {
  let rss = 0;
  let hwm = 0;
  for (const pid of pids) {
    const status = readText(`/proc/${pid}/status`);
    if (!status) continue;
    rss += Number(/VmRSS:\s+(\d+)/.exec(status)?.[1] ?? 0) * 1024;
    hwm += Number(/VmHWM:\s+(\d+)/.exec(status)?.[1] ?? 0) * 1024;
  }
  return { rss, hwm };
}

export function cpuTicks(pids: number[]): number {
  let t = 0;
  for (const pid of pids) {
    const stat = readText(`/proc/${pid}/stat`);
    if (!stat) continue;
    const f = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    t += Number(f[11]) + Number(f[12]); // utime + stime
  }
  return t;
}

// ---------- AT-SPI over gdbus ----------

async function sh(argv: string[], env?: Record<string, string>): Promise<string> {
  const p = Bun.spawn(argv, { stdout: "pipe", stderr: "ignore", env: { ...process.env, ...env } });
  const text = await new Response(p.stdout).text();
  await p.exited;
  return text;
}

export async function a11yBusAddress(): Promise<string> {
  const out = await sh(["gdbus", "call", "--session", "--dest", "org.a11y.Bus", "--object-path", "/org/a11y/bus", "--method", "org.a11y.Bus.GetAddress"]);
  return /'([^']+)'/.exec(out)?.[1] ?? "";
}

type Ref = { bus: string; path: string };

async function atspi(addr: string, ref: Ref, iface: string, method: string, ...args: string[]): Promise<string> {
  return sh(["gdbus", "call", "--address", addr, "--dest", ref.bus, "--object-path", ref.path, "--method", `${iface}.${method}`, ...args]);
}

export async function children(addr: string, ref: Ref): Promise<Ref[]> {
  const out = await atspi(addr, ref, "org.a11y.atspi.Accessible", "GetChildren");
  return [...out.matchAll(/\('([^']+)', objectpath '([^']+)'\)/g)].map((m) => ({ bus: m[1]!, path: m[2]! }));
}

export async function roleName(addr: string, ref: Ref): Promise<string> {
  return /'([^']*)'/.exec(await atspi(addr, ref, "org.a11y.atspi.Accessible", "GetRoleName"))?.[1] ?? "";
}

export async function childCount(addr: string, ref: Ref): Promise<number> {
  const out = await sh(["gdbus", "call", "--address", addr, "--dest", ref.bus, "--object-path", ref.path, "--method", "org.freedesktop.DBus.Properties.Get", "org.a11y.atspi.Accessible", "ChildCount"]);
  return Number(/<(\d+)>/.exec(out)?.[1] ?? 0);
}

/** Breadth-first search for the first node whose role is in `roles` (bounded depth). */
export async function findRole(addr: string, start: Ref, roles: string[], maxDepth = 14): Promise<Ref | null> {
  let level = [start];
  for (let d = 0; d < maxDepth && level.length; d++) {
    const next: Ref[] = [];
    for (const r of level) {
      if (roles.includes(await roleName(addr, r))) return r;
      next.push(...(await children(addr, r)));
    }
    level = next.slice(0, 400);
  }
  return null;
}

// ---------- scenario: open-folder ----------

export interface LinuxRunOptions {
  app: LinuxApp;
  folder: string;
  expectedItems: number;
  runs: number;
  compositor: Compositor;
  timeoutMs?: number;
  dataset: ScenarioResult["dataset"];
}

const sleep = (ms: number) => Bun.sleep(ms);

export async function runLinuxOpenFolder(o: LinuxRunOptions): Promise<ScenarioResult> {
  const socket = `fm-bench-${process.pid}`;
  const comp = compositorArgv(o.compositor, socket);
  const compositor = Bun.spawn(comp.argv, { env: { ...process.env, ...comp.env, WAYLAND_DISPLAY: "" }, stdout: "ignore", stderr: "ignore" });
  await sleep(1500);
  const wayland = o.compositor === "weston" ? socket : "wayland-0";
  const addr = await a11yBusAddress();
  const timeout = o.timeoutMs ?? 60_000;
  const runs: Record<string, number | null>[] = [];
  const errors: string[] = [];
  const registry: Ref = { bus: "org.a11y.atspi.Registry", path: "/org/a11y/atspi/accessible/root" };

  for (let run = 1; run <= o.runs; run++) {
    const before = new Set((await children(addr, registry)).map((r) => r.bus));
    const t0 = performance.now();
    const app = Bun.spawn(o.app.argv(o.folder), {
      env: { ...process.env, ...o.app.env, WAYLAND_DISPLAY: wayland, GDK_BACKEND: "wayland", NO_AT_BRIDGE: "0" },
      stdout: "ignore",
      stderr: "ignore",
    });
    let windowMs: number | null = null;
    let firstItemMs: number | null = null;
    let itemsMs: number | null = null;
    let quiesceMs: number | null = null;
    let peak = 0;
    let appRoot: Ref | null = null;
    let view: Ref | null = null;
    let lastTicks = -1;
    let stableSince = 0;

    while (performance.now() - t0 < timeout) {
      const tree = processTree(app.pid);
      peak = Math.max(peak, memoryOf(tree).hwm);
      if (!appRoot) {
        const fresh = (await children(addr, registry)).find((r) => !before.has(r.bus));
        if (fresh && (await childCount(addr, fresh)) > 0) {
          appRoot = fresh;
          windowMs = performance.now() - t0;
        }
      } else if (!view) {
        view = await findRole(addr, appRoot, o.app.viewRoles);
      } else {
        const n = await childCount(addr, view);
        if (n > 0 && firstItemMs === null) firstItemMs = performance.now() - t0;
        if (n >= o.expectedItems) {
          itemsMs = performance.now() - t0;
          break;
        }
      }
      // Fallback: CPU quiescence of the app tree for 500 ms after first item.
      const ticks = cpuTicks(tree);
      if (ticks !== lastTicks) {
        lastTicks = ticks;
        stableSince = performance.now();
      } else if (firstItemMs !== null && quiesceMs === null && performance.now() - stableSince > 500) {
        quiesceMs = stableSince - t0;
      }
      await sleep(10);
    }
    await sleep(1500);
    const mem = memoryOf(processTree(app.pid));
    runs.push({ run, windowMs, firstItemMs, itemsMs, quiesceMs, rss: mem.rss, hwm: Math.max(peak, mem.hwm) });
    if (itemsMs === null) errors.push(`run ${run}: item count never reached ${o.expectedItems}${quiesceMs ? " (quiescence fallback recorded)" : ""}`);
    app.kill();
    await app.exited;
    await sleep(1500);
  }
  compositor.kill();

  const m = (name: string, key: string, unit: Metric["unit"], source: string): Metric => {
    const values = runs.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    return { name, unit, values, ...summarize(values), source };
  };
  return {
    app: o.app.id,
    platform: "linux",
    scenario: "open-folder",
    dataset: o.dataset,
    runs: o.runs,
    cache: "warm",
    metrics: [
      m("windowMs", "windowMs", "ms", "AT-SPI registry: new application with a frame"),
      m("firstItemMs", "firstItemMs", "ms", `AT-SPI ${o.app.viewRoles.join("/")} ChildCount > 0`),
      m("itemsMs", "itemsMs", "ms", "AT-SPI view ChildCount >= expected"),
      m("quiesceMs", "quiesceMs", "ms", "/proc utime+stime of the process tree unchanged for 500 ms"),
      m("workingSetBytes", "rss", "bytes", "/proc/<pid>/status VmRSS summed over the process tree"),
      m("peakWorkingSetBytes", "hwm", "bytes", "/proc/<pid>/status VmHWM summed over the process tree"),
    ],
    errors,
    notes: [`compositor: ${o.compositor} (headless)`],
    raw: runs,
  };
}
