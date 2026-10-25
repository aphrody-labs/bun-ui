# Bun UI open-source catalog (2026)

Snapshot date: 2026-10-25. Scope: cross-platform Material Design 3 UI stack across web/wasm, GTK4/libadwaita, Qt 6/KDE, egui, bevy_ui, libcosmic/iced, Win32/WinUI, Wayland/Hyprland, Arch/Omarchy/CachyOS/Bazzite gaming, MSYS2.

## Verification status

- **Verified in this session** (fetched or searched): awesome-rust GUI list (fetch returned only repo chrome, so not verified), areweguiyet.com GUI list (fetched, 2026-era entries such as Ply, Blinc, Ribir, Tessera), Hyprland (~39.0k stars, BSD-3-Clause), material-web roadmap, material-esm/material fork (3.0.6), @m3e/web, mdui, Gradience (archived), Material You Color Theming GNOME extension, WebVM/CheerpX (Leaning Technologies, Apache-2.0 WebVM, CheerpX free for personal/OSS), Hyprland independence from wlroots (2024, aquamarine backend), CachyOS March 2026 release, ChimeraOS release notes (July 2025, upstream gamescope), Kirigami 6.29.0 on Arch, Kirigami 6.26.0 in Debian (May 2026).
- **Not verified** (from prior knowledge, marked `~`): stars, last-activity year and license for everything else. Re-check each row before relying on it.
- **Searches that came back empty:** container2wasm, Smithay, awesome-hyprland, cxx-qt, PySide6+Kirigami, awesome-msys2, awesome-egui, awesome-bevy, awesome-design-tokens. Those rows are from prior knowledge and need a direct check.
- Note: The `Maycoon` entry on areweguiyet is marked deprecated, and `Relm` (antoyo) is effectively superseded by `Relm4`.

Columns: **name | URL | category | language | license | last activity | stars (~) | role | relevance** (`core` / `plugin` / `reference` / `skip`).

---

## 1. M3 implementations per toolkit

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| material-web (Google) | https://github.com/material-components/material-web | M3 web components | TypeScript | Apache-2.0 | ~2025 (roadmap stale) | ~6k | Official Lit-based M3 web components; roadmap shows 2024-era items | core |
| material-esm/material | https://github.com/material-esm/material | M3 web components (fork) | TypeScript | Apache-2.0 | 2026 (v3.0.6, M3 Expressive in progress) | ~ | Active community fork of material-web; the README recommends it going forward | core |
| @m3e/web | https://github.com/m3e-web (npm @m3e/web) | M3 web components | TypeScript | ~MIT | 2026 (v2.5.12 on npm) | ~ | From-scratch M3 Web Components | plugin |
| mdui | https://github.com/zdhxiong/mdui | M3 web components | TypeScript | MIT | ~2025 | ~6k | M3 (Material You) Web Components with theming | plugin |
| Jetpack Compose Material 3 | https://developer.android.com/jetpack/androidx/releases/compose-material3 | M3 (Android) | Kotlin | Apache-2.0 | 2026 | n/a | Reference M3 implementation for Android | reference |
| Material Components Android | https://github.com/material-components/material-components-android | M3 (Android views) | Java/Kotlin | Apache-2.0 | 2026 | ~17k | Android Views M3 | reference |
| Compose Multiplatform | https://github.com/JetBrains/compose-multiplatform | M3 (desktop/web/wasm) | Kotlin | Apache-2.0 | 2026 | ~17k | Compose M3 on desktop, web (wasm), Android, iOS | core |
| Material You Color Theming (GNOME) | https://github.com/avanishsubbiah/material-you-theme | M3 libadwaita colours | JavaScript | GPL-3.0 | ~2024 | ~ | GNOME extension generating libadwaita CSS from wallpaper | reference |
| Gradience | https://github.com/gradience-dev/gradience | libadwaita theming, M3 palette | Rust/Vala | GPL-3.0 | archived | ~ | Applies M3 palette to libadwaita apps; archived, so reference only | reference |
| Kirigami (KDE) | https://invent.kde.org/frameworks/kirigami | KDE design components (not M3) | C++/QML | LGPL-2.1+ | 2026 (6.29.0) | ~ | KDE mobile/desktop components; not Material but QML-based peer | core |
| Qt Quick Controls Material style | https://doc.qt.io/qt-6/qtquickcontrols-material.html | M3-like Qt style | C++/QML | GPL-3 / LGPL-3 / commercial | 2026 (Qt 6.11/6.12 docs) | n/a | Built-in Material style in Qt Quick Controls | core |
| Qt Quick Controls Material (M3 update) | https://doc.qt.io/qt-6/qtquick-controls-index.html | M3 reference | C++/QML | GPL-3 / LGPL-3 | 2026 | n/a | Official Qt Quick Controls docs | reference |
| MUI Material (React) | https://github.com/mui/material-ui | M3-adjacent React | TS | MIT | 2026 | ~95k | Material UI v6/v7 (M3 tokens partially) | reference |
| Ionic Material | https://github.com/ionic-team/ionic-framework | Mobile M3 themes | TS | MIT | 2026 | ~52k | Ionic themes include Material | reference |
| Vuetify 3 | https://github.com/vuetifyjs/vuetify | Vue M3 components | TS | MIT | 2026 | ~40k | Material Design components for Vue | reference |
| Angular Material | https://github.com/angular/components | Angular M3 | TS | MIT | 2026 | ~25k | Official Angular Material; M3 tokens | reference |
| Flutter M3 theming (flex_color_scheme) | https://github.com/rydmike/flex_color_scheme | M3 theming (Flutter) | Dart | BSD-3-Clause | 2026 | ~ | M3 theme generator for Flutter | reference |
| Material Components web (material-components-web) | https://github.com/material-components/material-components-web | M3 CSS (legacy) | TS | Apache-2.0 | ~2024 (archived in favour of material-web) | ~16k | Legacy; use material-web instead | skip |
| Svelte M3 (svelte-material-ui) | https://github.com/sveltematerialui/svelte-material-ui | M3 Svelte | Svelte | MIT | ~2025 | ~ | Svelte M3 components | skip |
| Mantine | https://github.com/mantinedev/mantine | React UI (not M3) | TS | MIT | 2026 | ~29k | React UI kit with theming tokens | reference |
| Ant Design | https://github.com/ant-design/ant-design | React UI (not M3) | TS | MIT | 2026 | ~96k | Enterprise UI | skip |
| Slint Material widgets | https://github.com/slint-ui/slint | M3-style Slint widgets | Rust/Slint | GPL-3 / royalty-free / commercial | 2026 | ~20k | Slint has Material-style component library | core |
| iced_aw / iced_material | https://github.com/iced-rs/iced_aw | iced widgets | Rust | MIT/Apache-2.0 | 2025-2026 | ~ | Iced additional widgets | plugin |
| libcosmic (System76) | https://github.com/pop-os/libcosmic | COSMIC toolkit (iced) | Rust | MPL-2.0 | 2026 | ~ | Iced-based toolkit used by COSMIC desktop | core |
| egui_material3 | https://github.com/ (verify) | M3 for egui | Rust | MIT | ~2025 | ~ | Community M3 egui widgets; verify exists | plugin |
| Material Design for WinUI / Fluent (Fluent UI) | https://github.com/microsoft/microsoft-ui-xaml | WinUI 3 (not M3) | C++/C# | MIT | 2026 | ~7k | WinUI 3 controls; Windows counterpart | core |
| Fluent UI React | https://github.com/microsoft/fluentui | Fluent 2 web | TS | MIT | 2026 | ~19k | Fluent 2 design system | reference |
| Bevy UI (bevy_ui) | https://github.com/bevyengine/bevy | Bevy UI core | Rust | MIT/Apache-2.0 | 2026 | ~40k | bevy_ui (flexbox/Taffy) | core |
| bevy_material_ui | https://github.com/ (search) | M3 for Bevy | Rust | MIT | ~2025 | ~ | M3 widgets for Bevy; verify | plugin |
| Relm4 Material demo | https://github.com/Relm4/Relm4 | GTK4 Elm-style | Rust | MIT | 2026 | ~2k | Elm-style GTK4 framework | core |

