# Bun UI plan

Owner directives received 2026-10-25. Status values: `open`, `active`, `done`.
Builds, clones of large upstreams and qualification run on the VPS (`~/src/bun-ui`).

## Principle

Rewrite as little as possible. Reuse the upstream toolkits through one Material 3
contract and a conversion catalog (`catalog/conversion.toml`) so every host gets
the same themes, colors, components and APIs, and every upstream widget catalog
becomes available to every host.

- Color science and tokens: `crates/aphrody-m3-tokens` (HCT, dynamic color) is
  the only resolver. Emitters write host formats.
- Component behavior: `crates/aphrody-m3` state machines, checked by golden event
  traces against Base UI and each host. AccessKit carries accessibility.
- Tier A hosts draw M3 themselves (web, wgpu/vello, egui, bevy_ui, Qt Bun UI
  style). Tier B hosts re-theme native widgets (GTK/libadwaita, libcosmic,
  WinUI, Win32, KDE/Plasma).

## Phases

| # | Work | Status |
| --- | --- | --- |
| 1 | Repository, upstream inventory and submodules (`upstream/<group>`): gnome, qt, kde, rust, cosmic, wayland, os, wasm, windows, desktop | active |
| 2 | Import the M3 stack from Bun OS with history (`packages/m3*`, `crates/aphrody-m3*`, `libm3`, `craft-ui`, `aphrody-render`, showcases, `docs/material/m3`); Bun OS then consumes Bun UI | active (imported with history; root Cargo and Bun workspaces adopt every crate and package) |
| 3 | Consolidate M3: retire `libm3` into `aphrody-m3` + backend crates; one JS color engine through Rust/wasm; merge duplicate showcases; app-ui on m3-motion, m3-icons, primitives; dialogs and icon buttons accessible; `apps/desktop` on M3 tokens; workspace dependencies only | open |
| 4 | Conversion catalog (`catalog/conversion.toml`): colors, tokens, components, APIs per host | active (`catalog/conversion.toml`; `bun-ui-convert` emits GtkBuilder, QML and egui) |
| 5 | `aphrody-m3-emit`: GTK CSS (+ libadwaita accent variables), Qt QML singleton + QPalette, cosmic-theme RON, egui Visuals/Style, bevy_ui theme resource, WinUI ResourceDictionary, KDE color scheme, Hyprland config, DTCG 2025.10 interchange | active (emitter crate merged; consumed by the GTK, Qt and wasm adapters) |
| 6 | Host adapters: `aphrody-m3-egui`, `aphrody-m3-bevy`, `aphrody-m3-cosmic`, `aphrody-m3-gtk`, `aphrody-m3-qt` (cxx-qt), `aphrody-m3-winui`/`-win32`, `aphrody-m3-wasm` | active (egui, iced+cosmic-theme, bevy, gtk, wasm merged and checked; qt merged, needs system Qt; winui/win32 open) |
| 7 | Converter: constrained TSX/JSX + CSS (oxc + Lightning CSS) to a UI IR, then QML, GtkBuilder/Blueprint, relm4, libcosmic, egui code; fails closed on unsupported constructs | active (`bun-ui-convert` merged; `bun-ui-layout` lays out the CSS subset for bevy_ui and egui) |
| 8 | Unified Rust stack: Tauri 3 fork + winit + wgpu + libcosmic/iced (pop-os forks) + egui + gtk4-rs + cxx-qt behind one app/window/menu/tray/dialog/notification/clipboard/theme API (`catalog/conversion.toml [apis]`); native Win32 parity | active (`aphrody-native-shell`: eframe, winit, bevy and tauri backends) |
| 9 | COSMIC/pop-os: all active pop-os Rust crates under `upstream/cosmic`; reuse cosmic-files, cosmic-settings, cosmic-panel, cosmic-applets, cosmic-store, cosmic-term, cosmic-edit, cosmic-player as Bun OS apps themed by M3 | active |
| 10 | WebAssembly: GTK 4, Qt 6 (Qt for WebAssembly), Wayland client/compositor pieces, Hyprland-compatible shell and their dependencies as complete npm packages with exhaustive FFI coverage (Bun FFI natively, wasm in the browser) | open |
| 11 | GNOME JavaScript (GJS, gnome-shell JS) running on Bun through GObject introspection bindings | active (`packages/gi-bun`: GObject Introspection over bun:ffi, `bun check` clean) |
| 12 | Console emulators written in Qt ported to Qt for WebAssembly | open |
| 13 | WebOS on Wayland/Hyprland semantics with a selectable shell: GNOME Shell, KDE Plasma, COSMIC, or native web-optimized M3; same look as the full OS; Arch Linux in wasm (container2wasm/v86) and on Win32 (MSYS2) | open |
| 14 | ArtCraft (Tauri) code extracted into a reusable creative library for the other apps; Storyteller widgets replaced by M3 equivalents; ArtCraft moved to the Tauri 3 fork | open |
| 15 | Immersive desktop: animated and video wallpapers (Wallpaper Engine scenes, swww/mpvpaper class, shader wallpapers), Lottie/Rive/ThorVG motion, matugen-style wallpaper-to-M3 color, desktop companion (mochi-desktop), fully customizable shell | active |
| 16 | Benchmark in real conditions: Explorer.exe, GNOME Files (Nautilus), KDE Dolphin, COSMIC Files, Spacedrive, and the Bun UI M3 file manager natively and in wasm: cold start, folder of 100k entries, thumbnail grid, search, copy throughput, memory, input latency | open |
| 17 | Chrome QA of the deployed frontends and of the Claude in Chrome tooling | open |

## Workspace state (2026-10-25)

- Merged into `main`: `task/adapters-a`, `task/adapters-b`, `task/wasm`,
  `task/native`, `task/gi`, `task/shell`.
- Root Cargo workspace: every crate under `crates/` is a member; per-crate
  `[workspace]` tables and lockfiles are folded into the root `Cargo.lock`.
  `cargo check --all-targets` runs on the default members (all but
  `aphrody-m3-qt`). Taffy keeps three versions: 0.9 (`aphrody-m3`, as in Bun
  OS), 0.14 (bevy_ui 0.20) and 0.15 (`bun-ui-layout`, pinned for its tree
  traits). iced 0.14 brings wgpu 27 beside wgpu 30.
- Root Bun workspace: `bun install` resolves `packages/*` and `apps/*`;
  `bun check` passes for `m3-tokens`, `m3-wasm` and `gi-bun`.

## Research

- `docs/research/architecture-2026.md`: token pipelines, per-toolkit theming,
  converter architecture, wasm/Win32 limits (claims tagged verified/unverified).
- `docs/research/catalog-2026.md`: project catalog (lead list; entries marked `~`
  need verification).

## Known limits

- Hyprland and Aquamarine need Linux DRM/GBM; the browser path is an emulated
  Linux (container2wasm) or a wasm-native M3 shell with Hyprland-compatible
  configuration and IPC, not Hyprland itself.
- On Windows the Wayland path is WSLg-style (Weston + RDP); WSL is never started
  on the workstation, so Win32 builds and checks run in the VPS factory or on
  Windows CI.
