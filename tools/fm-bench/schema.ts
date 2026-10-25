// Results schema for fm-bench. The JSON Schema twin lives in results.schema.json.

export type Platform = "windows" | "linux" | "browser";
export type AppId =
  | "windows-explorer"
  | "gnome-nautilus"
  | "kde-dolphin"
  | "cosmic-files"
  | "spacedrive"
  | "bunos-m3-explorer"
  | "webos-files";

export type ScenarioId =
  | "cold-start-first-paint"
  | "open-folder"
  | "open-100k-folder"
  | "scroll-grid"
  | "thumbnails-2k"
  | "filename-search"
  | "copy-5g"
  | "rss-idle-peak"
  | "input-latency";

export type MetricUnit = "ms" | "bytes" | "MB/s" | "fps" | "count";

export interface Metric {
  /** e.g. windowMs, itemsMs, workingSetBytes */
  name: string;
  unit: MetricUnit;
  /** one value per run, NaN/absent runs dropped */
  values: number[];
  median: number;
  min: number;
  max: number;
  p90: number;
  /** how the number was obtained (UIA status bar, PerformanceObserver, /proc/<pid>/status ...) */
  source: string;
}

export interface ScenarioResult {
  app: AppId;
  platform: Platform;
  scenario: ScenarioId;
  dataset: { profile: string; files: number; bytes: number; seed: number };
  runs: number;
  /** warm = OS file cache not flushed between runs */
  cache: "warm" | "cold";
  metrics: Metric[];
  errors: string[];
  notes: string[];
  raw?: unknown;
}

export interface HostInfo {
  os: string;
  build?: string;
  cpu: string;
  logicalCpus: number;
  ramBytes: number;
  runtime: string;
}

export interface ResultsDocument {
  schema: "fm-bench.results/v1";
  generatedAt: string;
  host: HostInfo;
  results: ScenarioResult[];
}
