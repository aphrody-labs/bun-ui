# Native Rust UI toolkits for migrating web apps (state at 2026-10-25)

Method: Exa searches and fetches of release notes and changelogs. Context7 was not queried, so API snippets come from release notes, not from Context7 doc pages. Items marked (unverified) come from general knowledge or are inferred, not from a fetched source. The version ranges in the brief are already stale. The sources show egui 0.36 (0.37 changelog on main), Bevy 0.20, Taffy 0.15, iced 0.14 (0.15 in development), libcosmic 1.0 and Tauri 2.12 with Tauri 3 in alpha.

## 1. Versions and status

| Toolkit | Latest found | Date | Source |
|---|---|---|---|
| egui / eframe | 0.36.0 released; 0.37.0 changelog on main (release not confirmed) | 0.36: 2026-08-05 | github.com/emilk/egui/releases |
| iced | 0.14.0 released; 0.15.0-dev on master | 0.14: 2025-12-07 | github.com/iced-rs/iced/releases |
| libcosmic | 1.0.0 (Rust 1.93, edition 2024) | Cargo.toml on master | github.com/pop-os/libcosmic |
| Bevy | 0.20 (0.19 on 2026-06-19, 0.18 on 2026-01-13, 0.17 on 2025-09-30) | 0.20: 2026-10-08 | bevy.org/news |
| bevy_egui | 0.43.1, for Bevy 0.20 | 2026-10-10 | bevy_egui CHANGELOG |
| Tauri | 2.12.3 stable; 3.0.0-alpha.5 and tauri-runtime-cef 3.0.0-alpha.6 | 2026-10-14 | v2.tauri.app/release |
| Taffy | 0.15.0 (0.9 on 2025-07, 0.10 on 2026-03-31, 0.11 on 2026-06-12) | 2026-10-17 | github.com/DioxusLabs/taffy |

Taffy numbering moved fast: 0.9, 0.10, 0.11, then 0.15. Intermediate versions were not read.

## 2. Comparison table

| Axis | egui/eframe 0.36 | iced 0.14 | libcosmic 1.0 | Bevy UI 0.20 | Tauri 2.12 / 3 alpha |
|---|---|---|---|---|---|
| Model | Immediate mode | Elm MVU, retained widget tree | iced fork, MVU with `cosmic::Application` and `Core` | ECS, `Node` components, observers, BSN scenes | Web UI in a system webview, Rust backend |
| Entry | `eframe::App` with `logic` and `ui(&mut Ui)` (0.34+, replaces `update`) | `iced::application(...)` builder | `cosmic::Application` trait | `App::new().add_plugins(DefaultPlugins)`, UI via `bsn!` (0.19+) | `tauri::Builder`, plugins, capability files |
| Layout | Immediate, single pass plus sizing passes | Own flex-like `Limits`/`Length` layout. A `grid` widget exists since 0.14 | iced layout, with `autosize` for applets | Taffy-backed `Node` (flex, grid, block) | Browser CSS |
| Theming | `Visuals`/`Style`; per-widget style (0.34); `StyleProvider` and classes (experimental, 0.35 to 0.37) | `Catalog` traits per widget, `Palette` generated from Oklch (0.14) | `cosmic-theme`, system config over dbus | Feathers `ThemeToken` (primitive); headless widgets are unthemed | CSS and design tokens |
| Text | skrifa + vello_cpu since 0.34, hinting and variable fonts; 0.37 adds colour emoji via `GlyphRasterizer` | cosmic-text 0.15 | cosmic-text | Parley since 0.19 (was cosmic-text) | Browser engine |
| A11y (AccessKit) | Always on since 0.34; `Role`, `accessible_name` and hidden-node handling in 0.37 | Not upstream. PR #1849 is still a draft | Works via the `a11y` feature (default), some widgets lack focus or a11y, dropdowns not focusable (maintainer, Jan 2026) | Feathers claims built-in a11y. `bevy_a11y` exists. bevy_egui AccessKit is opt-in | Webview a11y (native per platform) |
| wasm32 | eframe web (wgpu default, WebGL fallback since 0.34.1) | Yes (wgpu/WebGPU or tiny-skia, WebGL fixes) | Not a target (unverified) | Yes (WebGL2/WebGPU, with feature caveats) | N/A (hosts the web) |
| Multi-window | Viewports. The Ui is passed to the viewport callback since 0.34 | Yes (`daemon`/multi-window) (unverified detail) | `multi-window` feature, Wayland-first | Multiple `Window` entities | Native multiwebview windows |
| IME | Reworked in 0.34, 0.35 and 0.36, including web/mobile keyboards | Input method support added in 0.14 | Inherited from iced | `EditableText` (0.19) has IME, bidi and multiline. No undo/redo or password masking yet | Browser |
| Mobile | iOS safe area (0.33); Android via NativeActivity, with AccessKit disallowed on that path | Not a focus (unverified) | No | Android and iOS supported | Official Android and iOS |
| GPU | wgpu 29, default since 0.34, glow optional | wgpu 27 with tiny-skia fallback. `vello_cpu` replacement proposed | wgpu or tiny-skia | wgpu 27 or newer (Bevy-owned) | Webview GPU, or CEF |
| Testing | `egui_kittest` (AccessKit queries and dify image snapshots) | Headless mode and end-to-end `tester` feature (0.14) | Via iced | Manual ECS tests | tauri-driver (WebDriver) |

