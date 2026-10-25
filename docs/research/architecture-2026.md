# Bun UI architecture research, 2026-10-25

Scope: one Material Design 3 (M3) token, theme and component contract, with Rust as the source of truth (`aphrody-m3-tokens`, `aphrody-m3`), driving web/wasm, bevy_ui, egui, libcosmic/iced, GTK4 + libadwaita, Qt 6 (cxx-qt/QML), Win32/WinUI, plus a TSX/CSS converter and Wayland/Hyprland/Arch in wasm and on Win32.

## 0. Method and evidence quality

This report separates three evidence grades. Anything not marked [V] must be re-checked before it drives a decision.

- [V] Verified in this session by fetching the page or doc named in section 9.
- [K] From model background knowledge (cutoff June 2026), not re-fetched. Treat as a hypothesis.
- [U] Searched for and not found, or the fetched page did not answer. Treat as unknown.

Tooling limits that shaped the results: web search is US-only and weak on niche facts. Several GitHub and GitLab pages returned truncated or 404 content (libadwaita NEWS was behind a bot challenge; Hyprland wiki install page was 313k characters and only the first 100k were read). Context7 covered egui, gtk4-rs, cxx-qt and Bevy. The Qt docs MCP search returned only Qt Design Studio pages for the Material query. `git_ingest` was not used; the questions were answerable from READMEs, and the bun-ui rules say to keep large upstream clones on the VPS.

Local state observed [V] (C:\src\bun-os, read-only):

- `crates/aphrody-m3-tokens` 1.4.7, edition 2024, rust-version 1.97, Apache-2.0, `unsafe_code = "forbid"`. `no_std` + no-alloc by default-off `std` feature. Modules include `hct`, `cam16`, `dynamic`, `scheme/`, `quantize*`, `contrast`, `blend`, `elevation`, `motion`, `shape`, `state`, `typography`, `theme`, `role`, `component`, plus embedded fonts. Optional `image` and `serde` features.
- `crates/aphrody-m3` has `a11y`, `components`, `controls/`, `focus`, `forms`, `interaction`, `keyboard`, `layout`, `motion`, `paint`, `theme`, `visual`.
- `crates/libm3`, `crates/libm3-wasm`; JS packages `m3-tokens`, `m3-theme`, `m3-tailwind`, `m3-baseui`, `m3-react`, `m3-primitives`, `m3-os-themes` and others.
- `C:\src\bun-ui` currently holds only `AGENTS.md`, `README.md`, empty `apps/ crates/ packages/`, `tools/`, `upstream/`, `upstream.json`. Its AGENTS.md forbids a parallel palette or component model per host, requires upstreams as pinned submodules under `upstream/<group>/<name>`, and keeps Qt/GNOME/KDE/MSYS2 submodules off the workstation.

This matters for every recommendation below: HCT, dynamic color and the token model already exist in Rust and are `no_std`. The research question is therefore about emitters, adapters and the converter, not about building color science.

---

## 1. Design-token pipelines for multiple native toolkits

### 1.1 Format and tooling landscape

- **W3C DTCG format 2025.10**: first stable version, announced 2025-10-28 [V]. Supports Display P3, Oklch and all CSS Color 4 spaces, aliases, inheritance, component-level references, and theming/multi-brand without file duplication [V]. Reference implementations named by the announcement: Style Dictionary, Tokens Studio, Terrazzo [V]. Caveat: it is a Community Group Report, not a W3C Recommendation and not on the Standards Track [V, per DTCG FAQ via search]. Call it "stable community spec", not "W3C standard".
- **Style Dictionary v5**: uses DTCG 2025.10 as its base format per a zeroheight migration guide; ships web, iOS, Android, Compose and Flutter platform outputs [V, secondary source]. v4 introduced native DTCG, ESM config, async transforms, browser compatibility [V, secondary]. I could not confirm v5's custom-format and custom-platform API from primary docs [U]; the 5.5.0 README imports `formats, transformGroups` from `style-dictionary/enums` [V].
- **Tokens Studio**: reads and writes DTCG; has a conversion guide [V, listing only].
- **Material Theme Builder / material-color-utilities**: official libraries exist in C++, Dart, Java, Swift, Kotlin, TypeScript; Rust ports are community [V].

### 1.2 Why Style Dictionary should not be the compiler

M3 colors are not static tokens. A scheme is a function: source color + variant + contrast level + brightness gives roughly 45 roles via HCT tonal palettes. Style Dictionary transforms individual token values; it cannot run HCT solving. So the Rust crate must compute resolved values, and any DTCG file is a build artifact, not the authoring surface.

Recommended pipeline:

```
 seed + variant + contrast + brightness (config.toml / JSON)
        |
 aphrody-m3-tokens (Rust)  -- HCT, DynamicScheme, shape, motion, type, elevation, state
        |
 ResolvedTheme  (all roles resolved to sRGB u8 + oklch f32; light, dark, +contrast variants)
        |
 aphrody-m3-emit (new crate, std-only)  --> one emitter module per target
        |
   +----+-----+----------+--------+-----------+----------+---------+----------+
  DTCG  CSS   GTK CSS   QML      egui        bevy       cosmic    WinUI XAML
 2025.10 vars  +libadw  +QPalette Visuals     consts     theme     ResourceDict
```