## 2. Design-token tools

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| Style Dictionary | https://github.com/amzn/style-dictionary | tokens | JS | Apache-2.0 | 2026 | ~4k | Token transform pipeline to CSS/Swift/Kotlin/Android XML | core |
| Style Dictionary v4 | https://styledictionary.com | tokens | JS | Apache-2.0 | 2026 | n/a | Docs site | reference |
| Tokens Studio | https://github.com/tokens-studio/figma-plugin | tokens (Figma) | TS | MIT | 2026 | ~1k | Figma token sync | plugin |
| DTCG spec | https://github.com/design-tokens/community-group | tokens standard | Spec | CC/W3C | 2026 | ~ | W3C design token format | core |
| Terrazzo | https://github.com/terrazzoapp/terrazzo | tokens | TS | MIT | 2026 | ~ | DTCG token build | plugin |
| Material Theme Builder (Figma) | https://m3.material.io/theme-builder | M3 tokens | Web | n/a | 2026 | n/a | Official M3 tokens | core |
| material-foundation/material-tokens | https://github.com/material-foundation/material-tokens | M3 tokens source | JSON | Apache-2.0 | 2026 | ~ | Canonical M3 token JSON | core |
| @material/material-color-utilities | https://github.com/material-foundation/material-color-utilities | M3 color algorithm | Dart/TS/Kotlin/C++ | Apache-2.0 | 2026 | ~1k | HCT and tonal palette generator | core |
| material-color-utilities-rs | https://crates.io/crates/material-colors | M3 color (Rust) | Rust | MIT | ~2025 | ~ | Rust port of M3 color utils | core |
| Radix Themes | https://github.com/radix-ui/themes | tokens/theming | TS | MIT | 2026 | ~ | Token-driven theming (not M3) | reference |
| Panda CSS | https://github.com/chakra-ui/panda | tokens/CSS-in-JS | TS | MIT | 2026 | ~ | Token-first CSS | reference |
| Open Props | https://github.com/argyleink/open-props | CSS tokens | CSS | MIT | 2025 | ~9k | CSS custom property tokens | reference |
| awesome-design-tokens | https://github.com/ (search returned nothing) | list | n/a | n/a | ~ | n/a | Could not verify | skip |

## 3. Rust GUI toolkits and plugins/addons

