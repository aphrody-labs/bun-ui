# File-manager benchmark (fm-bench)

Real-conditions comparison of Windows Explorer, GNOME Files (Nautilus), KDE
Dolphin, COSMIC Files, Spacedrive and the Bun OS M3 file manager
(`packages/app-ui` explorer routes + `packages/m3-explorer`, and the WebOS Files
app `apps/webos/src/apps/files*` in `bun-os`), both native and in the
browser/WebAssembly.

Harness: [`tools/fm-bench/`](../../tools/fm-bench/). It is Bun TypeScript with
no npm dependencies, plus one Windows PowerShell 5.1 script for UI Automation.

## Status

| App | Platform | open-folder (10k) | Other scenarios |
| --- | --- | --- | --- |
| Windows Explorer | Windows 11 | **Measured** (below) | Not yet measured |
| GNOME Files (Nautilus) | Linux, headless Wayland | Driver written, not yet run | Not yet measured |
| KDE Dolphin | Linux, headless Wayland | Driver written, not yet run | Not yet measured |
| COSMIC Files | Linux, headless Wayland | Driver written, not yet run | Not yet measured |
| Spacedrive | Linux (Tauri/WebKitGTK) | Designed only | Not yet measured |
| Bun OS M3 explorer | Browser (CDP) | Driver written, not yet run | Not yet measured |
| WebOS Files (aphrody.com/os) | Browser (CDP) | Driver written, not yet run | Not yet measured |

"Driver written" means the code exists and bundles, but has not been run
against that app. Expect to adjust selectors and AT-SPI roles on the first run.

## Methodology

- **Deterministic datasets.** `gen-dataset.ts` writes a seeded tree (mulberry32
  PRNG, seed 1 by default) to `<target>/<profile>/`. It also writes a manifest
  next to the tree, not inside it, so the manifest never changes an item count.
  The same seed and profile give byte-identical files.

  | Profile | Content |
  | --- | --- |
  | `flat-10k` | 10,000 files in one folder; 20 extensions; 5% empty, otherwise log-uniform 16 B to 64 KiB (~70.6 MiB) |
  | `flat-100k` | Same mix, 100,000 files in one folder |
  | `tree-100k` | 100,000 entries: a 64-level deep chain plus 50 bushy branches up to depth 12, ~5% directories |
  | `images-2k` | 2,000 real PNGs, 320x240 to 1920x1080 (encoded with `Bun.deflateSync` + CRC32) |
  | `copy-5g` | 4 x 1 GiB + 1,024 x 1 MiB of seeded, incompressible data |

  1% of the names contain the needle `zebra`, and the manifest records the
  expected match count (`searchExpectedMatches`), so search results can be
  checked.
- **One end condition per scenario, shared by every app.** Each scenario ends on
  a value the app itself reports, read through the accessibility tree (UIA,
  AT-SPI) or the DOM. Screen-scraping and fixed sleeps are not used.
- **Runs.** 5 runs per scenario by default (3 for thumbnails/copy/RSS, 20 for
  input latency). The report gives the median, min, max and p90.
- **Cache.** Runs are **warm**: the OS file cache is not flushed, because no
  admin tools are used on the workstation. On the VPS, cold runs can use
  `echo 3 > /proc/sys/vm/drop_caches` (root) between runs; those are labelled
  `cold`.
- **Memory.** Working set / RSS of the process that owns the window, read after
  a 1.5 s settle. On Linux it is summed over the app's process tree (Dolphin's
  `kioworker`s, Spacedrive's server). Peak = `PeakWorkingSet64` / `VmHWM`.
  Browser runs add the JS heap from CDP `Performance.getMetrics`.
- **Timing origin.** A stopwatch starts just before the launch call
  (`Start-Process`, `Bun.spawn`, CDP `Page.navigate`). Polling runs every 5 to
  10 ms, so each timestamp is accurate to within one poll interval plus the cost
  of one UIA/AT-SPI query.

### Scenarios

| Id | Dataset | End condition | Metrics |
| --- | --- | --- | --- |
| `cold-start-first-paint` | flat-10k | first item exposed | windowMs, firstItemMs |
| `open-folder` | flat-10k | app-reported count == 10,000 | windowMs, firstItemMs, itemsMs, working set |
| `open-100k-folder` | flat-100k | count == 100,000 | itemsMs, peak working set |
| `scroll-grid` | flat-10k | ScrollPattern 100% / scrollTop == max | time for 50 page-downs, fps |
| `thumbnails-2k` | images-2k | 2,000 thumbnails cached / decoded | thumbnailsMs |
| `filename-search` | tree-100k | result count == manifest | searchMs |
| `copy-5g` | copy-5g | destination bytes == source, job done | MB/s |
| `rss-idle-peak` | flat-10k | 30 s idle after listing | idle and peak working set |
| `input-latency` | flat-10k | selection event after synthetic Down key | inputLatencyMs |