## 3. Per-toolkit notes

### egui / eframe (0.32 to 0.36, 0.37 on main)
- **Entry API.** In 0.34, `App::update(&Context)` was replaced by `fn logic` and `fn ui(&mut Ui)`. `Context::run_ui` is the new entry. `Ui` now derefs to `Context`. `SidePanel` and `TopBottomPanel` became one `Panel`, and panels should be used through `show_inside`. `Context::style` is now `global_style`.
- **Version history.**
  - 0.32: external event loop, Shadow DOM.
  - 0.33: `egui::Plugin`, iOS safe area.
  - 0.34: wgpu as the default backend, AccessKit always on, skrifa fonts, MSRV 1.92.
  - 0.35: `egui_inspection` and `egui_mcp` (an MCP server that can read the AccessKit tree and drive a running app), `Classes` on `Ui`, better IME composition visuals.
  - 0.36: mobile keyboard and IME on web, window chrome theme sync, MSRV 1.95.
- **Theming.** There is no token system. 0.37 adds an experimental `StyleProvider` per widget plus classes, which is the closest thing to CSS.
- **Layout.** There is no flex or grid solver. For CSS-like layout, compute rects with Taffy and place widgets with `allocate_ui_at_rect`. This is an inference, not a documented pattern.
- **Wasm and web.** `default_fonts` stops being a default feature in 0.37. Colour emoji needs a `GlyphRasterizer`.
- **Material 3.** `egui-material3` 0.0.9 exists. It is early and its docs.rs build failed.

### iced (0.13 to 0.14) and libcosmic
- **Entry API.** `iced::application(boot, update, view)` returns a builder with `.theme()`, `.subscription()` and `.run()`. This follows 0.13 behaviour and was not re-checked against 0.14 docs.
- **0.14 additions.** Reactive rendering, headless testing and end-to-end `tester`, input method support, hot reload, `table`, `grid`, `sensor`, `float` and `pin` widgets, `Animation`, system theme reactions, cosmic-text 0.15, wgpu 27.
- **Theming.** Each widget has a `Catalog` trait, and the palette is generated in Oklch.
- **Accessibility.** There is none upstream. The libcosmic fork carries an AccessKit-based `iced_accessibility` and `a11y` is a default feature. The upstream PR #1849 is a draft, last updated 2026-05-22, and sits on the 0.15 milestone.
- **libcosmic.** MVU with `Application`, `Core`, tasks and subscriptions. It targets Wayland, with X11 as a feature, and the default features include `winit`, `tokio`, `a11y`, `dbus-config` and `multi-window`. It pins an iced fork, so it does not follow upstream iced releases. Windows and macOS support is a secondary concern (unverified).
- **Material 3 on iced.** Two crates exist: `material-iced` and `iced_m3`.
  - `iced_m3` targets upstream iced 0.14. It includes spring motion tokens pinned to AndroidX, and its own docs say there is no native screen-reader support and no full RTL.
  - `moeleak/material-ui-rs` is a third option, also for iced 0.14, and it ships a wasm showcase.

### Bevy UI (0.16 to 0.20)
- **Node model.** `Node` components laid out by Taffy, with `bevy_picking` for input.
- **0.17.** Added the experimental headless widgets `bevy_ui_widgets` (Button, Slider, Scrollbar, Checkbox, Radio) and `bevy_feathers`. Behaviour comes from `Hovered`, `Pressed`, `Checked` and `InteractionDisabled`, and `Activate` and `ValueChange` events handled by observers. UI gradients and `UiMaterial` also arrived here.
- **0.18.** Added Popover (floating-ui style placement), MenuPopup and pickable text sections.
- **0.19.** Landed BSN (`bsn!`), now the primary way to write UI and Feathers widgets. `EditableText` arrived with IME. `bevy_text` moved from cosmic-text to Parley. Feathers dropped its "experimental" flag.
- **0.20.** Added Feathers colour input, dropdown, scrollable list and tabs (headless). BSN syntax changed with `@` scene references.
- **Theming.** Feathers theme support is described by the maintainers as primitive, built on `ThemeToken`. `bevy_ui_widgets` is deliberately unthemed.
- **Fit.** Bevy is a good fit for game-like or 3D-integrated UI. It is a weak fit for form-heavy Material apps, because text input is minimal, a11y depth is unclear and the API still moves every release.
- **Taffy version.** A Dependabot PR bumped Bevy from Taffy 0.7 to 0.9. Which Taffy 0.20 uses was not checked.