Source: areweguiyet.com GUI list (fetched). Stars and activity are approximate.

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| egui | https://github.com/emilk/egui | immediate GUI | Rust | MIT/Apache-2.0 | 2026 | ~27k | Immediate-mode, web and native | core |
| egui_dock | https://github.com/Adanos020/egui_dock | egui docking | Rust | MIT/Apache-2.0 | 2026 | ~ | Docking panes for egui | plugin |
| egui_extras / egui_plot | https://github.com/emilk/egui | egui widgets | Rust | MIT/Apache-2.0 | 2026 | n/a | Tables, images, plots | plugin |
| egui-material | https://github.com/ (verify) | M3 for egui | Rust | MIT | ~ | ~ | Verify exists | plugin |
| Iced | https://github.com/iced-rs/iced | Elm-style GUI | Rust | MIT | 2026 | ~29k | Renderer-agnostic, Elm-style | core |
| libcosmic | https://github.com/pop-os/libcosmic | iced toolkit | Rust | MPL-2.0 | 2026 | ~ | COSMIC desktop toolkit | core |
| cosmic-epoch | https://github.com/pop-os/cosmic-epoch | COSMIC DE | Rust | GPL-3.0 | 2026 | ~ | COSMIC desktop compositor and apps | core |
| Slint | https://github.com/slint-ui/slint | declarative GUI | Rust/Slint | GPL-3 / royalty-free / commercial | 2026 | ~20k | Embedded and desktop | core |
| Dioxus | https://github.com/DioxusLabs/dioxus | React-like UI | Rust | MIT/Apache-2.0 | 2026 (0.6+) | ~ | Desktop, web, mobile | core |
| Xilem | https://github.com/linebender/xilem | reactive UI (experimental) | Rust | Apache-2.0 | 2026 | ~ | Linebender reactive architecture | reference |
| Vizia | https://github.com/vizia/vizia | declarative desktop | Rust | MIT | 2026 | ~ | Declarative desktop GUI | reference |
| Freya | https://github.com/marc2332/freya | Skia GUI | Rust | MIT | 2026 | ~ | Skia-powered | reference |
| Floem | https://github.com/lapce/floem | reactive GUI | Rust | MIT | 2026 | ~ | Lapce's toolkit | reference |
| Makepad | https://github.com/makepad/makepad | GPU UI | Rust | MIT | 2026 | ~ | Live-coding UI framework | reference |
| Ribir | https://github.com/RibirX/Ribir | native GUI | Rust | MIT | 2026 | ~ | Single-codebase multi-platform | reference |
| Tessera | https://github.com/tessera-ui/tessera | declarative UI | Rust | MIT/Apache-2.0 | 2026 | ~ | Functional cross-platform | reference |
| Ply | https://github.com/TheRedDeveloper/ply-engine | immediate app engine | Rust | ~MIT | 2026 (announced Mar 2026) | ~ | macroquad-based | reference |
| Azul | https://github.com/fschutt/azul | reactive GUI | Rust/C | MIT | 2026 | ~ | WebRender-based | reference |
| Kas | https://github.com/kas-gui/kas | stateful GUI | Rust | Apache-2.0 | 2026 | ~ | Accessible GUI | reference |
| Cushy | https://github.com/khonsulabs/cushy | wgpu GUI | Rust | MIT/Apache-2.0 | 2026 | ~ | Reactive data model | reference |
| Rosin | https://github.com/sailbrush/rosin | GUI | Rust | MIT | 2026 | ~ | Ease-of-use focus | skip |
| Pax | https://www.github.com/paxproject/pax | UI language | Rust | ~ | ~ | ~ | Layout engine | skip |
| Blinc | https://github.com/project-blinc/Blinc | app framework | Rust | ~ | 2026 | ~ | Native/Android/iOS | reference |
| Crux | https://github.com/redbadger/crux | cross-platform core | Rust | Apache-2.0 | 2026 | ~ | Shared-core architecture | reference |
| GPUI | https://github.com/zed-industries/zed | GPU UI | Rust | Apache-2.0/GPL | 2026 | ~ | Zed's framework | reference |
| Relm4 | https://github.com/Relm4/Relm4 | GTK4 Elm-style | Rust | MIT | 2026 | ~2k | Built on gtk4-rs | core |
| relm | https://github.com/antoyo/relm | GTK3 Elm-style | Rust | MIT | stale | ~ | Superseded by Relm4 | skip |
| Tauri | https://github.com/tauri-apps/tauri | web-view desktop | Rust | MIT/Apache-2.0 | 2026 (2.x) | ~ | Web UI shell; useful for web-in-native | core |
| Wry / Tao | https://github.com/tauri-apps/wry | webview | Rust | MIT/Apache-2.0 | 2026 | ~ | Webview backend | plugin |
| Rinf | https://github.com/cunarist/rinf | Rust logic + Flutter | Rust/Dart | MIT | 2026 | ~ | Bridge | reference |
| Yew | https://github.com/yewstack/yew | web framework | Rust | MIT/Apache-2.0 | 2026 | ~ | Wasm web UI | core |
| Leptos | https://github.com/leptos-rs/leptos | web framework | Rust | MIT | 2026 | ~ | Fine-grained reactivity | core |
| Dominator | https://github.com/Pauan/rust-dominator | DOM FRP | Rust | MIT | ~2025 | ~ | DOM library | reference |
| Cacao | https://github.com/ryanmcgrath/cacao | AppKit/UIKit | Rust | MIT | 2025 | ~ | Apple native | skip |
| fltk-rs | https://github.com/fltk-rs/fltk-rs | FLTK bindings | Rust | MIT | 2026 | ~ | Lightweight native | reference |
| gtk4-rs | https://github.com/gtk-rs/gtk4-rs | GTK4 bindings | Rust | MIT | 2026 | ~ | GTK4 Rust bindings | core |
| gtk3-rs | https://github.com/gtk-rs/gtk3-rs | GTK3 bindings | Rust | MIT | 2026 | ~ | GTK3 | skip |
| windows-rs | https://github.com/microsoft/windows-rs | Win32/WinRT bindings | Rust | MIT/Apache-2.0 | 2026 | ~10k | Official Windows bindings | core |
| WinSafe | https://github.com/rodrigocfd/winsafe | Win32 safe | Rust | MIT | 2026 | ~ | Safe Win32 GUI | reference |
| wxDragon | https://github.com/AllenDang/wxDragon | wxWidgets bindings | Rust | MIT | 2026 | ~ | Native widgets | reference |
| imgui-rs | https://github.com/imgui-rs/imgui-rs | immediate GUI | Rust | MIT/Apache-2.0 | 2026 | ~ | Dear ImGui bindings | reference |
| kittest | https://github.com/rerun-io/kittest | GUI testing (AccessKit) | Rust | MIT/Apache-2.0 | 2026 | ~ | Testing egui/AccessKit | plugin |
| AccessKit | https://github.com/AccessKit/accesskit | accessibility | Rust | MIT/Apache-2.0 | 2026 | ~ | Cross-platform a11y tree | core |
| bevy_ui | https://github.com/bevyengine/bevy | Bevy UI | Rust | MIT/Apache-2.0 | 2026 | ~40k | Flex layout | core |
| bevy_egui | https://github.com/vladbat00/bevy_egui | egui in Bevy | Rust | MIT/Apache-2.0 | 2026 | ~ | Bridge | plugin |
| bevy_lunex | https://github.com/bytestring-net/bevy_lunex | Bevy UI | Rust | MIT | ~2025 | ~ | UI framework for Bevy | plugin |
| sickle_ui | https://github.com/UmbraLuminosa/sickle_ui | Bevy UI kit | Rust | MIT | ~2025 | ~ | Bevy widgets | plugin |
| bevy_ui_builder | https://github.com/ (verify) | Bevy UI builder | Rust | MIT | ~ | ~ | Verify | plugin |
| bevy_feathers | https://github.com/bevyengine/bevy | Bevy editor widgets | Rust | MIT/Apache-2.0 | 2026 | n/a | Bevy's widget set (verify status) | plugin |
| iced_aw | https://github.com/iced-rs/iced_aw | iced widgets | Rust | MIT/Apache-2.0 | 2026 | ~ | Extra iced widgets | plugin |
| iced_fonts | https://github.com/Redhawk18/iced_fonts | iced icons | Rust | MIT | ~2025 | ~ | Icon fonts | plugin |
| cosmic-text | https://github.com/pop-os/cosmic-text | text shaping | Rust | MIT/Apache-2.0 | 2026 | ~ | Text for iced/COSMIC | core |
| Taffy | https://github.com/DioxusLabs/taffy | flex/grid layout | Rust | MIT | 2026 | ~ | Layout engine used by bevy_ui and Dioxus | core |
| Blitz | https://github.com/DioxusLabs/blitz | HTML/CSS native renderer | Rust | MIT/Apache-2.0 | 2026 | ~ | Stylo + Vello-based HTML/CSS renderer | core |
| Stylo | https://github.com/servo/stylo | CSS engine | Rust | MPL-2.0 | 2026 | ~ | Firefox CSS engine | core |
| Vello | https://github.com/linebender/vello | GPU 2D | Rust | Apache-2.0/MIT | 2026 | ~ | GPU vector renderer | core |
| Parley | https://github.com/linebender/parley | text layout | Rust | Apache-2.0/MIT | 2026 | ~ | Rich text | plugin |
| WebRender | https://github.com/servo/webrender | GPU renderer | Rust | MPL-2.0 | 2026 | ~ | Servo/Firefox renderer | reference |

