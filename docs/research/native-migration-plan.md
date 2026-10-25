# Aphrody native migration plan (2026-10-25)

Read-only inventory of `C:\src\bun-os`; LOC counted from `.ts/.tsx/.js/.rs` sources
(excluding node_modules, dist, target). Native status comes from manifests; nothing
was built. Toolkit versions and caveats: `native-toolkits-2026.md`.

Paths: **A** Tauri 3 fork host (`packages/bun-tauri`, `aphrody-tauri*`, `apps/aphrody-app`)
wrapping a web frontend; **B** egui (`crates/craft-ui`, `crates/*-ui-egui`); **C** iced/libcosmic;
**D** bevy_ui (`crates/bun-os-shell`); **E** Rust M3 contracts (`aphrody-m3`, `aphrody-render`).

## Inventory

### Already native through the Tauri 3 host (A)

| App | Stack | LOC | Browser-only | Backend |
| --- | --- | --- | --- | --- |
| `apps/aphrody-app` | Tauri 3 (CEF), tray, splash/pet/widget/quickbar windows, serves `ui-dist` | ~7.5k Rust | from app-ui | in-process app-server broker (JSON-RPC over Tokio duplex) |
| `packages/app-ui` | React M3 shell, chat, explorer, models hub, settings, Files | 61k | games iframe, WebSocket/SSE, localStorage | drive-client, app-server |
| `apps/desktop` | Tauri 3 Inspect CLI catalog | 586 | none | Bun sidecar |
| `apps/aphrody-model-view` | glTF viewer on `aphrody-tauri-3d` | 201 | WebGPU in the plugin | none |
| `apps/m3-example-tauri` | Tauri samples | 843 | - | - |

### Upstream Tauri 2 (port to the fork)

| App | Notes |
| --- | --- |
| `apps/artcraft` | tauri 2.11, dialog/upload/opener, `crates/artcraft-tauri-plugin-http`; 30k Rust |
| `apps/artcraft-web-app` | Remix + React, Konva, ammo.js, mediapipe, PostHog, `@tauri-apps/plugin-http`; 43k |
| `packages/artcraft-frontend` | build wrapper; upstream `apps/` sources absent from this checkout |
| `apps/artcraft_native` | egui rewrite on craft-ui; image/video/audio done, other tools pending; 22k |

### egui Craft studios (B, native and wasm)

Desktop, `-cli` and `-web` crates per studio; UI in `crates/<x>craft-ui-egui` on `craft-ui`
(depends on `aphrody-m3`). Sizes: photocraft 11.6k, pdfcraft 158k (mostly vendor),
vectorcraft 7.8k, filmcraft 5.6k, lightcraft 5.4k, wordcraft 3.7k, effectcraft 3.2k,
figcraft 2.6k (+ server 9.5k), designcraft 2.6k, gridcraft 2.3k, soundcraft 2.3k,
deckcraft 1.3k, cadcraft (web only). Gaps: service worker/worklets in effectcraft-web and
lightcraft-web, no Android targets, no shared menu/dialog/updater.

### Web-only apps and UI packages

| App | Stack | LOC | Browser-only | Backend |
| --- | --- | --- | --- | --- |
| `apps/webos` | vanilla TS browser desktop, v86 Alpine, webos-wasm | 58k | OPFS, service worker, iframes, WebGPU | Bun.serve + nginx, Cloudflare Worker, Postgres, `apps/webos-server` (axum) |
| `apps/play` | React M3 Steam launcher | 3.8k | iframe, WebSocket/SSE | Bun server, bun-steam |
| `apps/m3-showcase`, `m3-web`, `m3-next-*` | demos | 5.5k / 62 / 504 / 116 | small | none |
| `apps/iecode-web` (+ wasm crates) | emulator frontend over Rust wasm | 2.4k + 2.1k Rust | WebGPU, canvas, audio | none |
| `packages/nie-ui` | emulator UI, WebGPU menus | 1.9k | WebGPU | none |
| `packages/product` | CLI serving the web UI, app-server relay | 29.6k | none | Cloudflare, R2, loopback app-server |
| `packages/admin-ui` | Next admin (Tiptap, Drizzle) | 38.9k | none | host app missing |
| `packages/bun-os-platform` | i18n and theme | 4.4k | none | - |