### Tauri (2.x and the Tauri 3 direction)
- **Stable.** 2.12.3 (2026-10-10). The 2.12 release notes list Windows 7 dropped, MSRV 1.90, `on_permission_request`, `appDirectoriesOverride` and Android template updates.
- **Tauri 3 is in alpha.** `tauri 3.0.0-alpha.5` and the `tauri-runtime-cef` alpha were published around 2026-10-14. Planned breaking changes in the milestone:
  - Remove `tauri::Wry` and the `wry`/`cef` feature flags. You choose a runtime crate (`tauri-runtime-wry` or `tauri-runtime-cef`) and pass it to `Builder::<R>`.
  - A GTK4 and WebKitGTK 6 migration PR is open.
  - `Webview::navigate` takes a `WebviewUrl`.
- **CEF.** CEF gives a consistent Chromium on Linux, and one production report (Readest 0.12.8) says it fixed WebKitGTK jank. Reported pitfalls: `--no-first-run`, rfd GTK dialogs crash CEF, Range requests on custom protocols.
- **Servo.** Verso is halted for lack of funding or manpower, per a maintainer in Feb 2026.
- **Linux.** A maintainer states there is no future in WebKitGTK.
- **Capabilities.** Permissions are granted per window or webview through capability JSON files.
- **Native panels.** `tauri-plugin-egui` (third party) renders egui into Tauri windows with wgpu, and needs `wry_plugin` support merged in Tauri 2.7. Tauri's own old `tauri-egui` is deprecated.

### Taffy (0.6 to 0.15)
Supported, by release:
- **0.3.** Flexbox and CSS Grid.
- **0.4.** Block layout (block containers with block children), `overflow` (visible, clip, hidden, scroll) and `scrollbar_width`. `overflow: auto` was not implemented as of 0.4.
- **0.8.** `calc()` in the low-level API only. The embedder implements `resolve_calc_value`, and values are passed as tagged pointers. It is feature-flagged.
- **0.9.** Named grid lines and `grid-template-areas`.
- **0.10.** `direction` (RTL) for block, flex and grid. `float` and `clear` behind the `float_layout` feature. `FromStr` CSS parsing behind the `parse` feature.
- **0.11.** Safe alignment keywords. The types became structs, for example `AlignContent::START`.
- **0.15.** `position: static` is now the default, plus `fixed`. Absolute and fixed boxes are hoisted to their containing block. `normal` is a first-class alignment keyword and `align_items` and similar are no longer `Option`.

Not supported: inline layout (text flow, inline-block, line boxes) was explicitly absent in 0.4 and no later release shows it. Text is handled through measure functions, with examples for cosmic-text and Parley.

For a web migration, expect to implement your own inline text layout and `calc()` plumbing. The 0.15 breaking changes touch custom tree implementations.

## 4. Embedding and combining

| Combination | Verdict |
|---|---|
| egui in Bevy (`bevy_egui`) | Mature. 0.43 maps to Bevy 0.20; 0.42 and 0.43 target egui 0.36. Use `EguiPlugin::default()` and the `EguiPrimaryContextPass` schedule. Contexts attach to cameras, and render-to-image is supported. IME and AccessKit are available, AccessKit behind a feature flag. Remember that Bevy 0.20 UI and egui are two separate UI systems. |
| egui in Tauri | Possible. `tauri-plugin-egui` creates a wgpu surface per Tauri window. Tauri 2.7+ is required. It is a third-party plugin. |
| Tauri webview alongside wgpu/egui in one window | wry supports child webviews through raw-window-handle on Windows, macOS and Linux X11 only. Wayland is not supported. A transparent webview over a native surface is unreliable: on Windows the "airspace" problem needs `SetWindowRgn` hole-punching, per the `airspace` crate. Prefer separate child windows or panes side by side. |
| iced in Tauri | No maintained path was found. wry can attach to a winit window, but iced owns its own winit loop, so mixing is awkward. Prefer separate processes or windows (inference). |
| Shared wgpu device | Bevy owns its device. egui-wgpu can use any device. iced embeds its own through `iced_wgpu`. Sharing across toolkits needs custom glue, and nothing documents it. |
| Taffy as a shared layout engine | Feasible. The `LayoutPartialTree` and related low-level traits let you plug in your own node store. egui, iced and Bevy still have their own layout, so Taffy would be a layer above them, not a replacement. |