## 4. GTK4/libadwaita apps and bindings

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| libadwaita | https://gitlab.gnome.org/GNOME/libadwaita | GTK4 widgets | C | LGPL-2.1+ | 2026 | n/a | Adwaita widgets; reference M3 analogue | core |
| GTK 4 | https://gitlab.gnome.org/GNOME/gtk | toolkit | C | LGPL-2.1+ | 2026 | n/a | GTK 4.x | core |
| gtk4-rs | https://github.com/gtk-rs/gtk4-rs | Rust bindings | Rust | MIT | 2026 | ~ | Core Rust path | core |
| libadwaita-rs | https://gitlab.gnome.org/World/Rust/libadwaita-rs | Rust bindings | Rust | MIT | 2026 | n/a | Adwaita for Rust | core |
| PyGObject | https://gitlab.gnome.org/GNOME/pygobject | Python bindings | Python | LGPL-2.1+ | 2026 | n/a | GTK4/adw from Python | core |
| gtkmm 4 | https://gitlab.gnome.org/GNOME/gtkmm | C++ bindings | C++ | LGPL-2.1+ | 2026 | n/a | C++ GTK4 | plugin |
| Relm4 | https://github.com/Relm4/Relm4 | Elm-style | Rust | MIT | 2026 | ~2k | Built on gtk4-rs | core |
| Blueprint | https://gitlab.gnome.org/jwestman/blueprint-compiler | UI language | Python | LGPL-3.0 | 2026 | n/a | Compiles blueprints to GtkBuilder | core |
| GNOME Builder | https://gitlab.gnome.org/GNOME/gnome-builder | IDE | C | GPL-3.0 | 2026 | n/a | Reference app | reference |
| Loupe | https://gitlab.gnome.org/GNOME/loupe | image viewer | Rust | GPL-3.0 | 2026 | n/a | libadwaita reference app | reference |
| Fractal | https://gitlab.gnome.org/World/fractal | Matrix client | Rust | GPL-3.0 | 2026 | n/a | libadwaita app | reference |
| Authenticator | https://gitlab.gnome.org/World/Authenticator | 2FA | Rust | GPL-3.0 | 2026 | n/a | libadwaita app | reference |
| Gradience | https://github.com/gradience-dev/gradience | theming | Rust/Vala | GPL-3.0 | archived | ~ | See section 1 | reference |
| Material You Color Theming | https://github.com/avanishsubbiah/material-you-theme | theming | JS | GPL-3.0 | ~2024 | ~ | See section 1 | reference |
| adw-gtk3 | https://github.com/lassekongo83/adw-gtk3 | GTK3 theme | C/CSS | LGPL-2.1 | 2026 | ~ | Adwaita look for GTK3 | plugin |
| Libadwaita demo | https://gitlab.gnome.org/GNOME/libadwaita/-/tree/main/demo | demo | C | LGPL-2.1+ | 2026 | n/a | Demo app | reference |
| Amberol | https://gitlab.gnome.org/World/amberol | music player | Rust | GPL-3.0 | 2026 | n/a | libadwaita reference | skip |
| gtk-rs book | https://gtk-rs.org | docs | n/a | n/a | 2026 | n/a | Official tutorials | reference |

