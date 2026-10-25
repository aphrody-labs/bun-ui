// Scenario catalogue and the app matrix: which driver measures what, and how.

import type { AppId, MetricUnit, Platform, ScenarioId } from "./schema.ts";
import type { ProfileName } from "./gen-dataset.ts";

export interface ScenarioDef {
  id: ScenarioId;
  title: string;
  dataset: ProfileName;
  /** what "done" means, identical across apps */
  endCondition: string;
  metrics: { name: string; unit: MetricUnit; description: string }[];
  runs: number;
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: "cold-start-first-paint",
    title: "Cold start to first paint of a folder",
    dataset: "flat-10k",
    endCondition: "first item of the target folder is exposed by the accessibility tree / DOM",
    metrics: [
      { name: "windowMs", unit: "ms", description: "launch -> top-level window exists" },
      { name: "firstItemMs", unit: "ms", description: "launch -> first item visible" },
    ],
    runs: 5,
  },
  {
    id: "open-folder",
    title: "Open a 10k-entry folder until the listing is complete",
    dataset: "flat-10k",
    endCondition: "app-reported item count equals the manifest file count",
    metrics: [
      { name: "windowMs", unit: "ms", description: "launch -> window" },
      { name: "firstItemMs", unit: "ms", description: "launch -> first item" },
      { name: "itemsMs", unit: "ms", description: "launch -> full item count reported" },
      { name: "workingSetBytes", unit: "bytes", description: "owner process working set/RSS after settle" },
    ],
    runs: 5,
  },
  {
    id: "open-100k-folder",
    title: "Open a 100k-entry folder until the listing is complete",
    dataset: "flat-100k",
    endCondition: "app-reported item count equals 100,000",
    metrics: [
      { name: "itemsMs", unit: "ms", description: "launch -> full item count reported" },
      { name: "peakWorkingSetBytes", unit: "bytes", description: "peak working set / VmHWM" },
    ],
    runs: 5,
  },
  {
    id: "scroll-grid",
    title: "Scroll the icon grid from top to bottom",
    dataset: "flat-10k",
    endCondition: "last item scrolled into view (ScrollPattern 100% / scrollTop == max)",
    metrics: [
      { name: "scrollMs", unit: "ms", description: "time for 50 page-down steps" },
      { name: "fps", unit: "fps", description: "frames per second during scroll (browser: rAF; native: DWM/compositor frame counter when available)" },
    ],
    runs: 5,
  },
  {
    id: "thumbnails-2k",
    title: "Thumbnail generation for 2,000 images",
    dataset: "images-2k",
    endCondition: "thumbnail cache contains 2,000 entries for the dataset (or all <img> decoded)",
    metrics: [{ name: "thumbnailsMs", unit: "ms", description: "open -> all thumbnails generated" }],
    runs: 3,
  },
  {
    id: "filename-search",
    title: "Filename search for a known needle",
    dataset: "tree-100k",
    endCondition: "result count equals manifest.searchExpectedMatches",
    metrics: [{ name: "searchMs", unit: "ms", description: "query submitted -> final result count" }],
    runs: 5,
  },
  {
    id: "copy-5g",
    title: "Copy 5 GiB to a sibling directory on the same volume",
    dataset: "copy-5g",
    endCondition: "destination byte count equals source byte count and the app's job is finished",
    metrics: [{ name: "throughputMBps", unit: "MB/s", description: "bytes / wall time" }],
    runs: 3,
  },
  {
    id: "rss-idle-peak",
    title: "Idle and peak memory",
    dataset: "flat-10k",
    endCondition: "30 s idle after listing, then peak over the open-folder run",
    metrics: [
      { name: "idleWorkingSetBytes", unit: "bytes", description: "RSS / working set after 30 s idle" },
      { name: "peakWorkingSetBytes", unit: "bytes", description: "PeakWorkingSet64 / VmHWM / performance.memory" },
    ],
    runs: 3,
  },
  {
    id: "input-latency",
    title: "Input latency (keyboard selection move)",
    dataset: "flat-10k",
    endCondition: "selection change event observed after a synthetic Down key",
    metrics: [{ name: "inputLatencyMs", unit: "ms", description: "key injected -> SelectionItem/AT-SPI/DOM selection event" }],
    runs: 20,
  },
];

export interface AppDef {
  id: AppId;
  name: string;
  platform: Platform;
  driver: "windows" | "linux" | "cdp";
  launch: string;
  /** scenario -> availability on this harness today */
  status: "measured" | "driver-unvalidated" | "designed";
}

export const APPS: AppDef[] = [
  { id: "windows-explorer", name: "Windows Explorer", platform: "windows", driver: "windows", launch: "explorer.exe <dir>", status: "measured" },
  { id: "gnome-nautilus", name: "GNOME Files (Nautilus)", platform: "linux", driver: "linux", launch: "nautilus --new-window <dir>", status: "driver-unvalidated" },
  { id: "kde-dolphin", name: "KDE Dolphin", platform: "linux", driver: "linux", launch: "dolphin --new-window <dir>", status: "driver-unvalidated" },
  { id: "cosmic-files", name: "COSMIC Files", platform: "linux", driver: "linux", launch: "cosmic-files <dir>", status: "driver-unvalidated" },
  { id: "spacedrive", name: "Spacedrive", platform: "linux", driver: "linux", launch: "spacedrive (Tauri; location added via its API)", status: "designed" },
  { id: "bunos-m3-explorer", name: "Bun OS M3 explorer (packages/app-ui + m3-explorer)", platform: "browser", driver: "cdp", launch: "app-ui dev server /explorer?path=<dir>", status: "driver-unvalidated" },
  { id: "webos-files", name: "WebOS Files (apps/webos files app)", platform: "browser", driver: "cdp", launch: "https://aphrody.com/os (Files)", status: "driver-unvalidated" },
];
