# Linux to Windows 11 cross-compilation (October 2026)

Research behind `tools/cross/` (Bun UI). Goal: build every Bun UI host (pure Rust, egui/eframe,
GTK 4/libadwaita, Qt 6 through cxx-qt, libcosmic/iced) for Windows 11 x64 and Arm64 from the
Linux VPS, without Windows machines and without accepting the Microsoft MSVC/Windows SDK license.
Measured results live in [`docs/bench/cross-windows-results.md`](../bench/cross-windows-results.md).

## Decision

| Layer | Choice | Why |
| --- | --- | --- |
| C/C++ toolchain | **llvm-mingw 20261020 (LLVM 23.1.4, UCRT)**, pinned by sha256 | One Clang/LLD toolchain for x86_64, aarch64, i686 and armv7; UCRT by default; libc++/libunwind/compiler-rt; PDB output, CFG and ASan; no GCC/binutils. Fully redistributable (no Microsoft SDK). |
| Rust targets | **`x86_64-pc-windows-gnullvm`**, **`aarch64-pc-windows-gnullvm`** | Tier 2 with host tools; UCRT and LLVM runtime, the exact ABI of llvm-mingw and MSYS2 CLANG64/CLANGARM64. `-gnu` uses GCC/binutils and msvcrt-era assumptions and has no Arm64 target; `-msvc` needs the Microsoft SDK. |
| Library sysroot | **quasi-msys2** (pinned commit) materializing **MSYS2 CLANG64** packages | Thousands of prebuilt Windows libraries (GTK 4.24, libadwaita 1.10, Qt 6.12, GLib 2.90) built with the same LLVM/UCRT/libc++ ABI as llvm-mingw. No Wine needed to install. |
| MSVC ABI (opt-in) | cargo-xwin 0.23 / xwin, gated behind `BUNUI_MSVC_ACCEPT_LICENSE=1` | Only path to `*-pc-windows-msvc` from Linux; it downloads the MSVC CRT and Windows SDK and therefore requires the owner to accept the Microsoft license. Never enabled by default. |
| Smoke tests | Wine 10.0 (Ubuntu) + Xvfb | Runs x86_64 CLI and GUI binaries headless. Arm64 binaries need Windows on Arm (or an Arm64 Wine host). |
| Packaging | portable zip (default), **NSIS 3.10** (`makensis`), **MSI via msitools `wixl`** | All native on Linux. MSIX: `makemsix pack` from microsoft/msix-packaging builds on Linux; signing for sideloading still needs a trusted certificate. |
| Signing | **osslsigncode** | Authenticode for PE, MSI and CAB on Linux; certificate stays in a protected store (`BUNUI_SIGN_PKCS12`). |

## Toolchains

### llvm-mingw (mstorsjo)

- Latest release **20261020**, LLVM 23.1.4; cross toolchains for Ubuntu 22.04+ x86_64/aarch64 hosts,
  UCRT (primary) and msvcrt variants. Release assets carry GitHub `sha256:` digests; the pinned
  asset is `llvm-mingw-20261020-ucrt-ubuntu-22.04-x86_64.tar.xz`
  (`55064b60…e335`), verified before extraction by `windows.ts setup`.
- Benefits: Arm64 Windows (GCC does not target Windows on Arm), one toolchain for four
  architectures, PDB debug info, ASan/UBSan, Control Flow Guard (`-mguard=cf`).
- Known limits: llvm-rc is less complete than GNU windres; LLD has no COFF linker scripts;
  libtool C++ links need a patched libtool (MSYS2 ships one); objects and static libraries from
  GCC-based mingw toolchains do not mix (DLLs do, if CRT resources are not shared).
- Source: <https://github.com/mstorsjo/llvm-mingw>, release
  <https://github.com/mstorsjo/llvm-mingw/releases/tag/20261020>.

### Rust: gnullvm vs gnu vs msvc

- `*-windows-gnullvm` (x86_64, aarch64: tier 2 with host tools; i686: tier 2) uses UCRT and LLVM
  tools/libraries instead of GCC/binutils. It needs an LLVM-based C toolchain (llvm-mingw or MSYS2
  CLANG*) with a static libunwind; binaries run on Windows and under Wine. Source:
  <https://doc.rust-lang.org/nightly/rustc/platform-support/windows-gnullvm.html>.
- `*-windows-gnu`: x86_64/i686 only, GCC runtime (libgcc, winpthreads), mixes poorly with
  LLVM-built libraries; no Arm64.
- `*-windows-msvc` via **cargo-xwin** (0.23.1, Aug 2026): drives clang-cl/lld-link (or clang with
  `windows-msvc-sysroot`) and downloads the CRT + SDK through xwin. Its README states that using it
  means accepting <https://go.microsoft.com/fwlink/?LinkId=2086102>; xwin requires
  `--accept-license` / `XWIN_ACCEPT_LICENSE=1`. Sources: <https://github.com/rust-cross/cargo-xwin>,
  <https://docs.rs/xwin/latest/xwin/>, <https://crates.io/crates/cargo-xwin>.