- Emit **DTCG 2025.10** as the interchange artifact (color tokens with `$type: color`, `colorSpace`/components or hex; dimension, duration, cubicBezier, typography composites; aliases for semantic-to-reference). Let Figma, Tokens Studio and Style Dictionary consumers (Android, iOS, Flutter) read it. This keeps the door open for non-Rust consumers without making them the source.
- Keep a thin Bun script (`tools/emit-dtcg.ts`) only if JS-side DTCG validation is wanted; do not call Style Dictionary from the Rust path, and per AGENTS.md of bun-os do not route quality commands through external backends.
- Add a **conformance test corpus**: for N seeds x variants x contrast levels, compare `aphrody-m3-tokens` output against `material-colors` (Rust port, 0.5.0, MIT OR Apache-2.0, `no_std`, ThemeBuilder, DynamicColor, quantize and serde features [V]) and the official TypeScript library. Use them as oracles, not dependencies. (The tests rule in bun-ui AGENTS.md means this is proposed work to run only on owner request.)

### 1.3 Per-target emitters

**CSS custom properties (web, material-web, Base UI, Tailwind).** Emit the `--md-sys-color-*`, `--md-sys-typescale-*`, `--md-sys-shape-*`, `--md-sys-motion-*`, `--md-sys-elevation-*` contract that the existing `pixel-perfect-aphrody` skill audits. Emit both sRGB hex and an `oklch()` form behind `@supports`. Use `color-scheme` plus `light-dark()` for dual schemes [K]. State layers as `color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)` [K]. Tailwind v4: map to `@theme` variables in `m3-tailwind` (already exists).