## 5. Qt 6 bindings and KDE frameworks

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| Qt 6 | https://www.qt.io | toolkit | C++/QML | LGPL-3 / GPL-3 / commercial | 2026 (6.12) | n/a | Core toolkit | core |
| CXX-Qt | https://github.com/KDAB/cxx-qt | Rust/C++ bridge | Rust | MIT/Apache-2.0 | 2026 | ~ | QObjects for QML from Rust | core |
| qmetaobject-rs | https://github.com/woboq/qmetaobject-rs | Rust bindings | Rust | MIT/Apache-2.0 | ~2025 | ~ | Qt/QML from Rust; CXX-Qt is preferred | plugin |
| PySide6 | https://code.qt.io/cgit/pyside/pyside-setup.git | Python bindings | Python | LGPL-3 | 2026 | n/a | Official Python bindings | core |
| Kirigami | https://invent.kde.org/frameworks/kirigami | KDE components | C++/QML | LGPL-2.1+ | 2026 (6.29.0) | ~ | Mobile/desktop components | core |
| Kirigami Addons | https://invent.kde.org/libraries/kirigami-addons | Kirigami extras | QML | LGPL-2.0+ | 2026 | ~ | Extra components | plugin |
| KDE Frameworks 6 | https://invent.kde.org/frameworks | frameworks | C++ | LGPL-2.1+ | 2026 | n/a | KF6 umbrella | core |
| Plasma 6 | https://invent.kde.org/plasma | desktop | C++/QML | GPL/LGPL | 2026 | n/a | KDE Plasma | reference |
| Qt Quick Controls | https://doc.qt.io/qt-6/qtquickcontrols-index.html | QML controls | C++/QML | LGPL-3 | 2026 | n/a | Built-in controls | core |
| KDE Breeze | https://invent.kde.org/plasma/breeze | Qt style | C++ | LGPL-2.1+ | 2026 | n/a | KDE style | reference |
| Qt Design Studio | https://www.qt.io/product/ui-design-studio | design tool | n/a | commercial/GPL | 2026 | n/a | Designer-to-QML | reference |
| qt-development-skills | (installed plugin) | Qt skills | n/a | n/a | 2026 | n/a | Qt docs MCP (verify plugin availability) | reference |
| Qt Quick 3D | https://doc.qt.io/qt-6/qtquick3d-index.html | 3D QML | C++ | LGPL-3 | 2026 | n/a | 3D in QML | reference |
| QML Material (Qt Quick Controls Material) | https://doc.qt.io/qt-6/qtquickcontrols-material.html | style | C++/QML | LGPL-3 | 2026 | n/a | Material style | core |
| qmlbook | https://github.com/uwerat/qmlbook | docs | QML | CC/MIT | ~2025 | ~ | QML book | reference |

## 6. TSX/CSS-to-native converters and native renderers

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| React Native for Windows | https://github.com/microsoft/react-native-windows | RN desktop | C++/TS | MIT | 2026 | ~ | RN on Win32/WinUI | core |
| React Native for macOS | https://github.com/microsoft/react-native-macos | RN desktop | ObjC/TS | MIT | 2026 | ~ | RN macOS | reference |
| react-native-linux (Gnome/QT) | https://github.com/ (verify) | RN Linux port | ~ | ~ | ~ | ~ | Verify before use | skip |
| Electrobun | https://github.com/blackboardsh/electrobun | Bun desktop | TS/Zig | MIT | 2026 | ~ | Bun-based desktop shell | core |
| Tauri 2 | https://github.com/tauri-apps/tauri | web shell | Rust | MIT/Apache-2.0 | 2026 | ~ | Web UI in native | core |
| Neutralinojs | https://github.com/neutralinojs/neutralinojs | web shell | C++/JS | MIT | 2026 | ~ | Lightweight | plugin |
| Slint | https://github.com/slint-ui/slint | declarative | Rust | GPL-3 / royalty-free / commercial | 2026 | ~20k | Native renderer | core |
| Blitz | https://github.com/DioxusLabs/blitz | HTML/CSS native | Rust | MIT/Apache-2.0 | 2026 | ~ | Renders HTML/CSS natively | core |
| Dioxus native | https://github.com/DioxusLabs/dioxus | native renderers | Rust | MIT/Apache-2.0 | 2026 | ~ | Native DOM via Blitz | core |
| Lynx | https://github.com/lynx-family/lynx | native UI from TSX | C++/TS | Apache-2.0 | 2026 | ~ | Cross-platform native UI from web-like code | reference |
| NativeScript | https://github.com/NativeScript/NativeScript | native UI | TS | Apache-2.0 | 2026 | ~ | Native from JS | reference |
| Ionic Capacitor | https://github.com/ionic-team/capacitor | mobile shell | TS | MIT | 2026 | ~ | Web to native | reference |
| Flutter Desktop | https://github.com/flutter/flutter | native renderer | Dart | BSD-3 | 2026 | ~170k | Skia/Impeller | reference |
| Compose Multiplatform | https://github.com/JetBrains/compose-multiplatform | native renderer | Kotlin | Apache-2.0 | 2026 | ~17k | Compose on desktop/web | core |
| Skia | https://github.com/google/skia | 2D graphics | C++ | BSD-3 | 2026 | ~ | 2D used by many | core |
| Vello | https://github.com/linebender/vello | GPU 2D | Rust | Apache/MIT | 2026 | ~ | GPU vector | core |
| Taffy | https://github.com/DioxusLabs/taffy | layout | Rust | MIT | 2026 | ~ | Flex/grid | core |
| Yoga | https://github.com/facebook/yoga | layout | C++ | MIT | 2026 | ~ | Flexbox for RN | core |
| Lightningcss | https://github.com/parcel-bundler/lightningcss | CSS parser | Rust | MPL-2.0 | 2026 | ~ | CSS parsing/transform | core |
| SWC | https://github.com/swc-project/swc | JS/TS | Rust | Apache-2.0 | 2026 | ~ | Transpiler | reference |