- Bun UI policy: gnullvm by default. `bun tools/cross/windows.ts msvc …` refuses (exit 3) unless the
  owner exports `BUNUI_MSVC_ACCEPT_LICENSE=1`; it then runs `cargo xwin` with a cache outside the
  repository. No SDK has been downloaded on the VPS.

### quasi-msys2 (HolyBlackCat)

- Imitates MSYS2 on Linux: a small Makefile package manager downloads and verifies MSYS2 packages
  into `root/<msystem>`; `env/all.src` wires Clang, pkg-config, CMake, Meson and Rust. Pinned
  commit `00a2b1645c1e` (2026-10-04, multi-pattern `fakebin.mk` for Qt executables). Zlib license.
- Environments selected with `msystem.txt`; CLANG64 locks the native Clang major to MSYS2's, which
  is why Bun UI drives the sysroot with llvm-mingw (LLVM 23.1.4 against MSYS2 libc++ 23.1.3) instead
  of `env/all.src` and the distro Clang. CLANGARM64 is "not tested" upstream.
- Caveats: pre/post-install hooks are not run (Bun UI recompiles GSettings schemas and copies
  `loaders.cache` itself), version-exact dependency pins are not enforced, no locking.
- Source: <https://github.com/HolyBlackCat/quasi-msys2>, MSYS2 environments
  <https://www.msys2.org/docs/environments/>.

### Alternatives considered

- **MXE**: still maintained (build matrix lists Qt 6.12.0, GTK stack, LLVM 23.1.3 package), but it
  builds every library from source with GCC mingw-w64 (static or shared), x86 only, no Arm64, hours
  of builds per update. Useful for fully static Qt; not chosen. <https://mxe.cc/build-matrix.html>,
  <https://github.com/mxe/mxe>.
- **gvsbuild** (wingtk): builds GTK with Visual Studio on Windows; the gtk4-rs book's recommended
  path for MSVC. Requires Windows + MSVC, so it is out of scope for Linux cross builds (kept pinned
  in `upstream/windows/gvsbuild` for reference). <https://github.com/wingtk/gvsbuild>,
  <https://gtk-rs.org/gtk4-rs/stable/latest/book/installation_windows.html>.
- **cargo-zigbuild**: good for pure Rust `-gnu`, but no libc++ ABI match with MSYS2 C++ libraries.

## Toolkits on Windows

### GTK 4 / libadwaita (gtk4-rs)

- MSYS2 ships `gtk4` 4.24.1, `libadwaita` 1.10.0, `gtksourceview5`; gtk4-rs documents MSYS2 + GNU
  toolchain as the non-MSVC route. GTK upstream recommends MSYS2 or gvsbuild and documents the
  bundle: `glib-compile-schemas share/glib-2.0/schemas`, icon themes (Adwaita + hicolor),
  `etc/gtk-4.0/settings.ini`. <https://www.gtk.org/docs/installations/windows>.
- Runtime layout the bundler produces: exe + DLLs at the root, `lib/gdk-pixbuf-2.0/2.10.0/loaders`
  with `loaders.cache`, `share/glib-2.0/schemas/gschemas.compiled`, `share/icons/{Adwaita,hicolor}`,
  `share/gtksourceview-5` when linked, `etc/gtk-4.0/settings.ini`.
- Renderers: GTK 4.16+ defaults to the GL/Vulkan "ngl"; under Wine without a GPU use
  `GSK_RENDERER=cairo` for smoke tests.

### Qt 6 (MinGW / llvm-mingw, cxx-qt)

- MSYS2 CLANG64 ships Qt 6.12.0 (`qt6-base`, `qt6-declarative`, `qt6-svg`, `qt6-shadertools`).
  MXE also ships 6.12.0 (GCC). Qt's own binary installers only provide MinGW GCC and MSVC kits.
- Cross builds need host tools of the same Qt version (moc, rcc, qmlcachegen,
  qmltyperegistrar). CMake uses `QT_HOST_PATH`; cxx-qt (`qt-build-utils`) asks
  `qmake -query`, honouring the `QMAKE` env var. <https://kdab.github.io/cxx-qt/book/concepts/build_systems.html>,
  <https://doc.qt.io/qt-6/qmake-environment-reference.html>.
- Bun UI ships `tools/cross/qmake-cross.sh`, a `qmake -query` stand-in that answers with the sysroot
  layout (`include/qt6`, `lib`, `share/qt6/plugins`, `share/qt6/qml`) and exposes either MSYS2's
  exact-version tools through Wine (default) or the host's tools (`BUNUI_QT_HOST_TOOLS=native`; the
  VPS has Qt 6.11.2, one minor behind the sysroot).
- Deployment: `plugins/platforms/qwindows.dll` is mandatory; styles, imageformats, iconengines,
  tls; `qml/` modules for Qt Quick; `qt.conf` (`Plugins = plugins`, `QmlImports = qml`).

