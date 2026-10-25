// Browser driver: Chrome DevTools Protocol over Bun's built-in WebSocket.
//
// Launches Chrome/Chromium (headless or headed) with --remote-debugging-port, opens
// the target URL, injects a probe that records performance marks and a
// PerformanceObserver (paint, largest-contentful-paint, longtask, event), polls an
// app-specific "listing complete" expression, and samples JS heap
// (Performance.getMetrics) plus the renderer RSS from the OS.

import { summarize } from "../lib/prng.ts";
import type { AppId, Metric, ScenarioResult } from "../schema.ts";

export interface BrowserApp {
  id: AppId;
  url: (dir: string) => string;
  /** JS expression -> number of items rendered/known by the app (DOM or app state) */
  itemCountExpr: string;
  /** JS expression -> truthy once the shell is interactive */
  readyExpr: string;
  /** optional script run before navigation to seed the dataset into the app's VFS */
  seedExpr?: (manifestJson: string) => string;
}

export const BROWSER_APPS: BrowserApp[] = [
  {
    id: "webos-files",
    url: () => Bun.env.FM_BENCH_WEBOS_URL ?? "https://aphrody.com/os",
    readyExpr: `!!document.querySelector('.fx-pane[role="listbox"]')`,
    // WebOS files app: options carry data-path; the preview pane prints "<n> items in <dir>".
    itemCountExpr: `(() => { const t = document.querySelector('.fx-preview .dim')?.textContent ?? ''; const m = /^(\\d+) items/.exec(t); return m ? +m[1] : document.querySelectorAll('.fx-pane [role="option"]').length; })()`,
  },
  {
    id: "bunos-m3-explorer",
    // `bun run dev` in packages/app-ui (m3 dev, --port configurable); override with FM_BENCH_M3_URL.
    url: (dir) => `${Bun.env.FM_BENCH_M3_URL ?? "http://localhost:3000"}/explorer?path=${encodeURIComponent(dir)}`,
    readyExpr: `!!document.querySelector('[role="grid"],[role="listbox"],[role="table"]')`,
    itemCountExpr: `document.querySelectorAll('[role="row"],[role="option"],[role="gridcell"]').length`,
  },
];

const PROBE = `(() => {
  if (window.__fmb) return;
  const w = window.__fmb = { paints: {}, longtasks: 0, longtaskMs: 0, inp: 0, frames: 0 };
  new PerformanceObserver(l => { for (const e of l.getEntries()) w.paints[e.name] = e.startTime; }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) w.paints.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) { w.longtasks++; w.longtaskMs += e.duration; } }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) w.inp = Math.max(w.inp, e.duration); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  const tick = () => { w.frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
})()`;

class Cdp {
  #id = 0;
  #pending = new Map<number, (v: any) => void>();
  constructor(private ws: WebSocket) {
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.#pending.has(msg.id)) {
        this.#pending.get(msg.id)!(msg);
        this.#pending.delete(msg.id);
      }
    });
  }
  static async connect(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", rej, { once: true });
    });
    return new Cdp(ws);
  }
  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = ++this.#id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((res) => this.#pending.set(id, res)).then((m: any) => {
      if (m.error) throw new Error(`${method}: ${m.error.message}`);
      return m.result;
    });
  }
  close() {
    this.ws.close();
  }
}

export interface CdpRunOptions {
  app: BrowserApp;
  chrome: string;
  folder: string;
  expectedItems: number;
  runs: number;
  headless?: boolean;
  timeoutMs?: number;
  dataset: ScenarioResult["dataset"];
  port?: number;
}

export async function runBrowserOpenFolder(o: CdpRunOptions): Promise<ScenarioResult> {
  const port = o.port ?? 9333;
  const profile = `${Bun.env.TMPDIR ?? Bun.env.TEMP ?? "/tmp"}/fm-bench-chrome-${process.pid}`;
  const chrome = Bun.spawn(
    [
      o.chrome,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--enable-precise-memory-info",
      ...(o.headless === false ? [] : ["--headless=new"]),
      "about:blank",
    ],
    { stdout: "ignore", stderr: "ignore" },
  );
  let wsUrl = "";
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try {
      wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
    } catch {
      await Bun.sleep(100);
    }
  }
  const cdp = await Cdp.connect(wsUrl);
  const timeout = o.timeoutMs ?? 60_000;
  const runs: Record<string, number | null>[] = [];
  const errors: string[] = [];

  for (let run = 1; run <= o.runs; run++) {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Performance.enable", {}, sessionId);
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE }, sessionId);
    const evalNum = async (expr: string) =>
      (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true }, sessionId)).result?.value;

    const t0 = performance.now();
    await cdp.send("Page.navigate", { url: o.app.url(o.folder) }, sessionId);
    let readyMs: number | null = null;
    let firstItemMs: number | null = null;
    let itemsMs: number | null = null;
    while (performance.now() - t0 < timeout) {
      try {
        if (readyMs === null && (await evalNum(o.app.readyExpr))) readyMs = performance.now() - t0;
        const n = Number(await evalNum(o.app.itemCountExpr)) || 0;
        if (n > 0 && firstItemMs === null) firstItemMs = performance.now() - t0;
        if (n >= o.expectedItems) {
          itemsMs = performance.now() - t0;
          break;
        }
      } catch {
        // navigation in flight
      }
      await Bun.sleep(10);
    }
    await Bun.sleep(1500);
    const probe = (await evalNum("JSON.stringify(window.__fmb ?? {})")) as string;
    const p = JSON.parse(probe || "{}");
    const metrics = (await cdp.send("Performance.getMetrics", {}, sessionId)).metrics as { name: string; value: number }[];
    const heap = metrics.find((x) => x.name === "JSHeapUsedSize")?.value ?? null;
    runs.push({
      run,
      readyMs,
      firstItemMs,
      itemsMs,
      fcpMs: p.paints?.["first-contentful-paint"] ?? null,
      lcpMs: p.paints?.lcp ?? null,
      longtaskMs: p.longtaskMs ?? null,
      jsHeapBytes: heap,
    });
    if (itemsMs === null) errors.push(`run ${run}: item count never reached ${o.expectedItems}`);
    await cdp.send("Target.closeTarget", { targetId });
  }
  cdp.close();
  chrome.kill();

  const m = (name: string, unit: Metric["unit"], source: string): Metric => {
    const values = runs.map((r) => r[name]).filter((v): v is number => typeof v === "number");
    return { name, unit, values, ...summarize(values), source };
  };
  return {
    app: o.app.id,
    platform: "browser",
    scenario: "open-folder",
    dataset: o.dataset,
    runs: o.runs,
    cache: "warm",
    metrics: [
      m("readyMs", "ms", "CDP Runtime.evaluate poll of readyExpr"),
      m("fcpMs", "ms", "PerformanceObserver paint: first-contentful-paint"),
      m("lcpMs", "ms", "PerformanceObserver largest-contentful-paint"),
      m("firstItemMs", "ms", "itemCountExpr > 0"),
      m("itemsMs", "ms", "itemCountExpr >= expected"),
      m("longtaskMs", "ms", "PerformanceObserver longtask total"),
      m("jsHeapBytes", "bytes", "CDP Performance.getMetrics JSHeapUsedSize"),
    ],
    errors,
    notes: [`chrome: ${o.chrome}`, o.headless === false ? "headed" : "headless=new"],
    raw: runs,
  };
}