## 5. Best practices for a cross-platform Material 3 library

- **Tokens.** Define a toolkit-neutral token set (colour roles, type scale, shape, elevation, state-layer opacities, motion curves). Export it as data and generate per-toolkit adapters:
  - egui: `Visuals`, or the 0.37 `StyleProvider`.
  - iced: `Catalog` impls.
  - Bevy: `ThemeToken` resources.
  - web: CSS variables.
  Colour roles should come from Material Color Utilities (HCT). `material_iced` has a colour module based on it.
- **State machines.** Keep the interaction state (enabled, hovered, focused, pressed, dragged, selected, error) in one shared Rust type and map it to state-layer opacity. M3 states are the same across toolkits, so write the machine once.
  - Bevy's headless widgets (`Hovered`, `Pressed`, `Checked`, `InteractionDisabled`) show the same decomposition.
  - Keep animations on spring tokens, as `iced_m3` does, but give reduced-motion a path.
- **Accessibility.** Build on AccessKit everywhere. egui is the strongest, libcosmic is partial, iced has none upstream, and `iced_m3` states no screen-reader support. Treat the web build as the accessibility reference and add a name to every interactive widget. egui_kittest already fails tests on an input widget without a name.
- **Testing.**
  - egui: `egui_kittest` with dify image snapshots, `kittest.toml` per-OS thresholds, and the new egui_mcp inspection for agent-driven checks.
  - iced: headless mode and `tester`.
  - Bevy: render to an image and compare.
  - Keep goldens per OS and GPU backend, and prefer software-rendered goldens (tiny-skia, vello_cpu or CPU wgpu) for stable CI.
  - Keep `max_failed_pixels` near zero, since the egui docs warn that a high value hides real changes.
- **Performance budgets.** No source measured these. Proposed targets to validate by measurement:
  - 60 fps idle-to-active frames on reference hardware.
  - Idle CPU near zero. Reactive redraw exists in iced 0.14, in egui (`request_repaint`) and in Bevy (`UpdateMode::Reactive`).
  - Bounded text relayout, since Parley and cosmic-text relayout is the main cost.
  - Run the same budget in CI on a fixed machine.
- **Scope the toolkit set.** Do not target all of them equally. Pick one primary native toolkit and keep the others as adapters.

## 6. Recommendations for migrating web apps to native

1. **Choose by app type.**
   - Tool-style or form-heavy apps: egui (the most mature a11y, IME, testing and wasm story).
   - Desktop apps with a stricter structure: iced, with the caveat that there is no upstream a11y.
   - COSMIC and Linux-first apps: libcosmic.
   - Game-like or 3D apps: Bevy UI.
2. **Keep Tauri for content-heavy screens.** Migrate to native panels only where the webview is the bottleneck (editors, canvases, video). Tauri 3 alpha with the CEF runtime fixes the WebKitGTK problem on Linux, but it is still alpha, so pilot it behind a feature flag rather than shipping it.
3. **Do not mix toolkits in one window** unless you have to. The one reliable route is `bevy_egui`. For Tauri plus native, use side-by-side child windows. Avoid transparent webviews over GPU surfaces.
4. **Use Taffy as a headless layout layer** for CSS flex, grid and block semantics shared across toolkits, but plan your own inline text layout. Pin the version, because 0.15 broke custom trees.
5. **Own a token and state-machine core in Rust.** Generate toolkit adapters from it. Start with egui and one more toolkit rather than all four.
6. **Treat versions as moving.** egui has a breaking release roughly every two to three months, Bevy every three to four months, and iced and Tauri 3 are not on a fixed schedule. Pin versions and budget migration time per release.

## 7. Sources
- egui 0.34, 0.35 and 0.36 release notes, the egui main CHANGELOG (0.37) and `crates/eframe/CHANGELOG.md`: github.com/emilk/egui
- iced 0.14 release and the 0.15 milestone, PR #1849: github.com/iced-rs/iced
- libcosmic Cargo.toml and issue #1098: github.com/pop-os/libcosmic
- Bevy 0.17, 0.18, 0.19 and 0.20 release posts, plus the 0.18 to 0.19 migration guide: bevy.org
- bevy_egui CHANGELOG and README: github.com/vladbat00/bevy_egui
- Tauri release pages, the Tauri 2.12 blog post and issue #14963: v2.tauri.app and github.com/tauri-apps/tauri
- `tauri-plugin-egui`, wry README, `airspace`: github.com/clearlysid, tauri-apps/wry, lukr54/airspace
- Taffy CHANGELOG and releases: github.com/DioxusLabs/taffy
- `iced_m3` and `material-iced` on docs.rs, `egui-material3`, `material-ui-rs`, `egui_kittest` on docs.rs