**GTK4 + libadwaita.**
- libadwaita exposes named colors, redefinable with `@define-color` (documented in the 1.3 named-colors page: `accent_color`, `accent_bg_color`, `accent_fg_color`, and others) [V]. From 1.6 there is `AdwAccentColor` with nine values (blue #3584e4 default, teal, green, yellow, orange, red, pink, purple, slate) and CSS variables such as `--accent-bg-color`, `--accent-color`, `--accent-fg-color` that apps may override, e.g. `:root { --accent-bg-color: var(--accent-green); }` [V]. Overriding in CSS does not change what `AdwStyleManager` reports; the API still returns the system accent [V]. If the override is too light, set a dark `--accent-fg-color` [V].
- Mapping plan (M3 role -> libadwaita name): primary -> `accent_bg_color`, on_primary -> `accent_fg_color`, surface -> `window_bg_color`, on_surface -> `window_fg_color`, surface_container_lowest/low -> `view_bg_color`, surface_container -> `card_bg_color`, surface_container_high -> `headerbar_bg_color`/`popover_bg_color`, error -> `destructive_bg_color`, tertiary/secondary have no libadwaita counterpart and become app-level classes (`.m3-tertiary`) [K for the less common names; confirm against the libadwaita named-colors page for the targeted version].
- Emit three files: `m3-gtk-light.css`, `m3-gtk-dark.css` (named colors + variable form for >=1.6), and `m3-gtk-components.css` (shapes via `border-radius`, state layers via `alpha()` / `color-mix`, elevation via box-shadow). Load with `CssProvider` at application priority on the display; switch provider on `adw::StyleManager` color-scheme change [K; the gtk4-rs book CSS chapter covers loading a `style.css` at startup [V]].
- Respect the platform: the accent should default to the system accent (`AdwStyleManager`) unless the app sets `m3.accent = "brand"`. Make that a per-host policy in the contract (see 4.5).
- GTK 4.20 / libadwaita 1.8 are the floor used by the closest prior art (GTKX) [V]. I could not retrieve libadwaita 1.8/1.9 release notes [U]; re-check for dark/high-contrast changes.

**Qt 6 / QML.**
- Generate a QML singleton `M3Tokens` (`pragma Singleton`) with `readonly property color` per role, plus `M3Theme` with `dark`, `contrast`, `seed`. In Rust use cxx-qt: `#[qml_singleton]` and `#[qproperty]` generate getters, setters and NOTIFY signals, so the singleton can be live, recomputed in Rust when the seed or scheme changes [V, cxx-qt book].
- Fill a `QPalette` (Window, WindowText, Base, AlternateBase, Text, Button, ButtonText, Highlight, HighlightedText, ToolTipBase, Link, PlaceholderText, Disabled group) for QtWidgets or for Qt Quick Controls styles that read the palette. libcosmic's own tests already snapshot "kcolorscheme and qpalette" output [V, mirror commit dated 2026-04-01], which is a model for golden tests.
- **Qt Quick Controls Material style and M3 status.** Qt's blog and docs say the Material style moved to Material 3 in Qt 6.5 [V]. New attached properties: `Material.roundedScale` and `Material.containerStyle` (Filled/Outlined, TextField and TextArea only), both since 6.5 [V]. `qtquickcontrols2.conf` / env vars only configure Theme, Variant, Accent, Primary, Foreground, Background; `roundedScale` and `containerStyle` must be set in QML [V]. Accent and Primary are meant to be predefined names (Pink, Indigo defaults) [V]. I found no Qt 6.10 or 6.11 Material change notes [U].
- Consequence: the stock Material style cannot express the full M3 role set (tertiary, surface containers, state-layer opacities) and is not themable from an arbitrary seed. Two options: (a) set arbitrary `Material.accent/primary/background/foreground` colors on the root and accept an approximation; (b) ship a custom Qt Quick Controls style (`QtQuick.Templates`-based, "Aphrody M3") that binds directly to `M3Tokens`. Recommend (b) for Qt as a Tier A host and (a) only as a bootstrap.
- Qt docs MCP (framework docs 6.12, 6.11, 6.8 LTS) is available to verify API details when implementing; the Material query returned only Design Studio pages, so query by exact class instead.

**egui.** `Style` has `text_styles`, `spacing`, `visuals`; `Visuals` has `dark_mode`, `widgets` (five `WidgetVisuals`: noninteractive, inactive, hovered, active, open, each with `bg_fill`, `weak_bg_fill`, `bg_stroke`, `corner_radius`, `fg_stroke`, `expansion`), `selection`, `hyperlink_color`, `faint_bg_color`, `extreme_bg_color`, `code_bg_color`, `warn_fg_color`, `error_fg_color`, `window_fill`, `window_stroke`, `window_shadow`, `panel_fill`, `popup_shadow`, `window_corner_radius`, `menu_corner_radius`, `disabled_alpha` [V]. `Context::set_theme(ThemePreference::{Dark,Light,System})` exists [V]. Mapping: panel_fill = surface; window_fill = surface_container; faint_bg_color = surface_container_low; extreme_bg_color = surface_container_lowest; selection.bg_fill = primary_container; hyperlink = primary; error_fg_color = error; widgets.hovered/active = base fill blended with on-surface at 8%/10%; corner_radius from shape scale. Note egui's repo now has a **styling_engine** example with `StyleProvider<ButtonStyle>` and classes (`has_class`) [V]; if this lands in a release, per-widget style providers are a better target than mutating global `Visuals`. Track it.

**bevy_ui.** Latest GitHub release at fetch time: v0.20.0 (marked Latest) [V]; Context7 indexes v0.18.1, which has Cargo features `experimental_bevy_feathers` ("Feathers widget collection") and `experimental_bevy_ui_widgets` ("Experimental headless widget collection for Bevy UI"), plus `bevy_input_focus`, `ui_picking`, `bevy_ui_render` and a `ui_material` example for custom UI materials [V]. No M3 theming crate for bevy_ui was found [U]. Plan: emit a `M3Theme` resource with `bevy_color::Srgba` constants per role and spacing/shape/type scales; build the M3 skin on `bevy_ui_widgets` (headless behavior) plus `UiMaterial` for state layers and elevation shadows. Re-evaluate against Feathers when it leaves experimental (0.18 feature flags are still experimental).

**libcosmic / COSMIC.** The `cosmic-theme` crate lives inside libcosmic (moved from the iced fork) and libcosmic bundles `cosmic-config`, `cosmic-config-derive`, the `pop-os/iced` submodule; MPL-2.0 [V]. COSMIC themes are serialized through cosmic-config; the files are RON [K, could not confirm in this session]. cosmic-theme derives container layers from background/primary/secondary components, accent and palette; mapping M3's 5 surface-container tones to COSMIC's layering is lossy but workable: background = surface, primary container = surface_container, secondary container = surface_container_high, accent = primary. Emit either RON theme files for `cosmic-settings` import or construct `cosmic::Theme` programmatically via `ThemeBuilder` [K]. libcosmic features: `wayland` and `winit` backends (mutually exclusive), `wgpu` (softbuffer default), `a11y` experimental, `xdg-portal`, `tokio`/`smol` [V]. COSMIC is explicitly a platform toolkit "for the COSMIC desktop" [V]; treat it as Linux-only, Tier B (native-integrated).

**WinUI.** Emit a `ResourceDictionary` XAML with `Color` and `SolidColorBrush` keys under both `Light` and `Dark` `ThemeDictionaries` [K], overriding WinUI/Fluent keys (for example `AccentFillColorDefaultBrush`, `ControlFillColorDefaultBrush`, `CardBackgroundFillColorDefaultBrush`) and adding `M3.*` keys for the roles Fluent lacks. Fluent control templates differ in geometry and state visuals from M3, so true M3 appearance on WinUI means re-templating controls. Recommended for Win32/WinUI: Tier A by drawing with wgpu/Vello inside an HWND, and use WinUI resources only for the "Fluent-integrated" flavor. The existing repo skills `bun:win32` (`bun:winui`, `bun winmd`) are the integration point.

### 1.4 Output matrix

| Target | Artifact | Live reload | Notes |
|---|---|---|---|
| Interchange | DTCG 2025.10 JSON | no | for Figma/Tokens Studio/Style Dictionary consumers |
| Web | CSS custom properties, Tailwind `@theme` | yes (class swap) | extends `m3-tailwind` |
| GTK/libadwaita | `@define-color` + `--accent-*` CSS | yes (swap provider) | system accent policy |
| Qt/QML | `M3Tokens` singleton (cxx-qt), `QPalette` | yes (NOTIFY signals) | custom Controls style |
| egui | `Visuals` + `Style` fn, later StyleProvider | yes (`set_style`) | |
| bevy_ui | `M3Theme` resource | yes (resource change) | headless widgets |
| libcosmic | `cosmic::Theme`/RON | yes via cosmic-config | lossy surface mapping |
| WinUI | `ResourceDictionary` XAML | restart or theme swap | Fluent vs M3 geometry |

---

## 2. Existing M3 implementations per toolkit

| Toolkit | Candidate | Evidence | License | Maturity | Verdict |
|---|---|---|---|---|---|
| Web | `@material/web` (material-web) | in repo skills and `m3-*` packages [K on its maintenance-mode status] | Apache-2.0 [K] | stable but reported low-activity [K] | keep as visual reference and conformance target, not a dependency for non-web |
| Web | Base UI | headless React components, used by `m3-baseui` | MIT [K] | check whether v1 stable [U] | keep for web behavior |
| Rust color | `material-colors` 0.5.0 | no_std, ThemeBuilder, DynamicColor, quantize, serde [V] | MIT OR Apache-2.0 [V] | active (docs.rs shows 2026-10-01) [V]; MSRV listed 1.97 [V] | use as test oracle only; own crate already richer |
| Rust color | `mcu-material-color`, `material-color-rs` (has an `iced` feature) | docs.rs descriptions [V] | not checked | unknown | ignore, except as extra oracles |
| Rust color | `hct-cam16` | HCT conversion [V] | not checked | small | ignore |
| egui | `egui-material3` | MD3 components: Button, IconButton, Checkbox, Switch, Radio, Slider, Select, Chip, Tabs, Drawer, TopAppBar, Dialog, Snackbar, Badge, Progress, Tooltip, DataTable, Carousel, Fab, icons; loads theme JSON at runtime; 171 commits, 33 stars, no GitHub releases; v0.0.9 on crates.io [V] | Apache-2.0 OR MIT [V] | pre-1.0, single maintainer, egui version not confirmed | reference/inspiration; reimplement components against our contract instead of depending on it (dependency would fork the palette model, which AGENTS.md forbids) |
| iced / libcosmic | none found for M3 on iced [U]; libcosmic implements COSMIC design, not M3 [V] | n/a | MPL-2.0 [V] | libcosmic active (2026 commits) [V] | adapter: M3 tokens -> cosmic Theme; do not port M3 widgets |
| bevy_ui | none [U]; `bevy_feathers` and `bevy_ui_widgets` experimental [V] | | Bevy MIT OR Apache-2.0 [K] | experimental | build M3 skin on headless widgets |
| GTK | no maintained "M3 GTK theme" found [U] | libadwaita is the platform design | LGPL-2.1+ [K] | | adapter via named colors, not a theme fork |
| Qt | Qt Quick Controls Material (M3 since 6.5) [V] | | Qt licensing (LGPL/GPL/commercial) [K] | mature, partial M3 | custom style on top of Templates; Material style as fallback |
| Cross-toolkit | Slint (has `ui-libraries/material`; renderers femtovg/Skia/software; Slint-to-Rust codegen; Figma plugin) [V] | | royalty-free / GPLv3 / commercial [V] | stable 1.x API [V] | study its DSL and compiler for the IR; do not adopt (license and second component model) |
| "Flutter-like" | Flutter/Compose Multiplatform own their renderer; Skia/Impeller | [K] | | | the design our Tier A hosts follow (own renderer + own widgets) |

**Reuse vs build:** build the M3 skin once per renderer family, not once per toolkit. There are only two families:

- **Tier A (we draw):** web (CSS), wgpu/Vello canvas used by Win32, wasm, bevy and an optional Blitz host; egui and iced hosts draw with their own painters but our tokens and state machines. Pixel-perfect M3 is achievable.
- **Tier B (platform draws):** GTK4/libadwaita, COSMIC/libcosmic, WinUI. Tokens re-theme native widgets; behavior and geometry follow the platform. Pixel-perfect M3 is a non-goal; role/color/shape/state-layer fidelity is the goal. Qt can be either; choose A.

---

## 3. Converters: TSX/JSX/CSS to GTK, QML and egui

### 3.1 Prior art

- **GTKX** (`@gtkx/react`): React 19 components render as native GTK4/Adwaita widgets through a native addon (Rust required to build from source); CLI generates `@gtkx/jsx` elements and `@gtkx/gi` bindings from configured native libraries; `AdwApplicationWindow`, `AdwHeaderBar`, `AdwToolbarView`; MPL-2.0; GTKX 2.0 in beta with stable planned 2026-12-01; requires Node 26.7+, GTK 4.20+, libadwaita 1.8+; 490 stars [V]. Directly relevant: it proves "React reconciler onto GTK widgets" with generated per-widget JSX types. It is a runtime reconciler (needs Node), not an ahead-of-time converter.
- **react-native-gtk4**: React renderer using node-gtk, MPL-2.0, 2.2.0 [V via search snippet].
- **GSolid**: solid-js renderer for GTK4, runs in Gjs, commits dated June 2026 [V via search snippet].
- **Slint**: own DSL, ahead-of-time compiler with a Rust generator and an interpreter; three renderers; Figma-to-Slint plugin [V]. The best model for "compile a declarative tree + styles to native code".
- **Blitz / Dioxus Native**: beta HTML/CSS renderer composed of Stylo (CSS parse/resolve), Taffy (box layout), Parley (text), Vello via AnyRender (paint), winit, AccessKit, muda; crates `blitz-dom`, `blitz-html`, `blitz-paint`, `blitz-net`, `blitz-shell`, `dioxus-native`; Apache-2.0 OR MIT, `stylo_taffy` also MPL-2.0; ~4.3k stars; "still many bugs and missing features"; CSS status at blitz.is/status/css [V].
- **Blueprint** (blueprint-compiler), **GtkBuilder XML**, **relm4 `view!`**: relm4 0.10.0 has a `view!` macro and GNOME SDK feature flags `gnome_45` to `gnome_48`, MSRV 1.85 [V via search]. Fedora packages the `libadwaita` Rust crate 0.9.x with a `gtk_v4_20` feature [V via search]. Blueprint itself could not be confirmed in this session [U].
- **Lightning CSS**: MPL-2.0, Rust library or JS, visitor API for custom transforms, nesting lowering, `lab/lch/oklab/oklch`, `color-mix()`, relative color syntax [V].
- **Stylo/Taffy/Parley**: building blocks inside Blitz [V].

### 3.2 What not to build

A general React-to-GTK converter is a trap: React's semantics (arbitrary DOM, hooks, CSS cascade, `position:absolute`, `display:*`, pseudo-elements) have no faithful GTK image, and GTKX already covers the runtime route. Scope the converter to a **constrained subset**: JSX whose elements are the contract components and a closed set of layout primitives.

### 3.3 Proposed architecture ("m3c")

```
 TSX source ──► oxc_parser (+ oxc_semantic)  ──┐
 CSS / Tailwind classes ──► lightningcss (parse, nesting, color, custom props, visitor) ──┤
 token refs (var(--md-sys-*), m3 theme) ───────────────────────────────────────────────────┤
                                                                                           ▼
                                           Lowering: JSX subset → UI IR  (+ style resolution, token binding)
                                                                                           │
                                  IR passes: validate, a11y roles, layout normalize (flex/grid subset → Taffy style),
                                             state/binding extraction, i18n, unsupported-construct report
                                                                                           ▼
   ┌───────────────┬──────────────────┬───────────────┬──────────────┬──────────────┬──────────────┐
   GtkBuilder XML   Blueprint (.blp)    QML            egui Rust      relm4 view!    web (identity)
   + gtk CSS        optional            + M3Tokens     fn + State     optional       re-emit TSX
```

- **Parsing:** `oxc` (Rust; the parser is stable and fast; the native Bun quality tooling is already OXC-based) for TSX. Reject unsupported syntax (arbitrary hooks, dynamic component types) with a precise diagnostic. Allow a closed hook set: `useState`/`signal` mapped to IR `State`, event handlers named as `Action`s.
- **CSS:** Lightning CSS first (cheap, Rust, visitor API, lowers nesting and modern color). If cascade/specificity fidelity beyond a flat class system is required, escalate to Stylo (what Blitz uses) at much higher integration cost. Prefer a rule: styles are token-bound (`color: var(--md-sys-color-primary)`), not arbitrary values; arbitrary values pass through with a warning.
- **IR:** a tree of `Node { kind: ContractComponent | Layout | Text | Slot, props, style: ResolvedStyle, a11y: Role+Name, bindings, children }`. Component kinds are exactly those of `aphrody-m3` (Button, IconButton, Fab, Card, TextField, Switch, Checkbox, Radio, Slider, Tabs, NavigationBar/Rail/Drawer, TopAppBar, Dialog, Menu, Snackbar, List, Chip...). `ResolvedStyle` is the Taffy-compatible subset (flex, grid, block, gap, padding, margin, size/min/max, aspect-ratio, overflow, position relative/absolute) plus token references, never raw hosts' CSS.
- **Codegen per backend:**
  - *GTK:* emit **GtkBuilder XML** as the primary artifact (stable, consumed by gtk4-rs `#[template]`/CompositeTemplate [K], no extra compiler), Blueprint as a pretty-print option. Component mapping examples [K]: Button -> `GtkButton` (`suggested-action`/`flat`/`pill` classes per variant), TopAppBar -> `AdwHeaderBar` in `AdwToolbarView`, Card -> `GtkBox` + `.card`, Dialog -> `AdwAlertDialog`/`AdwDialog`, Snackbar -> `AdwToast`, Tabs -> `AdwViewSwitcher`/`AdwTabBar`, NavigationRail/Drawer -> `AdwNavigationSplitView`/`AdwOverlaySplitView`, TextField -> `AdwEntryRow`/`GtkEntry`, Switch -> `GtkSwitch`, Slider -> `GtkScale`. Layout: flex row/column -> `GtkBox`, grid -> `GtkGrid`, centered bar -> `GtkCenterBox`, max-width -> `AdwClamp`, absolute -> `GtkOverlay`/`GtkFixed`. Styles -> a generated CSS file reusing section 1.3 names. Events -> `GAction`s. A relm4 `view!` emitter is a cheap second output since relm4's macro is declarative.
  - *QML:* nearly 1:1 (declarative tree, anchors/Layouts, bindings). Emit QML + `M3Tokens` references; business logic through cxx-qt QObjects. Lowest-risk backend; build it first.
  - *egui:* immediate-mode needs a generated `struct State` plus `fn ui(&mut self, ui)`; flex via `ui.horizontal/vertical` or a Taffy-in-egui helper [K]. Treat as best-effort; do not promise CSS parity.
  - *Web:* identity (re-emit TSX/CSS); the same IR doubles as the validator that proves the TSX stays within the contract.
- **Fail closed:** the converter emits a machine-readable report (`unsupported: position:sticky, backdrop-filter, ::before ...`) and exits non-zero in strict mode. Layout drift tests compare Taffy-computed rects of the IR against the DOM rects of the web rendering for the same tree (tolerance-based); this is how fidelity is measured per backend.
- **Alternative that avoids conversion for Tier A:** host the original HTML/CSS with **Blitz** (Stylo + Taffy + Parley + Vello). Pros: web-fidelity everywhere wgpu runs (Win32, Linux, wasm via WebGPU). Cons: beta, "many bugs and missing features" [V], no native platform feel. Use as an experimental `bun-ui-blitz` host and a reference for CSS support, not as the primary route.

---

## 4. Cross-toolkit component contract design

### 4.1 Principles (2026 consensus, mostly [K])

1. **Three layers:** (1) tokens (data), (2) headless behavior (state machine + a11y semantics + keyboard map), (3) skin (renderer-specific drawing). Only layer 3 is per-host. Layers 1 and 2 are shared as Rust compiled everywhere.
2. **Headless behavior as explicit state machines:** Zag.js [K], Base UI [K], and Bevy's `bevy_ui_widgets` ("headless widget collection") [V] converge on this. Author machines in Rust in `aphrody-m3` (`controls/`, `interaction`, `focus`, `keyboard`, `a11y` already exist). Compile to wasm via `libm3-wasm` for JS hosts that want identical behavior; web keeps Base UI where idiomatic but is held to the same traces.
3. **Trace-based conformance:** record golden event traces (pointer/keyboard/focus events in, state + a11y tree + token state-layer out) as JSON. Run them against: the Rust machine, the Base UI binding, each native host's wrapper. This replaces per-host unit tests and is the only way to keep 8 hosts consistent. (Only run when the owner requests tests, per AGENTS.md.)
4. **Accessibility via one tree:** AccessKit is the shared a11y tree in Rust (used by egui via `accesskit_node_builder`, `labelled_by`, `accessible_name` [V]; by Blitz via blitz-shell [V]; libcosmic `a11y` feature, experimental [V]). Native toolkits (GTK/Qt/WinUI) already expose a11y, so the contract needs only role, name, state and relation fields, mapped to ARIA-like roles. Define them in the IR once.
5. **Layout:** Taffy (flexbox, grid, block) for every host that does its own layout (Tier A, Blitz, egui helpers, bevy_ui which already uses Taffy [K]). Tier B hosts use native layout; the IR carries constraints, not pixels.
6. **Text:** cosmic-text (used by bevy_text, iced, libcosmic [K]) and Parley (Blitz, Vello ecosystem [V]) are the two Rust options; pick one per renderer family, expose the same `TextStyle` from the typography tokens. For Tier B native text engines are used and variable fonts (Google Sans Flex is already embedded in the tokens crate) loaded where possible.
7. **Rendering:** wgpu + Vello for the canvas host (wasm WebGPU, Win32, Linux). Bevy has its own renderer; egui/iced use theirs. Do not unify renderers; unify the display list inputs (tokens + IR).
8. **Platform adaptation is a policy, not a fork:** each host declares a `HostProfile { tier, accent_source: System|Brand, density, reduced_motion, scale, window_controls, dark_mode_source }`. The same IR and tokens, different profile.

### 4.2 Contract surface (suggested)

```
aphrody-m3-tokens   : roles, scheme(seed, variant, contrast), shape, type, motion, elevation, state layers   (exists)
aphrody-m3          : ComponentSpec { kind, props schema, states, parts/slots, a11y role, key map }          (extends existing)
aphrody-m3-machine  : headless machines (button, toggle, text field, tabs, menu, dialog, slider, list)        (new, from controls/)
aphrody-m3-ir       : UI IR + passes + serialization (JSON/CBOR)                                              (new)
aphrody-m3-emit     : token emitters (DTCG, CSS, GTK, QML/QPalette, egui, bevy, cosmic, WinUI)               (new)
aphrody-m3-c        : TSX/CSS -> IR frontend + backends (GtkBuilder, QML, egui, relm4)                        (new, tools/)
hosts/              : web, gtk, qt, egui, bevy, cosmic, win32-wgpu, winui                                     (adapters)
```

### 4.3 Per-host implementation shape

- **Web:** CSS vars + `m3-baseui` / material-web; wasm machines optional.
- **GTK:** gtk4-rs + libadwaita-rs, skin via CSS and style classes; custom `GtkWidget` subclasses only for components with no native equivalent (e.g., FAB, Chip, Segmented Button).
- **Qt:** cxx-qt singleton + custom Controls style; `QQuickStyle::setStyle("AphrodyM3")`.
- **egui/bevy/iced:** thin skin crates over the headless machines.
- **Win32:** wgpu/Vello HWND host with winit [K]; optional WinUI resource-theme flavor.

### 4.4 Risks

- Tier B fidelity expectations: be explicit that libadwaita will never look like M3.
- Two behavior implementations (Base UI on web, Rust machines elsewhere) can drift; traces mitigate this.
- cxx-qt: README states "early development, API changes frequently"; versions seen in the wild: 0.7 (Oct 2024), 0.8 in third-party setup docs [V via search]. Pin versions.
- Blitz and Feathers are both experimental; keep them behind feature flags.

---

## 5. Wayland / Hyprland / Arch in WebAssembly and on Win32

### 5.1 Facts

- **Hyprland** is C++ (repo tagged cpp26), "100% independent, no wlroots, no libweston, no kwin, no mutter" [V]. Its backend is **Aquamarine**: "a very light linux rendering backend library", with a native DRM session and a nested Wayland session; C++ only, CMake, relies on compiler stdlib ABI stability [V]. Therefore: Linux only in practice, requires DRM/KMS/GBM/libinput/udev for bare metal. The nested Wayland backend lets Hyprland run as a window inside another compositor [V]. No Windows, no wasm path exists [U]. The wiki page "Running In a VM" exists [V] but its content was not read.
- **Smithay** (Rust compositor toolkit) lists libwayland, libxkbcommon, libudev, libinput, libgbm, libseat, xwayland as system deps in the reference compositor, with backends `--x11`, `--winit`, `--tty-udev` [V]. A winit backend means Smithay-based compositors can run as a window on any OS winit supports for output, but client transport (Unix sockets, fd passing) remains the blocker on Windows.
- **container2wasm** (Apache-2.0, CNCF Sandbox since 2025-01-21 [V]): converts a container image to WASM by emulating a CPU (Bochs x86_64, TinyEMU riscv64, QEMU via `--to-js`) in WASM and booting a Linux kernel; runs on WASI runtimes and in browsers (xterm-pty + browser_wasi_shim, or Emscripten QEMU-Wasm); experimental; x86_64 or riscv64 recommended; browser networking via Fetch/WebSocket, CORS-limited, tested only on Chrome [V]. The README does not mention GUI/X11/Wayland [V]; GUI use is a DIY layer.
- **v86** (BSD-2-Clause): x86 emulator JIT-ing to WebAssembly; supports Linux, Windows 1.x to 2000, ReactOS, Haiku, KolibriOS, FreeBSD, OpenBSD, SerenityOS (32-bit) and others; **64-bit kernels are not supported**; Alpine and **32-bit Arch Linux** work with a build guide in `docs/archlinux.md`; display is emulated VGA/SVGA/Bochs VBE; no host-GPU access; no Wayland notes [V].
- **WSLg architecture:** Weston with an RDP backend as the Wayland compositor inside a system distro; Microsoft extended it with RAIL (remote app windows) and VAIL (VM boundary); FreeRDP is the protocol library; `mstsc`-style client on Windows; WSLg adds no new/private Wayland protocols, so clients see a standard compositor; Microsoft said at the time that any Wayland compositor could in theory add the mode [V].
- **Wayland on Windows via MSYS2/native:** I found no packages or projects [U]. A repository (waylovely) surfaced in search but its README was a 404 [U]. Technical blockers [K]: libwayland relies on Linux semantics: `epoll`, `signalfd`, `timerfd`, `memfd`, Unix domain sockets with `SCM_RIGHTS` fd passing (needed for `wl_shm` and dmabuf buffers). Windows AF_UNIX exists but has no fd passing. A port would need a shim that replaces fd passing with shared-memory section handles, effectively a new transport. No upstream effort found [U].

### 5.2 Feasibility matrix

| Goal | Verdict | Path |
|---|---|---|
| Hyprland inside a browser tab, full fidelity | not feasible today | needs 64-bit Linux + GL; v86 is 32-bit only [V]; container2wasm emulates slowly and has no GPU |
| A Wayland desktop session visible in a browser | feasible, slow | c2w (Bochs x86_64 or TinyEMU riscv64) with a light compositor (weston headless / cage / labwc) + VNC/RDP -> canvas; software rendering (llvmpipe); budget tens of seconds boot [K on timings] |
| Arch Linux in browser | partial | v86 with 32-bit Arch [V] (archlinux32 is a separate project and ends i686 support upstream [K]); or c2w with an Arch x86_64/riscv64 rootfs image (riscv64 Arch is not official [K]; Alpine is safer) |
| Hyprland on Win32 natively | not feasible | Aquamarine needs DRM/GBM/libinput; hundreds of Linux-isms |
| Wayland apps shown on Windows | feasible today | WSLg (Weston RDP RAIL) [V]; or Weston RDP backend in a remote/VM Linux and an RDP client on Windows |
| MSYS2 role | build toolchain and runtime libs for GTK4/Qt hosts on Win32 [K, verify packages] | not a Wayland host |
| Own shell/compositor in browser + Win32 | feasible as greenfield | write a "Bun shell" in Rust with M3 UI, windows as app surfaces (wgpu), Wayland client compatibility only on Linux |

### 5.3 Recommendation

1. Treat Hyprland as a **Linux-only integration target**: ship an Arch-based image where Hyprland consumes the same M3 theme (generate `hyprland.conf` colors and a `hyprlock/waybar` theme from the token emitters; GTK/Qt/COSMIC adapters from section 1 cover the apps). This is cheap and visibly "one theme everywhere".
2. For the browser demo, run **a C2W Alpine/Arch (x86_64 or riscv64) image with a lightweight compositor + VNC**, not Hyprland; or ship a **wasm-native compositor-shaped shell** (your own, using Taffy + Vello + the M3 machines) where "windows" are in-process wasm apps. That second option is the real product path: no emulation, GPU accelerated via WebGPU, and the same code compiles to Win32.
3. For Win32, **do not attempt a native Wayland stack**. Use WSLg/Weston-RDP for real Wayland apps, and the Rust shell for M3-native windows. MSYS2 (ucrt64/clang64) is used to build the GTK4/Qt host binaries; per bun-ui AGENTS.md, do that on the VPS, never initialize MSYS2 submodules on the workstation, and do not start WSL there.
4. If Hyprland-in-browser is a hard requirement: a 64-bit emulator with virtio-gpu is needed (outside current v86/c2w capability [V]); consider streaming a real Linux session (RDP/WebRTC) from the VPS into the page, which is not "in WebAssembly" but delivers the experience.

---

## 6. Proposed phased roadmap

1. **Phase 0 (contract freeze):** write the `ResolvedTheme` struct and a JSON schema; DTCG 2025.10 emitter and CSS emitter; oracle-test against `material-colors` and the TS library (when owner enables tests).
2. **Phase 1 (cheap hosts):** GTK/libadwaita emitter + loader crate; egui `Visuals` emitter; QML singleton via cxx-qt; QPalette fill. Demo: one seed, three windows.
3. **Phase 2 (IR + m3c):** oxc + Lightning CSS frontend, IR, QML backend first, GtkBuilder XML second; strict-mode report.
4. **Phase 3 (behavior):** headless machines in Rust, trace format, web binding vs Base UI parity.
5. **Phase 4 (Tier A canvas):** wgpu/Vello host for wasm + Win32; bevy skin on `bevy_ui_widgets`.
6. **Phase 5 (shell):** wasm-native shell demo; Hyprland theme generator; c2w demo image.

## 7. Repo mapping (bun-ui)

- `crates/aphrody-m3-tokens`, `crates/aphrody-m3` (submodules per AGENTS.md); new first-party: `crates/aphrody-m3-ir`, `-emit`, `-machine`, `-c`; adapters `crates/aphrody-m3-gtk`, `-qt` (cxx-qt), `-egui`, `-bevy`, `-cosmic`, `-winui`.
- `upstream/<group>/<name>` pins (VPS only for Qt/GNOME/KDE/MSYS2): gtk4-rs, libadwaita, cxx-qt, egui, bevy, libcosmic, blitz, taffy, parley, vello, lightningcss, oxc, material-web, base-ui. Record patches outside upstream trees.
- Record license obligations: libcosmic MPL-2.0 [V], Lightning CSS MPL-2.0 [V], GTKX MPL-2.0 [V], Slint three-way [V], v86 BSD-2 [V], container2wasm Apache-2.0 plus third-party GPL content in images [V], Blitz Apache/MIT with MPL-2.0 on `stylo_taffy` [V]. MPL-2.0 is file-level copyleft: fine to depend on, keep modifications to those files open.

## 8. Open questions for the owner

- Is Qt a Tier A host (own style) or Tier B (stock Material)? Recommendation: A.
- Win32 target: pure wgpu canvas, WinUI resources, or both?
- Is "Hyprland in browser" a demo (acceptable: emulated Alpine + light compositor) or a requirement (needs streaming)?
- Where do Win32/MSYS2 builds run given the "VPS only, no WSL on workstation" rule (a Windows VPS lane, or cross-compile with mingw-w64 from Linux)?
- May tests (conformance traces, oracle comparison) be added? AGENTS.md says only on request.

## 9. Sources

Verified (fetched or returned by search tooling this session)

- DTCG stable release post: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- DTCG site and FAQ: https://www.designtokens.org/ , https://www.designtokens.org/faq/ , repo https://github.com/design-tokens/community-group
- Style Dictionary 5.x README: https://unpkg.com/style-dictionary@5.5.0/README.md ; zeroheight migration note: https://help.zeroheight.com/hc/en-us/articles/48049028236187 ; Tokens Studio DTCG: https://docs.tokens.studio/convert-to-dtcg-format
- libadwaita styles and appearance: https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/styles-and-appearance.html ; named colors: https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1.3/named-colors.html ; AccentColor enum: https://libadwaita.geopjr.dev/docs/Adw/AccentColor.html ; accent MR: https://gitlab.gnome.org/GNOME/libadwaita/-/merge_requests/824
- gtk4-rs book (CSS): https://github.com/gtk-rs/gtk4-rs/blob/main/book/src/css.md ; relm4 macros: https://docs.rs/relm4-macros ; Fedora libadwaita crate: https://packages.fedoraproject.org/pkgs/rust-libadwaita/
- Qt blog on Material 3: https://www.qt.io/blog/material-3-changes-in-qt-quick-controls ; Material style doc: https://doc.qt.io/qt-6/qtquickcontrols-material.html
- cxx-qt: https://github.com/KDAB/cxx-qt , book https://github.com/kdab/cxx-qt/blob/main/book/src/bridge/extern_rustqt.md , KDAB 0.7/0.6 posts https://www.kdab.com/cxx-qt-0-6/
- egui style source: https://github.com/emilk/egui/blob/main/crates/egui/src/style.rs ; context: https://github.com/emilk/egui/blob/main/crates/egui/src/context.rs ; styling example: https://github.com/emilk/egui/blob/main/examples/styling_engine/src/main.rs
- egui-material3: https://github.com/nikescar/egui-material3 , https://crates.io/crates/egui-material3
- material-colors: https://docs.rs/material-colors ; material-color-rs: https://docs.rs/material-color-rs ; mcu-material-color: https://docs.rs/mcu-material-color ; hct-cam16: https://rust-digger.code-maven.com/crates/hct-cam16
- Bevy releases: https://github.com/bevyengine/bevy/releases ; Bevy 0.18.1 features and examples (Context7 /bevyengine/bevy/v0.18.1): https://github.com/bevyengine/bevy/blob/v0.18.1/docs/cargo_features.md
- libcosmic: https://github.com/pop-os/libcosmic ; mirror with 2026-04-01 snapshot tests: https://git.tfcconnection.org/chris/libcosmic
- Blitz: https://github.com/DioxusLabs/blitz
- Slint: https://github.com/slint-ui/slint
- Lightning CSS: https://github.com/parcel-bundler/lightningcss
- GTKX: https://github.com/eugeniodepalo/gtkx ; react-native-gtk4: https://npmjs.com/package/react-native-gtk4 ; GSolid: https://zff.dev/rubicon/gsolid
- Hyprland: https://github.com/hyprwm/Hyprland ; Aquamarine: https://github.com/hyprwm/aquamarine ; wiki https://wiki.hypr.land/Getting-Started/Installation/
- Smithay: https://github.com/Smithay/smithay (mirror pages returned by search)
- container2wasm: https://github.com/container2wasm/container2wasm , https://www.cncf.io/projects/container2wasm/
- v86: https://github.com/copy/v86
- WSLg: https://github.com/microsoft/wslg , https://devblogs.microsoft.com/commandline/wslg-architecture/ , Phoronix https://www.phoronix.com/news/Microsoft-Writing-Wayland-Comp , FOSDEM 2023 Weston RDP slides https://archive.fosdem.org/2023/schedule/event/rdp_wayland/

Not verified, check before use [K]/[U]

- libadwaita 1.8 and 1.9 release notes (NEWS page blocked), GTK 4.16+ CSS custom properties, libadwaita named-color names other than accent_*.
- Qt 6.10/6.11 Material changes (docs MCP returned unrelated pages).
- cosmic-theme RON format and `ThemeBuilder` API.
- Zag.js, Base UI 1.0 status, material-web maintenance status, Greenfield (browser Wayland compositor) status.
- MSYS2 package availability (gtk4, libadwaita, qt6, any wayland/weston); search page returned empty results.
- waylovely and any Wayland-on-Windows effort (README 404).
- Blueprint compiler current version and feature set.
- Tauri, wgpu, winit, iced status (no dedicated query was run; do not rely on this report for them).
