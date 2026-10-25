# Exa verification pass (2026-10-25)

Exa review of 140 sources across 3 subagents, filling gaps left by the deep-research run.

## Theming APIs used by `aphrody-m3-emit` and `catalog/conversion.toml`

| Host | Verified | Changed or contradicted |
| --- | --- | --- |
| libadwaita | `--accent-bg-color`, `--accent-color`, `--accent-fg-color` (1.8 docs); `AdwStyleManager:accent-color` since 1.6; `AdwBottomSheet` 1.6; `AdwToggleGroup` 1.7 | `--window-bg-color` / `--card-bg-color` not confirmed in fetched docs; CSS accent overrides do not change what `AdwStyleManager` reports |
| Qt 6.8-6.10 | `Material.roundedScale`, `Material.containerStyle` (6.5), `QStyleHints::colorScheme` (6.5, setter 6.8), `QPalette::accent()` (6.6) | No Material changes in 6.10 |
| COSMIC | cosmic-config, one RON file per builder field | Builder schema is now `v2`; `is_dark` removed; `accent` takes `Option<Rgb>` — emitter updated to `v2` |
| egui 0.32-0.36 | `Visuals.widgets`, `selection`, `window_corner_radius`, `menu_corner_radius`; `Modal` (0.30); `ThemePreference` | No bare `Visuals.corner_radius`; 0.34 renamed `Context::style` to `global_style` and split `App::update` into `logic`/`ui` |
| WinUI 3 / WinAppSDK 1.7 | `TitleBar`, `CardBackgroundFillColorDefaultBrush`, `SystemAccentColor` | `AccentFillColorDefaultBrush` only found in third-party docs |

Sources: libadwaita docs <https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1.8/styles-and-appearance.html>, Qt <https://doc.qt.io/qt-6.10/qtquickcontrols-material.html>, libcosmic <https://github.com/pop-os/libcosmic/blob/66263a76/cosmic-theme/src/model/theme.rs>, egui 0.34 <https://github.com/emilk/egui/releases/tag/0.34.0>, WinAppSDK 1.7 <https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/release-notes/windows-app-sdk-1-7>.

## Compositor and shell in WebAssembly and on Windows

- Greenfield runs Wayland in the browser: remote apps stream H.264 over WebSocket; wasm clients use an Emscripten SDK. Only core + xdg-shell and SHM buffers; no sound or WebGL clients (<https://github.com/udevbe/greenfield>, FOSDEM 2024).
- WSLg is the working Windows path: unmodified Weston with the RDP backend, RAIL/VAIL window remoting to mstsc/msrdc (<https://github.com/microsoft/wslg>).
- Native Wayland compositors on Windows are research only (smithay-universal fork, WSLg discussion 1510).
- Qt for WebAssembly has no Wayland: each container element is a `QScreen`; `exec()` needs Asyncify/JSPI (<https://doc.qt.io/qt-6/wasm.html>).
- Browser Linux desktops are emulation (WebVM 2.0/CheerpX, v86) or a native wasm kernel preview (LinuxOnTab 2.0); none is a Wayland compositor. No 2023+ primary source found for GTK 4 on wasm.

Decision: the browser WebOS shell is a wasm-native M3 compositor model (Greenfield-style protocol layer, Exo-style hosting of app runtimes); Win32 uses the same Rust shell on wgpu/Win32 plus a WSLg-style RDP path for Linux apps.

## Google desktop OS direction

| Item | Label | Source |
| --- | --- | --- |
| ChromeOS and Android combined on a common foundation | official (executives, 2025) | <https://www.androidauthority.com/google-combine-chrome-os-android-3577035/> |
| "Aluminium OS" (ALOS) Android-based PC OS; trusted testers late 2026, release 2028, ChromeOS phase-out 2034 | credible report (job listing, court filings) | <https://www.androidauthority.com/google-aluminium-os-timeline-3637655/> |
| Android 16 QPR3 connected-display desktop sessions: taskbar, freeform windows | official | <https://android-developers.googleblog.com/2026/03/android-devices-extend-seamlessly-to.html> |
| Desktop-first vs touch-first per-display modes | official (AOSP) | <https://source.android.com/docs/core/display/desktop-windowing> |
| Transparent caption bar with caption insets | official | <https://developer.android.com/develop/adaptive-apps/guides/support-desktop-windowing> |
| Large (1200-1600dp) and Extra-large (1600dp+) width classes | official | <https://developer.android.com/blog/posts/jetpack-window-manager-1-5-is-stable> |
| M3 Expressive: spring motion, flexible components | official | <https://blog.google/products-and-platforms/platforms/android/material-3-expressive-android-wearos-launch/> |

Shell takeaways: per-display desktop-first/touch-first modes; app content in a transparent caption bar with system window controls; 3-4 panes at Large/Extra-large widths; display metrics never cached; M3 Expressive springs for window and taskbar transitions.