### libcosmic / iced (winit)

- iced runs natively on Windows (winit + wgpu DX12/Vulkan, tiny-skia fallback).
- libcosmic: Windows builds track `pop-os/libcosmic#1152` (open since 2026-03): accesskit/a11y
  breaks on Windows, Linux-only features (`wayland`, `dbus-config`, `xdg-portal`,
  `single-instance`, `desktop`) must be disabled; reports of success with
  `default-features = false, features = ["winit", "tokio", "wgpu", "multi-window"]`.
  COSMIC apps (cosmic-edit, cosmic-term) enable Linux features by default and have open Windows
  build issues (`pop-os/cosmic-term#222`). Measured here: libcosmic `430f3d48` with that feature
  set builds for `x86_64-pc-windows-gnullvm` and runs under Wine; cosmic-edit/cosmic-term stop in
  `cosmic-files` (an ungated `std::os::unix` import). <https://github.com/pop-os/libcosmic/issues/1152>,
  <https://github.com/pop-os/cosmic-term/issues/222>.

### egui / eframe

- eframe on Windows uses winit + wgpu (DX12/Vulkan) or glow (WGL). Pure Rust: no sysroot needed.
  Under Wine headless, wgpu needs a Vulkan ICD (lavapipe) or falls back to GL through WGL ->
  Mesa llvmpipe; smoke tests count "alive after N seconds" as a pass.

### Wayland compositors / Hyprland

Wayland compositors (Hyprland, cosmic-comp, Mutter, KWin) depend on DRM/KMS, libinput, udev and
Linux kernel interfaces; they cannot target Windows natively. The supported pattern is the WSLg
model: run the compositor (or a nested Weston/Hyprland session) inside a Linux VM or WSL 2, and
present to Windows through RDP/RAIL (WSLg's Weston + FreeRDP) or a VNC/Waypipe bridge. Bun UI
apps that need Windows-native windows use the winit/GTK/Qt builds above instead.

## Smoke testing with Wine

- Wine 10.0 (Ubuntu 26.10). `windows.ts smoke` sets `WINEPREFIX` outside the repo, `WINEDEBUG=-all`,
  `WINEPATH` (sysroot `bin/` for unbundled exes), runs under `xvfb-run` without a display, and kills
  `wineserver` after the timeout. CLI tools use `--expect-exit`; GUI apps pass when still alive at
  the timeout.
- Limits: no Arm64 emulation on x86_64 hosts; DX12 needs vkd3d + a Vulkan driver; Wine is a
  compatibility check, not Windows 11 qualification.

## Packaging and signing

- **Portable zip**: `windows.ts bundle` resolves imports recursively with `llvm-objdump -p`
  (mingw-ldd equivalent, no Wine), skips API sets and Windows system DLLs, copies toolkit data,
  writes `bundle.json` and zips the folder.
- **NSIS 3.10**: `windows.ts installer` writes an `.nsi` (per-user `%LOCALAPPDATA%\Programs` by
  default, `--machine` for Program Files), Start menu shortcut, uninstaller and Uninstall registry
  entry, and runs `makensis`. <https://nsis.sourceforge.io/>.
- **MSI**: `--msi` harvests files with `wixl-heat` and builds with `wixl` (msitools 0.106, WiX 3
  subset; per-user or per-machine, x64/arm64). <https://wiki.gnome.org/msitools>.
- **MSIX**: `makemsix pack -d <dir> -p <pkg>` (MSIX SDK 1.7+, buildable on Linux with
  `./makelinux.sh --pack`). Packages must be signed with a certificate the target trusts;
  signing MSIX on Linux is not supported by osslsigncode, so sign on a Windows agent (signtool) or
  publish through the Store. Not wired yet. <https://learn.microsoft.com/en-us/windows/msix/msix-sdk/msix-linux>,
  <https://learn.microsoft.com/en-us/windows/msix/msix-sdk/release-notes/sdk-release-notes-1.7>,
  <https://github.com/microsoft/msix-packaging>.
- **Authenticode**: `windows.ts sign --file X` runs `osslsigncode sign -pkcs12 … -h sha256 [-ts URL]`
  with `BUNUI_SIGN_PKCS12`, `BUNUI_SIGN_PASSFILE`, `BUNUI_SIGN_TIMESTAMP_URL`. <https://github.com/mtrojnar/osslsigncode>.

## Licenses

llvm-mingw (ISC wrapper scripts; LLVM Apache-2.0 WITH LLVM-exception; mingw-w64 ZPL/public domain
headers and CRT), quasi-msys2 (Zlib), MSYS2 packages (each upstream license: GTK/GLib LGPL-2.1+,
Qt LGPL-3/GPL, libadwaita LGPL-2.1+). Bundles redistribute LGPL DLLs dynamically linked; ship the
license files from `share/licenses/<pkg>` with releases. No Microsoft SDK components are used.