## 7. Wayland compositors and libraries

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| Hyprland | https://github.com/hyprwm/Hyprland | compositor | C++ | BSD-3-Clause | 2026 | ~39k | Tiling compositor; independent of wlroots since 2024 | core |
| aquamarine | https://github.com/hyprwm/aquamarine | backend lib | C++ | BSD-3 | 2026 | ~ | Hyprland's backend | core |
| hyprlang | https://github.com/hyprwm/hyprlang | config | C++ | BSD-3 | 2026 | ~ | Config language | plugin |
| hyprutils | https://github.com/hyprwm/hyprutils | utils | C++ | BSD-3 | 2026 | ~ | Utilities | plugin |
| hyprpaper / hyprlock / hypridle | https://github.com/hyprwm | Hypr apps | C++ | BSD-3 | 2026 | ~ | Hyprland ecosystem | plugin |
| hyprland-plugins | https://github.com/hyprwm/hyprland-plugins | plugins | C++ | BSD-3 | 2026 | ~ | Official plugins | plugin |
| wlroots | https://gitlab.freedesktop.org/wlroots/wlroots | compositor lib | C | MIT | 2026 | n/a | Sway, river, labwc base | core |
| Sway | https://github.com/swaywm/sway | compositor | C | MIT | 2026 | ~ | i3-compatible | reference |
| river | https://codeberg.org/river/river | compositor | Zig | GPL-3 | 2026 | n/a | Zig Wayland compositor | reference |
| labwc | https://github.com/labwc/labwc | compositor | C | GPL-2 | 2026 | ~ | Stacking Wayland | reference |
| Smithay | https://github.com/Smithay/smithay | compositor lib | Rust | MIT | 2026 | ~ | Rust compositor library (search returned nothing; verify) | core |
| cosmic-comp | https://github.com/pop-os/cosmic-comp | compositor | Rust | GPL-3 | 2026 | ~ | COSMIC compositor on Smithay | core |
| niri | https://github.com/YaLTeR/niri | compositor | Rust | GPL-3 | 2026 | ~ | Scrollable tiling | reference |
| wayland-rs | https://github.com/Smithay/wayland-rs | protocol bindings | Rust | MIT | 2026 | ~ | Rust wayland | core |
| wayland-protocols | https://gitlab.freedesktop.org/wayland/wayland-protocols | protocols | XML | MIT | 2026 | n/a | Standard protocols | core |
| xdg-desktop-portal | https://github.com/flatpak/xdg-desktop-portal | portal | C | LGPL-2.1 | 2026 | ~ | Sandboxed desktop integration | core |
| layer-shell (wlr) | https://gitlab.freedesktop.org/wlroots/wlr-protocols | protocol | XML | MIT | 2026 | n/a | Panels, overlays | core |
| waybar | https://github.com/Alexays/Waybar | bar | C++ | MIT | 2026 | ~ | Status bar | plugin |
| eww | https://github.com/elkowar/eww | widgets | Rust | MIT | 2026 | ~ | Widgets on Wayland | plugin |
| ags / Astal | https://github.com/Aylur/ags | widgets | TS/JS | GPL-3 | 2026 | ~ | GTK widgets on Wayland | plugin |
| quickshell | https://git.outfoxxed.me/quickshell/quickshell | shell toolkit | C++/QML | LGPL-3 | 2026 | ~ | QtQuick shell toolkit | core |
| rofi (wayland fork) | https://github.com/lbonn/rofi | launcher | C | MIT | 2026 | ~ | Launcher | plugin |
| wofi | https://hg.sr.ht/~scoopta/wofi | launcher | C | GPL-3 | ~2025 | n/a | Launcher | plugin |
| Walker | https://github.com/abenz1267/walker | launcher | Go | GPL-3 | 2026 | ~ | Launcher | plugin |
| awesome-hyprland | https://github.com/hyprland-community/awesome-hyprland | list | n/a | n/a | 2026 | n/a | Not verified (search empty) | reference |
| Omarchy (Hyprland distro) | https://github.com/basecamp/omarchy | distro | Shell | MIT | 2026 | ~ | Arch + Hyprland dev desktop | core |

## 8. wasm Linux/Wayland (greenfield)

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| WebVM | https://github.com/leaningtech/webvm | browser Linux | JS | Apache-2.0 | 2026 | ~ | Debian in browser via CheerpX | core |
| CheerpX | https://cheerpx.io / labs.leaningtech.com | x86 to wasm VM | Commercial/free for personal/OSS | free for OSS | 2026 | n/a | x86 JIT to wasm, syscall emu | core |
| v86 | https://github.com/copy/v86 | x86 emulator | JS/Rust | BSD-2 | 2026 | ~ | Full PC emulation in browser | core |
| JSLinux | https://bellard.org/jslinux | Linux in browser | JS | MIT | ~2024 | n/a | Fabrice Bellard | reference |
| container2wasm (c2w) | https://github.com/ktock/container2wasm | container to wasm | Go | Apache-2.0 | 2026 | ~ | Container images to wasm (search empty; verify) | core |
| wasmer | https://github.com/wasmerio/wasmer | wasm runtime | Rust | MIT | 2026 | ~ | Runtime with WASIX | plugin |
| wasmtime | https://github.com/bytecodealliance/wasmtime | wasm runtime | Rust | Apache-2.0 | 2026 | ~ | Reference runtime | core |
| WASI / wasi-gfx | https://github.com/WebAssembly/wasi-gfx | graphics proposal | n/a | Apache-2.0 | 2026 | n/a | GPU for wasm | reference |
| wasm-bindgen | https://github.com/rustwasm/wasm-bindgen | Rust/JS glue | Rust | MIT/Apache-2.0 | 2026 | ~ | Wasm glue | core |
| Emscripten | https://github.com/emscripten-core/emscripten | C/C++ to wasm | Python/C | MIT | 2026 | ~ | Wasm toolchain | core |
| Xterm.js | https://github.com/xtermjs/xterm.js | terminal | TS | MIT | 2026 | ~ | Browser terminal | plugin |
| Wayland in browser (weston-wasm) | https://gitlab.freedesktop.org/wayland/weston | compositor | C | MIT | 2026 | n/a | Weston backend ideas | reference |
| Cage | https://github.com/cage-kiosk/cage | kiosk compositor | C | MIT | 2026 | ~ | Single-app Wayland | reference |
| Wine (wasm research) | https://gitlab.winehq.org/wine/wine | Win32 compatibility | C | LGPL-2.1+ | 2026 | n/a | Win32 APIs; relevant to Win32 path | reference |