Other: `apps/aphrody-drive` (Spacedrive daemon, no UI), `apps/bun-android` (Compose),
`apps/iecode-dotnet/Gui` (Avalonia), `crates/bun-os-shell` (Bevy 0.20).

## Target per app

| App | Path | Reason |
| --- | --- | --- |
| aphrody-app + app-ui | A (done) | reuse 61k React; add mobile, GTK4 packaging, updater |
| desktop, model-view | A (done) | packaging and signing |
| artcraft + web app | A now, B later | port to aphrody-tauri; grow `artcraft_native`, retire webview |
| play | A | small; Bun server as sidecar or Rust |
| m3 demos | A | static export in the host |
| webos | A for the shell + native backends | OPFS to `aphrody-shell-vfs`; v86 stays wasm |
| product | CLI/server, UI via A | ship as sidecar |
| admin-ui | web (optional A) | Next server actions; admin host missing |
| iecode-web + nie-ui | B or D | Rust core; WebGPU shader to `aphrody-render` (wgpu) |
| Craft studios | B (done) | Android targets, worklet replacements, shared shell |
| bun-os-shell | D (done) | shared auth and updater |
| bun-android | replaced by A/B mobile | keep only as launcher |
| iecode-dotnet | Avalonia | already cross-platform |
| C (iced/libcosmic) | adapter only | no app uses it; keep `aphrody-m3-iced` for COSMIC theming, not a new app toolkit |
| E | base layer | `craft-ui` already on `aphrody-m3` |

## Waves

0. Harden: qualify release builds of aphrody-app, desktop, model-view on three OSes;
   updater and signing through `aphrody-tauri-bundler` / `aphrody-tauri-macos-sign`.
1. Host-only: wrap m3-showcase and play in the Tauri 3 host; one Tauri template for the Next
   examples; product as sidecar.
2. Tauri 2 to fork: `apps/artcraft` onto `aphrody-tauri` + `tauri-plugin-aphrody`
   (dialog, fs, opener, http); keep the http plugin as a fork plugin.
3. Craft polish and Android: shared native shell in all studios; Android cdylib targets
   (photocraft, wordcraft, pdfcraft first); cfg-gate web-only worker code.
4. WebOS native: app-ui `webos` entry inside aphrody-app with a VFS bridge; webos-server
   routes in process.
5. Rewrites: iecode/nie renderers on `aphrody-render` with egui/Bevy; ArtCraft to
   `artcraft_native` at parity.

## Build once

- `aphrody-native-shell`: window state, single instance, deep links, about box; Tauri adapter
  over `tauri-plugin-aphrody`, eframe/Bevy adapter over rfd, muda/tray-icon and the photocraft
  AppKit menu sample.
- One declarative menu model in `aphrody-m3` rendered natively or as an M3 app bar on web.
- Auth through `aphrody-identity` only (device code + keychain).
- File system through `aphrody-shell-vfs` (native FS, SAF on Android, OPFS on wasm).
- One signed update feed for Tauri and the egui/Bevy apps.
- One Rust/TS app-server JSON-RPC client (in process in the host, loopback elsewhere).

## Risks

CEF size and no CEF on Android (mobile Tauri needs wry); no Android build proven yet;
uneven WebGPU in webviews (prefer native wgpu); missing sources (artcraft-frontend,
admin-ui host); upstream code maintenance (ArtCraft, Spacedrive FSL);
Bun.serve/Cloudflare coupling in webos, product, play; duplicated UIs (ArtCraft webview
vs egui, WebOS vs aphrody-app).
