# Linux to Windows cross-build results (2026-10-25)

Proof run of `tools/cross/windows.ts` on the VPS (Ubuntu 26.10, 12 cores, shared with other build
lanes, load average 24-34, `-j 4`/`-j 6`). Toolchain and research: [`docs/research/cross-windows-2026.md`](../research/cross-windows-2026.md).

## Environment

| Item | Value |
| --- | --- |
| C/C++ toolchain | llvm-mingw 20261020 UCRT (LLVM 23.1.4), `~/.local/opt/llvm-mingw`, sha256 `55064b60…e335` verified |
| Rust | `nightly-2026-09-15` (Bun UI pin), `1.93` (COSMIC pin); targets `x86_64-` and `aarch64-pc-windows-gnullvm` |
| Sysroot | quasi-msys2 `00a2b1645c1e`, MSYS2 CLANG64, 99 packages, 1.3 GB in `~/build/win-sysroot/quasi-msys2/root` (+177 MB package cache): GTK 4.24.1, libadwaita 1.10.0, GLib 2.90.1, Qt 6.12.0, libc++/libunwind 23.1.3 |
| Wine | 10.0 (Ubuntu), private Xvfb display per smoke run, prefix `~/build/win-cross/wineprefix` |
| Packaging | NSIS 3.10, msitools/wixl 0.106, osslsigncode, zip |
| MSVC ABI | not enabled: `cargo-xwin` is present but the Microsoft license gate (`BUNUI_MSVC_ACCEPT_LICENSE`) is unset; no SDK downloaded |
| Cargo | `CARGO_HOME=~/build/win-cross/cargo-home` (shared `git/` and `registry/`, own lock) because sandboxed jobs held the default package-cache lock |

## Results

| Target | Build | Bundle | Wine smoke |
| --- | --- | --- | --- |
| `aphrody-m3-emit` (`m3-emit`), x86_64 gnullvm | ok, 44 s cold / 18 s with sysroot | single exe (606 KB), only UCRT API sets + kernel32/ntdll | **PASS** `--expect-exit`: `--target gtk`/`css` print the M3 theme |
| `aphrody-m3-emit`, aarch64 gnullvm | ok (PE32+ ARM64) | n/a | not run (no Arm64 Wine on x86_64) |
| `aphrody-m3-egui` gallery (eframe, wgpu), x86_64 | ok, 4 min 10 s cold | 0 extra DLLs, 18 MB, zip 6.2 MiB | **FAIL as shipped**: panics on the first frame, `Failed to find Name("title-large") in Style::text_styles`; not a Windows issue (the example installs the M3 style in `logic()` after the first `ui()` reads it). An untracked probe that installs the theme from the `CreationContext` runs: **PASS** with `WGPU_BACKEND=gl` and `vulkan` (lavapipe), screenshot shows the full gallery. Default DX12 backend: `RequestDeviceError(Device(Lost))` under Wine. |
| `aphrody-m3-gtk` gallery (gtk4-rs 0.11 + libadwaita 0.9 against MSYS2), x86_64 | ok, 6 min 38 s (pkg-config sysroot wiring) | 62 DLLs + pixbuf loaders, compiled schemas, Adwaita/hicolor icons, settings.ini: 80 MB, zip 28.7 MiB | **PASS** (`GSK_RENDERER=cairo`, alive 40 s), screenshot shows the M3 navigation rail and buttons. Text glyphs are garbled because the Wine prefix has no Segoe UI / matching font (Wine font issue, not GTK). Repeated `gdk_frame_clock_presented` criticals from Wine's DWM timing. |
| GTK installers | NSIS 17.5 MiB, MSI 29.9 MiB (wixl, per-user) | | both install silently under Wine (`setup.exe /S`, `msiexec /i … /qn`) |
| `aphrody-m3-qt` (cxx-qt 0.10 against MSYS2 Qt 6.12), x86_64 | **fails in first-party code**: `cxx-qt` and `cxx-qt-lib` C++ (moc 6.12 through Wine) compile and link setup resolves `Qt6Core/Gui/Qml` from the sysroot; then `aphrody-m3-qt`'s build script stops with `error[cxxqt]: Method with name set_dark not found!` (`src/scheme.rs:36`, `WRITE = set_dark`). cxx-qt-gen raises this while parsing the Rust source, so it is target-independent; a separate qtfix lane is working on the crate. | n/a | n/a |
| Qt 6.12 Widgets hello (C++, `pkg-config Qt6Widgets`), x86_64 | ok, 4 s | 31 DLLs + platforms/styles/imageformats/iconengines/tls + qt.conf: 83 MB, zip 31.6 MiB | **FAIL under Wine only**: `unimplemented function mscms.dll.WcsCreateIccProfile, aborting` (Qt 6.12's Windows screen colour-profile code; also with `QT_QPA_PLATFORM=offscreen`). Needs a Wine with that mscms entry point or real Windows 11. |
| `cosmic-edit` (upstream `4ac1cc8`), `--no-default-features --features wgpu` | **fails**: libcosmic `430f3d48` (winit, wgpu, tokio, multi-window, about, surface-message) compiles for gnullvm, then `cosmic-files` (git `3cc4b80`) fails: `use std::os::unix::ffi::OsStrExt` in `src/mime_app.rs:11` is not cfg-gated. `cosmic-term` depends on the same `cosmic-files`. | n/a | n/a |
| libcosmic app (upstream `text-input` example in a scratch crate outside the repo, same libcosmic rev/features) | ok, 8 min 33 s | 1 DLL (libunwind), 24 MB, zip 8.9 MiB | **PASS** with `WGPU_BACKEND=gl` and `vulkan`; screenshot shows the COSMIC header bar and text inputs |
| Meson (`meson-cross`) and CMake (`windows-llvm-mingw.cmake`) | ok: a GLib C probe configures through the sysroot pkg-config with both | | prints `glib 2.90` under Wine |

## What blocks what

- egui gallery: fix the example to install the theme before the first frame (for example in the
  `run_native` creation closure). Not changed here.
- aphrody-m3-qt: the cxx-qt 0.10 `WRITE = set_dark` declaration; once it builds natively the same
  cross path applies (`QMAKE` points at the generated `target/cross/qmake-x86_64`).
- Qt GUI under Wine: Wine lacks `mscms.WcsCreateIccProfile`; qualify Qt bundles on Windows 11.
- cosmic-edit/cosmic-term: `cosmic-files` needs a `#[cfg(unix)]` gate (upstream patch); libcosmic
  itself is Windows-ready with the feature set above (no `a11y`, `wayland`, `dbus-config`,
  `xdg-portal`, `single-instance`).
- Wayland compositors (Hyprland, cosmic-comp) do not target Windows; see the research doc for the
  WSLg-style alternative.

## Reproduce

```sh
bun run cross:setup -- --apt          # pins from tools/cross/toolchain.json
bun run cross:doctor
bun tools/cross/windows.ts build --crate aphrody-m3-gtk --example gallery --release
bun tools/cross/windows.ts bundle --exe target/x86_64-pc-windows-gnullvm/release/examples/gallery.exe --name m3-gtk-gallery
bun tools/cross/windows.ts smoke --exe dist/m3-gtk-gallery-windows-x86_64/gallery.exe --env GSK_RENDERER=cairo --screenshot /tmp/gtk.png
bun tools/cross/windows.ts installer --dist dist/m3-gtk-gallery-windows-x86_64 --version 0.1.0 --msi
```

Logs and screenshots of this run: `~/build/win-cross/*.log`, `~/build/win-cross/shots/*.png` on the VPS.