## 9. Win32 / MSYS2 UI

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| MSYS2 | https://github.com/msys2/msys2-installer | toolchain | C | MIT | 2026 | ~ | MinGW-w64 build env | core |
| MSYS2 packages | https://github.com/msys2/MSYS2-packages | packages | Shell | mixed | 2026 | ~ | Package recipes | core |
| mingw-w64 | https://sourceforge.net/projects/mingw-w64 | toolchain | C | Zlib/BSD | 2026 | n/a | Win32 headers and libs | core |
| awesome-msys2 | https://github.com/ (search empty; verify) | list | n/a | n/a | ~ | n/a | Not verified | skip |
| WinUI 3 / Windows App SDK | https://github.com/microsoft/WindowsAppSDK | WinUI runtime | C++/C# | MIT | 2026 | ~ | Windows App SDK | core |
| microsoft-ui-xaml | https://github.com/microsoft/microsoft-ui-xaml | WinUI controls | C++/C# | MIT | 2026 | ~7k | WinUI 3 controls | core |
| CommunityToolkit WinUI | https://github.com/CommunityToolkit/Windows | WinUI toolkit | C#/XAML | MIT | 2026 | ~ | Community controls | plugin |
| Fluent 2 Web | https://github.com/microsoft/fluentui | Fluent web | TS | MIT | 2026 | ~19k | Fluent 2 tokens/components | reference |
| WinSafe | https://github.com/rodrigocfd/winsafe | Win32 | Rust | MIT | 2026 | ~ | Safe Win32 | reference |
| windows-rs | https://github.com/microsoft/windows-rs | bindings | Rust | MIT/Apache-2.0 | 2026 | ~10k | Official | core |
| Win32 Fluent-like (Mica/Acrylic) | https://github.com/Grabacr07/SimpleAcrylicWindow | Win32 effects | C# | MIT | ~2024 | ~ | Acrylic effects | skip |
| Windows Terminal | https://github.com/microsoft/terminal | terminal | C++ | MIT | 2026 | ~ | Terminal app | reference |
| Dear ImGui | https://github.com/ocornut/imgui | immediate GUI | C++ | MIT | 2026 | ~ | Immediate-mode | reference |
| Qt for Windows | https://www.qt.io | Qt on Win | C++ | LGPL | 2026 | n/a | Qt6 MSVC | core |

## 10. Gaming shells

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| gamescope | https://github.com/ValveSoftware/gamescope | micro-compositor | C++ | BSD-2 | 2026 | ~ | Valve's gaming compositor | core |
| gamescope-session-cachyos | https://github.com/CachyOS (verify) | session fork | ~ | ~ | 2026 (Mar 2026 release) | n/a | CachyOS fork that replaced Valve gamescope-session | plugin |
| ChimeraOS | https://github.com/ChimeraOS/chimeraos | console-style OS | Shell | MIT | 2025 (July 2025 release notes; 46) | ~ | Couch gaming OS; now upstream gamescope | core |
| Bazzite | https://github.com/ublue-os/bazzite | Fedora Atomic gaming | Shell | Apache-2.0 | 2026 | ~ | Gaming OS with Gaming Mode | core |
| CachyOS | https://github.com/CachyOS | Arch performance distro | Shell | GPL-3 | 2026 (Mar 2026 release, kernel 6.19) | ~ | Arch-based gaming distro | core |
| Playnite | https://github.com/JosefNemec/Playnite | game library | C# | MIT | 2026 | ~ | Library frontend | reference |
| Steam Big Picture | (Valve, closed) | UI | n/a | proprietary | 2026 | n/a | Reference only | reference |
| Lutris | https://github.com/lutris/lutris | game manager | Python | GPL-3 | 2026 | ~ | Launcher | reference |
| Heroic Games Launcher | https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher | launcher | TS | GPL-3 | 2026 | ~ | Epic/GOG | reference |
| EmulationStation DE | https://gitlab.com/es-de/emulationstation-de | frontend | C++ | MIT | 2026 | n/a | Couch frontend | reference |
| Pegasus frontend | https://github.com/mmatyas/pegasus-frontend | frontend | C++/QML | GPL-3 | 2026 | ~ | Qt/QML frontend | core |
| RetroArch | https://github.com/libretro/RetroArch | emulator frontend | C | GPL-3 | 2026 | ~ | Ozone/XMB; see retroarch notes | reference |
| Omarchy | https://github.com/basecamp/omarchy | dev distro | Shell | MIT | 2026 | ~ | Arch + Hyprland | core |
| Gamescope-session (Valve) | https://github.com/ValveSoftware/gamescope | session | C++ | BSD-2 | 2026 | ~ | Session | core |
| SteamOS (reference) | (Valve) | distro | n/a | proprietary | 2026 | n/a | Reference | reference |
| Sunshine | https://github.com/LizardByte/Sunshine | game streaming | C++ | GPL-3 | 2026 | ~ | Streaming server | plugin |
| Moonlight | https://github.com/moonlight-stream/moonlight-qt | client | C++/Qt | GPL-3 | 2026 | ~ | Qt client | reference |
| Decky Loader | https://github.com/SteamDeckHomebrew/decky-loader | plugin loader | TS/Python | GPL-2 | 2026 | ~ | Steam Deck plugins | skip |