Only `open-folder` and `open-100k-folder` have automated driver steps today.
The other scenarios are specified above but `run.ts` refuses to run them. Those
steps still need to be written: UIA `ScrollPattern`, AT-SPI `Selection`
events, thumbnail cache inspection (`%LOCALAPPDATA%\Microsoft\Windows\Explorer\thumbcache_*.db`,
`~/.cache/thumbnails/{normal,large}`), and the app's own copy job.

## Measured: Windows Explorer, open-folder, flat-10k

Host: Windows 11 Home Insider Preview build 28120, Intel Core i7-13700F (24
logical CPUs), 31.8 GiB RAM, Bun 1.4.6 canary. Dataset `flat-10k`, seed 1,
10,000 files, 70.6 MiB, generated under `%TEMP%` and deleted afterwards. 5 runs,
warm cache, default view of an unconfigured folder.

| Metric | Median | Min | Max |
| --- | ---: | ---: | ---: |
| Launch -> Explorer window (`windowMs`) | **472 ms** | 441 ms | 1,436 ms |
| Launch -> first item in the view (`firstItemMs`) | **1,077 ms** | 998 ms | 1,555 ms |
| Launch -> status bar reports 10,000 items (`itemsMs`) | **1,107 ms** | 1,020 ms | 1,592 ms |
| Working set of the window's process, 1.5 s after listing | **181.7 MiB** | 168.8 MiB | 185.7 MiB |
| Private bytes of that process | **131.4 MiB** | 113.4 MiB | 134.6 MiB |
| Peak working set of that process | **185.7 MiB** | 181.7 MiB | 189.1 MiB |

Raw data: [`tools/fm-bench/results/windows-explorer-open-folder-flat-10k.json`](../../tools/fm-bench/results/windows-explorer-open-folder-flat-10k.json)
(generated report alongside it).

How it was measured (`drivers/windows-explorer.ps1`):

1. Snapshot the existing `CabinetWClass` windows, then `Start-Process explorer.exe <dir>`.
2. `windowMs`: a new `CabinetWClass` top-level window appears in the UIA root.
3. `firstItemMs`: the `UIItemsView` list has its first `ListItem` child.
4. `itemsMs`: the status bar `MetadataLabel` (for example "10 000 élément(s)") parses
   to 10,000. The parse keeps digits only, so it does not depend on the locale.
   `GridPattern.RowCount` was rejected because it only counts realized rows (32 here).
5. Memory comes from `Get-Process` on the window's owner PID. Then the window gets
   `WM_CLOSE`.

Caveats:

- On this build every folder window was hosted by a **new `explorer.exe`
  process** (5/5 runs), even with `SeparateProcess = 0`. So the working set is
  the whole folder-window process, not a delta inside the shell process.
- The first run (1.4 s to window) includes spinning up that process with colder
  DLLs. The median comes from runs 2 to 5.
- The dataset had just been written, so its metadata was in the file cache.
  These are warm-cache numbers.
- In 2 of 5 runs the window had already closed by the end of the 1.5 s settle,
  before the driver sent `WM_CLOSE`. Its timings and memory had been captured
  first. The cause looks like an external window closer on this desktop; the
  driver records it as `windowAliveAtEnd`.

Reproduce:

```powershell
bun tools/fm-bench/run.ts --app windows-explorer --scenario open-folder --runs 5 `
  --data "$env:TEMP\fm-bench-run" `
  --out tools/fm-bench/results/windows-explorer-open-folder-flat-10k.json `
  --report tools/fm-bench/results/windows-explorer-open-folder-flat-10k.md --cleanup
```

Requirements: an interactive desktop session, Windows PowerShell 5.1
(`UIAutomationClient`). No installation or admin rights. Do not lock the screen
or switch virtual desktops during the runs.

## Linux runs (VPS) — not yet measured

The workstation does not run Linux apps (WSL is off-limits). Linux runs go on
the VPS in `~/src/bun-ui`, inside the shared build-factory slot budget.

Packages (Arch / pacman, the Bun OS primary package manager):

```sh
sudo pacman -S --needed weston cage dbus at-spi2-core glib2 \
  nautilus dolphin kio-extras cosmic-files \
  gvfs tumbler ffmpegthumbnailer        # thumbnail scenario