## 11. CLI/TUI (ratatui ecosystem)

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| ratatui | https://github.com/ratatui/ratatui | TUI | Rust | MIT | 2026 | ~ | Core TUI library | core |
| crossterm | https://github.com/crossterm-rs/crossterm | terminal | Rust | MIT | 2026 | ~ | Backend | core |
| tui-realm | https://github.com/veeso/tui-realm | TUI framework | Rust | MIT | 2026 | ~ | Components | plugin |
| tui-textarea | https://github.com/rhysd/tui-textarea | widget | Rust | MIT | 2026 | ~ | Text input | plugin |
| tui-tree-widget | https://github.com/EdJoPaTo/tui-rs-tree-widget | widget | Rust | MIT | 2026 | ~ | Tree | plugin |
| ratatui-image | https://github.com/benjajaja/ratatui-image | widget | Rust | MIT | 2026 | ~ | Images | plugin |
| Helix | https://github.com/helix-editor/helix | editor | Rust | MPL-2.0 | 2026 | ~ | TUI editor | reference |
| Zellij | https://github.com/zellij-org/zellij | multiplexer | Rust | MIT | 2026 | ~ | Multiplexer | reference |
| Yazi | https://github.com/sxyazi/yazi | file manager | Rust | MIT | 2026 | ~ | File manager | reference |
| gitui | https://github.com/gitui-org/gitui | git TUI | Rust | MIT | 2026 | ~ | Git TUI | reference |
| bubbletea (Go, reference) | https://github.com/charmbracelet/bubbletea | TUI | Go | MIT | 2026 | ~ | Elm TUI | reference |
| Textual (Python) | https://github.com/Textualize/textual | TUI | Python | MIT | 2026 | ~ | Python TUI | reference |
| Ink (React TUI) | https://github.com/vadimdemedes/ink | React TUI | TS | MIT | 2026 | ~ | React to terminal | reference |
| OpenTUI | https://github.com/sst/opentui | TUI | TS/Zig | MIT | 2026 | ~ | TS TUI | reference |
| Material TUI (ratatui-material) | https://github.com/ (verify) | M3 TUI | Rust | ~ | ~ | ~ | Verify | skip |

## 12. Bun, design-system and browser references (supporting)

| name | URL | category | language | license | last activity | stars (~) | role | relevance |
|---|---|---|---|---|---|---|---|---|
| Bun | https://github.com/oven-sh/bun | runtime | Zig/C++ | MIT | 2026 | ~ | Runtime; Bun UI consumer | core |
| Bun.WebView / Bun.Window (fork) | (Bun OS fork) | native UI | n/a | n/a | 2026 | n/a | Confirm in repo | reference |
| Storybook | https://github.com/storybookjs/storybook | UI workshop | TS | MIT | 2026 | ~ | Component dev | reference |
| Playwright | https://github.com/microsoft/playwright | e2e | TS | Apache-2.0 | 2026 | ~ | Browser testing | core |
| Figma MCP (Dev Mode) | (Figma) | design | n/a | proprietary | 2026 | n/a | Token extraction | reference |
| Radix UI Primitives | https://github.com/radix-ui/primitives | primitives | TS | MIT | 2026 | ~ | Headless a11y primitives | reference |
| Headless UI | https://github.com/tailwindlabs/headlessui | primitives | TS | MIT | 2026 | ~ | Headless primitives | reference |
| Base UI | https://github.com/mui/base-ui | primitives | TS | MIT | 2026 | ~ | Headless | reference |
| Lit | https://github.com/lit/lit | web components | TS | BSD-3 | 2026 | ~ | Web components base | core |
| Shoelace | https://github.com/shoelace-style/shoelace | web components | TS | MIT | 2026 | ~ | Web components | reference |

---

## Best practices 2026 (sources)

1. Use one token source of truth and export to every platform via DTCG-compatible pipelines (Style Dictionary, Terrazzo). Sources: https://www.designtokens.org (DTCG), https://styledictionary.com.
2. Generate M3 palettes with the official HCT algorithm (material-color-utilities) instead of hand-tuned hex. Source: https://github.com/material-foundation/material-color-utilities.
3. Use the active community fork (material-esm/material) for web M3 rather than the stale Google material-web roadmap. Source: https://github.com/material-esm/material.
4. On Linux GTK4, use libadwaita's theming system (CSS variables and accent colours) and map M3 roles onto it rather than forking widgets. Source: https://gitlab.gnome.org/GNOME/libadwaita.
5. On Qt 6, prefer QML Material style and Kirigami over hand-rolled widgets; prefer CXX-Qt for Rust-to-QML. Sources: https://doc.qt.io/qt-6/qtquickcontrols-material.html, https://github.com/KDAB/cxx-qt.
6. Rust UI: pick egui for tools, iced/libcosmic for COSMIC-style apps, bevy_ui for game-engine HUDs, Slint for embedded. Source: https://www.areweguiyet.com/.
7. Build accessibility trees with AccessKit across Rust toolkits. Source: https://github.com/AccessKit/accesskit.
8. Use wayland-protocols standards and xdg-desktop-portal instead of compositor-specific APIs. Source: https://gitlab.freedesktop.org/wayland/wayland-protocols.
9. Hyprland is wlroots-independent since 2024, so do not assume wlroots APIs. Source: https://linuxiac.com/hyprland-completes-independence-from-wlroots/.
10. For browser Linux, prefer CheerpX/WebVM for streaming disk images over v86 full-image downloads. Source: https://labs.leaningtech.com/cheerpx.
11. Gaming shells: track gamescope upstream; ChimeraOS moved to upstream gamescope in 2025. Source: https://github.com/ChimeraOS/chimeraos/wiki/Release-Notes.
12. Fedora Atomic (Bazzite) and Arch (CachyOS, Omarchy) are the 2026 bases for gaming and dev desktops. Sources: https://computingforgeeks.com/best-desktop-linux-distributions/, https://cachyos.org/blog/2603-march-release.
13. Use windows-rs and WinUI 3 (Windows App SDK) for Win32/WinRT, not old WinForms. Source: https://github.com/microsoft/WindowsAppSDK.
14. Bundle Bun via its native APIs for the JS side; treat Electrobun as the Bun-native desktop reference. Source: https://github.com/blackboardsh/electrobun.
15. Keep upstream licenses intact: Slint (GPL-3 or royalty-free or commercial), Qt (LGPL-3 or commercial), libadwaita (LGPL-2.1+). Verify each before shipping.

## Open items

- Re-verify stars, last activity and license for every `~` row; several are from prior knowledge.
- Run direct checks for container2wasm, Smithay, awesome-hyprland, cxx-qt, awesome-egui, awesome-bevy, awesome-msys2, awesome-design-tokens. Searches returned nothing usable.
- Confirm exact repository URLs flagged "verify".