# Spacedrive: AUR `spacedrive-bin`, or the upstream AppImage/.deb
```

Debian/Ubuntu equivalents: `weston cage dbus-x11 at-spi2-core libglib2.0-bin nautilus dolphin kio-extras`
(COSMIC Files from the System76 PPA or a source build).

Headless session (a private session bus wraps the whole run, so AT-SPI and the
apps share one bus):

```sh
cd ~/src/bun-ui
export XDG_RUNTIME_DIR=$(mktemp -d) GTK_A11Y=atspi QT_LINUX_ACCESSIBILITY_ALWAYS_ON=1
dbus-run-session -- sh -c '
  /usr/lib/at-spi-bus-launcher --launch-immediately &
  sleep 1
  for app in gnome-nautilus kde-dolphin cosmic-files; do
    bun tools/fm-bench/run.ts --app $app --scenario open-folder --runs 5 \
      --compositor weston --data /var/tmp/fm-bench-data \
      --out tools/fm-bench/results/$app-open-folder-flat-10k.json \
      --report tools/fm-bench/results/$app-open-folder-flat-10k.md
  done'
```

- The compositor is `weston --backend=headless --socket=fm-bench-<pid>`
  (1920x1080). `--compositor cage` uses `WLR_BACKENDS=headless` and
  `WLR_RENDERER=pixman`.
- `windowMs`: a new application appears on the AT-SPI registry with a frame.
  `firstItemMs` / `itemsMs`: the item view (role `table`/`list`/`tree table`)
  `ChildCount`, read through `gdbus` on the a11y bus.
- **Validate first:** GTK4 (Nautilus) and libcosmic may expose only the
  realized children of a virtualized view. When the count never reaches the
  expected value, the driver also records `quiesceMs`: the moment the app's
  process tree stops using CPU for 500 ms after the first item. Report it
  separately and never mix it with `itemsMs`.
- Memory: `/proc/<pid>/status` `VmRSS`/`VmHWM`, summed over the process tree.
- Spacedrive indexes a "location" through its own core before showing it. Its
  `open-folder` therefore needs the location added through its API first, and
  the timing splits into index time and view time. This is designed but not yet
  scripted.

## Browser runs (CDP) — not yet measured

`drivers/cdp.ts` starts Chrome/Chromium with `--remote-debugging-port` and
`--enable-precise-memory-info`, connects over Bun's built-in `WebSocket`, injects
a probe (PerformanceObserver for `paint`, `largest-contentful-paint`,
`longtask`, `event`; a rAF frame counter), polls the app's item-count
expression and reads the JS heap from `Performance.getMetrics`.

```sh
# WebOS Files on production
bun tools/fm-bench/run.ts --app webos-files --scenario open-folder \
  --chrome /usr/bin/chromium --out tools/fm-bench/results/webos-files-open-folder.json
# Bun OS M3 explorer: start `bun run dev` in bun-os/packages/app-ui first
FM_BENCH_M3_URL=http://localhost:3000 bun tools/fm-bench/run.ts --app bunos-m3-explorer \
  --scenario open-folder --chrome /usr/bin/chromium --out tools/fm-bench/results/m3-open-folder.json
```

Open items before these numbers mean anything:

- **Dataset injection.** WebOS Files reads its in-browser VFS, not the host
  disk. The 10k dataset has to be seeded into that VFS first, through the
  driver's `seedExpr` hook or a WebOS import API. Until then the count condition
  cannot reach 10,000. The M3 explorer needs its backend pointed at the
  generated directory.
- **Selectors.** WebOS: `.fx-pane[role=listbox]` with `[role=option]` items, and
  the preview's "N items in ..." line. M3 explorer: ARIA `grid`/`row`/`option`
  roles, still to be confirmed against `packages/app-ui/src/routes/explorer`.
  Both views are virtualized, so counting DOM rows gives a lower bound. Prefer
  the app-reported total.
- **Native vs WASM.** Run the same scenario in headless and headed Chromium on
  the VPS, and in headed Chrome on the Windows workstation, to separate the
  render path from the engine. Renderer RSS comes from the OS (`Get-Process` /
  `/proc`) for the `--type=renderer` child.

## Files

- `tools/fm-bench/gen-dataset.ts`: dataset generator and manifests
- `tools/fm-bench/scenarios.ts`: scenario definitions and the app matrix
- `tools/fm-bench/schema.ts`, `tools/fm-bench/results.schema.json`: results schema (`fm-bench.results/v1`)
- `tools/fm-bench/run.ts`: runner; `tools/fm-bench/report.ts`: Markdown report
- `tools/fm-bench/drivers/windows.ts` + `windows-explorer.ps1`: UIA / Get-Process
- `tools/fm-bench/drivers/linux.ts`: headless Wayland + AT-SPI (gdbus) + /proc
- `tools/fm-bench/drivers/cdp.ts`: Chrome DevTools Protocol over Bun WebSocket

`bun check tools/fm-bench` only reports missing ambient Bun/Node types. The
repository deliberately has no `@types/bun` dependency. `bun build
tools/fm-bench/run.ts --target=bun` bundles all modules cleanly.
