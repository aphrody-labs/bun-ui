# Wayland on Windows, in WebAssembly, and Hyprland portability: issue and PR survey

Date: 2026-10-25. Method: `gh search issues/prs`, GitHub REST, and the freedesktop GitLab REST API (anonymous; MR/issue comment threads on GitLab need auth, so GitLab maintainer stances below come from titles, descriptions and states only, and are marked as such). Nothing here was built or run. "Inference" marks my reasoning, not a maintainer statement.

Targets: (A) Windows-native compositor over AF_UNIX without SCM_RIGHTS, using shared file mappings; (B) Hyprland-compatible config/IPC layer; (C) wasm WebOS compositor.

## 1. Ground facts

- Windows AF_UNIX has no ancillary data: no SCM_RIGHTS, no SOCK_DGRAM, no socketpair, no autobind ([MS devblog 2017](https://devblogs.microsoft.com/commandline/af_unix-comes-to-windows/)). WSL<->Win32 interop also lacks ancillary data ([MS devblog 2019](https://devblogs.microsoft.com/commandline/windowswsl-interop-with-af_unix/)). So wl_shm, keymap, clipboard and dmabuf fds cannot be sent as-is.
- Wayland book: all known implementations use a Unix socket because of fd passing; "a different transport is possible, but someone would have to figure out an alternative way of transferring bulk data" ([wire protocol](https://wayland-book.com/protocol-design/wire-protocol.html)). That is exactly our shared-file-mapping design; no upstream spec exists for it.
- No wasm/browser issue or PR exists in wayland-rs, wayland (GitLab) or Hyprland that proposes it (searches for wasm/webassembly returned nothing relevant). Only Greenfield does this today.

## 2. Findings by repository

### wayland/wayland (GitLab)
| Item | State | What it does | Stance / use for us |
|---|---|---|---|
| [MR !550](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/550) "Improve portability with systems that lack some of the APIs that wayland uses" | merged 2026-08-06 | Portability to platforms missing APIs libwayland uses (author jeremyhu, macOS-oriented) | Upstream now accepts non-Linux portability. Read the diff before forking libwayland. |
| [MR !380](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/380) "Add Darwin support" | open (updated 2026-08-07) | epoll-shim event loop, LOCAL_PEERPID, nonblocking wl_connection, Mach-O test fixes; consolidates !290, !303, !254 | Reviewer jeremyhu asked for consolidation. Template for a Windows port (replace epoll-shim with IOCP/WSAPoll). |
| [MR !508](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/508), [!290](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/290), [!254](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/254), [!303](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/303) | open | macOS build/tests, SOCK_CLOEXEC wrappers, itimerspec | Same series. |
| [Issue #545](https://gitlab.freedesktop.org/wayland/wayland/-/work_items/545) macOS/Darwin support; [#310](https://gitlab.freedesktop.org/wayland/wayland/-/work_items/310) wrap SOCK_CLOEXEC | open | Tracking | Still open: not accepted yet. |
| [MR !279](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/279) "meson: do not build under Windows and macOS" | closed 2023-02-21 | Author said "Not supported." | Title/description only; closure reason not retrievable without auth. No Windows port MR found at all. |
| [MR !142](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/142) macOS and BSD kqueue | closed 2021 | Earlier kqueue attempt | Superseded by epoll-shim approach. |
| [Issue #14](https://gitlab.freedesktop.org/wayland/wayland/-/work_items/14) timerfd/signalfd block non-Linux | closed 2024-12-14 | event-loop.c is sole consumer | Event loop is the single porting seam. |
| [#593](https://gitlab.freedesktop.org/wayland/wayland/-/work_items/593), [#586](https://gitlab.freedesktop.org/wayland/wayland/-/work_items/586), [MR !398](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/398) | open | wl_shm pool hazards (FUSE-backed fd freezes compositor; PROT_WRITE mapping; buffer storage lifetime) | A file-mapping substitute must keep the same SIGBUS/truncation safety; read these. |
| [MR !469](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/469) wl_shm multiplanar layout | open | Format clarifications | Informational. |

wl_shm alternatives: none proposed upstream (no issue found). Inference: implement a private shm provider (named file mapping handle by name in the message instead of fd) behind a feature flag in our own server and client shim.

### Smithay/wayland-rs
- [#832](https://github.com/Smithay/wayland-rs/issues/832) "support haiku and cygwin" (open, 2025-08-21). Reporter: nothing prevents a compositor; wayland-backend fails to build because there is no polling implementation (epoll/kqueue picked by feature). Maintainer-member ids1024: "I don't think Windows (or cygwin) have a way to pass file descriptors over a Unix domain socket? The Wayland protocol isn't really possible to implement without that"; notes libwayland assumes epoll and uses epoll-shim on BSDs; points at X547/wayland-server for Haiku. Stance: skeptical, not rejected. Use: the pure-Rust `rs_backend` is the best base; the work is a polling backend plus an fd-substitute abstraction.
- [#881](https://github.com/Smithay/wayland-rs/issues/881) better CI matrix across platforms (open, 2026-05-08). A hook for upstreaming a Windows CI job.
- No wasm issues.

### Smithay/smithay
- [#293](https://github.com/Smithay/smithay/issues/293) direct Wayland/X11 backends instead of winit (open). Drakulix (member): winit backend is fine for quick tests "like running anvil on windows/macos", but "should not be advertised" as a proper nested compositor. Use: a winit-based Windows presentation path is acceptable upstream as dev-grade.
- [#1204](https://github.com/Smithay/smithay/issues/1204) multiple windows in winit backend (open, i509VCB): expose raw winit events. Relevant for per-toplevel native windows.
- [#928](https://github.com/Smithay/smithay/issues/928) WGPU backend (open). i509VCB: wgpu lacks dmabuf import, buffer allocation, sync-fd export, colorspace APIs, so it is not suitable as a first-class Smithay renderer, but is usable as a guest renderer on top of GLES via wgpu-hal. Use: wgpu is the natural wasm/WebGPU path; keep it as a guest renderer over our own shm-texture upload.
- [#481](https://github.com/Smithay/smithay/issues/481) enhance non-Linux support in drm backend (open since 2022). Non-Linux is acknowledged but unfunded.
- [#1832](https://github.com/Smithay/smithay/issues/1832) anvil aborts when maximized in WSL2; [#2208](https://github.com/Smithay/smithay/issues/2208) nested winit compositors answer a frame late. Known winit-backend defects to expect.
- [J-x-Z/smithay-universal](https://github.com/J-x-Z/smithay-universal): "Research Artifact", fork for native macOS/Windows; macOS CGL/IOSurface + CFRunLoop calloop source done, Windows WGL "in progress", SIMD wl_shm swizzle, decoupled gbm/libinput; 0 stars, last push 2026-07-15; relicensed to GPLv3 (commit 2026-01-05) while upstream Smithay is MIT, and claims reference an unpublished paper. Use as a reading reference for gbm/libinput decoupling only; do not depend on it or copy code without a license decision. Treat its claims as unverified.
- [J-x-Z/win-way](https://github.com/J-x-Z/win-way): Windows display server, GPU window, TCP port 9999, custom "WPRD" frame protocol; self-reported: simple clients work, browsers crash on buffer allocation. Proof that a socket-without-fd bridge is possible, and a warning about buffer-allocation hot spots.

### hyprwm (Hyprland, aquamarine, hyprutils, hyprlang)
- Hyprland BSD ports: [PR #16495](https://github.com/hyprwm/Hyprland/pull/16495) OpenBSD patches (merged 2026-10-16, second batch), [PR #12298](https://github.com/hyprwm/Hyprland/pull/12298) FreeBSD startup crash (merged). Maintainers merge non-Linux Unix patches when small. Proxy for "portable enough".
- [hyprutils #18](https://github.com/hyprwm/hyprutils/issues/18) 0.2.4 won't build on Windows (fork(), signals) (closed 2024-11-10). Maintainer vaxerski: "I don't care". Explicit non-support of Windows.
- [Hyprland #6119](https://github.com/hyprwm/Hyprland/issues/6119) plugins in WebAssembly (closed 2024-05-17). vaxerski: "No, defeats the purpose of plugins... make your own plugin to provide such a dumb iface." Plugins (C++ shared libs) will not be wasm; a compat layer must reimplement, not host plugins.
- [aquamarine #16](https://github.com/hyprwm/aquamarine/issues/16) reopenDRMNode on FreeBSD (closed); [hyprlang #46](https://github.com/hyprwm/hyprlang/issues/46) FreeBSD build (closed). aquamarine is the backend abstraction (DRM, Wayland nested, headless). Its Wayland nested backend is live and buggy: [#348](https://github.com/hyprwm/aquamarine/issues/348) nested output never presents after first frame (open), [#398](https://github.com/hyprwm/aquamarine/issues/398) xdg_wm_base v6 vs v5 (closed 2026-09-28), [#439](https://github.com/hyprwm/aquamarine/issues/439) held keys on parent focus loss (closed). Headless: [#351](https://github.com/hyprwm/aquamarine/issues/351) frame delivery capped under software rendering (open).
- No project found that implements the Hyprland config (hyprlang) or hyprctl socket IPC in another compositor (searches returned nothing). Inference: a Hyprland-compatible layer is greenfield work in our tree: parse hyprlang syntax and serve the hyprctl JSON/socket2 event IPC ourselves; do not port Hyprland.

### pop-os/cosmic-comp
- [#2878](https://github.com/pop-os/cosmic-comp/issues/2878) software-only (virtual) outputs: prototype and questions (open, 2026-09-22). Notes that winit and X11 backends already create `Output` without DRM; transport (remote sinks) stays out of scope (separate executable per #584). Direct precedent for a Windows/wasm "virtual output" model.
- [#903](https://github.com/pop-os/cosmic-comp/issues/903) winit multitouch (open), [#2958](https://github.com/pop-os/cosmic-comp/issues/2958) tablet pad crash in pop-os/winit fork (open). Implication: COSMIC depends on a winit fork.
- [#1028](https://github.com/pop-os/cosmic-comp/issues/1028) Xwayland crash on FreeBSD (open). No Windows work.

### udevbe/greenfield (browser compositor)
- 1278 stars; last push 2025-11-02, last substantive commit 2025-10-15; effectively slow. HTML5 Wayland compositor: clients run on a Linux host, a proxy relays protocol over WebSocket to the browser.
- [#14](https://github.com/udevbe/greenfield/issues/14) rewrite app-endpoint-server in a native language (open): collaborator Zubnix says a future use case is "a binary that bridges between the Win32 Display API and Wayland API". Intent exists, nothing built.
- [#164](https://github.com/udevbe/greenfield/issues/164) xdg-desktop-portal wasm file picker, [#165](https://github.com/udevbe/greenfield/issues/165) wasm WPEWebKit in Greenfield, [#109](https://github.com/udevbe/greenfield/issues/109) WSL2 build, [#162](https://github.com/udevbe/greenfield/issues/162) Debian build failing (all open). Build rot risk.
- Use: reuse its browser-side protocol handling and canvas-per-surface ideas ([#137](https://github.com/udevbe/greenfield/issues/137) closed); its fd-less transport model proves shm contents can travel as bytes.

### microsoft/wslg and Weston
- WSLg = Weston RDP backend + RAIL. Open issues are crash-heavy: [#1523](https://github.com/microsoft/wslg/issues/1523) and [#1519](https://github.com/microsoft/wslg/issues/1519) Weston assert on Xwayland selection kills all GUI apps; [#1459](https://github.com/microsoft/wslg/issues/1459) rdprail SIGSEGV; [#1512](https://github.com/microsoft/wslg/issues/1512) no data-control protocol; [#1498](https://github.com/microsoft/wslg/issues/1498) 8 FPS due to system-memory readback; [#1349](https://github.com/microsoft/wslg/issues/1349) xdg_wm_base upgrade.
- Weston upstream: [MR !1667](https://gitlab.freedesktop.org/wayland/weston/-/merge_requests/1667) rebase RDP-RAIL support from Microsoft's mirror (open since 2025-05); [MR !2030](https://gitlab.freedesktop.org/wayland/weston/-/merge_requests/2030) `--vmconnect` Hyper-V RDP (merged 2026-04); [MR !1941](https://gitlab.freedesktop.org/wayland/weston/-/merge_requests/1941) RDP layout fidelity (merged); [!2138](https://gitlab.freedesktop.org/wayland/weston/-/merge_requests/2138) pointer to RDP clients (open).
- Use: a fallback, not the goal (requires a Linux VM, which the owner policy also forbids starting here). RDP-RAIL shows how remote per-window presentation maps to Win32 windows.

### waypipe (mstoeckl, GitLab)
- Proxy that forwards Wayland messages and serializes shm buffer changes over one socket; no fds on the wire, which is the same shape as our design. Rust code (panic at `tracking.rs` in [#167](https://gitlab.freedesktop.org/mstoeckl/waypipe/-/work_items/167)). No Windows/macOS/wasm issues found. Open items: [#100](https://gitlab.freedesktop.org/mstoeckl/waypipe/-/work_items/100) security implications, [#152](https://gitlab.freedesktop.org/mstoeckl/waypipe/-/work_items/152) Vulkan dmabuf requirement, [#133](https://gitlab.freedesktop.org/mstoeckl/waypipe/-/work_items/133) dmabuf crash >2000px. Use: borrow its message-rewrite design (fd -> byte stream with damage diffs) for the Windows/browser transports.

### wlroots
- No Windows/macOS work. RDP backend issues closed 2019-2020 (the backend was removed). Not a base.

## 3. Ranked actionable solutions

1. **Own fd-substitute transport on AF_UNIX/Winsock** (shared named file mappings, handle name in the message; byte-copy fallback à la waypipe). No upstream conflict; wayland-book explicitly leaves this open. Highest value, our own design.
2. **wayland-rs `rs_backend` (wayland-backend) + new Windows poll/fd layer**, upstream via [#832](https://github.com/Smithay/wayland-rs/issues/832) and CI via [#881](https://github.com/Smithay/wayland-rs/issues/881). Pure Rust avoids libwayland's epoll assumption.
3. **Smithay core (not DRM) with the winit backend** for presentation on Windows ([#293](https://github.com/Smithay/smithay/issues/293) says acceptable for dev); decouple gbm/libinput as smithay-universal shows.
4. **Waypipe's protocol-rewrite approach** for remote/browser/Windows clients.
5. **Greenfield browser-side code** as the wasm WebOS compositor starting point; vendor selectively, expect maintenance.
6. **Use libwayland Darwin MRs as the porting recipe** ([!380](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/380), [!550](https://gitlab.freedesktop.org/wayland/wayland/-/merge_requests/550) merged) if a C libwayland route is needed for client compatibility.
7. **Virtual/software outputs** (cosmic-comp [#2878](https://github.com/pop-os/cosmic-comp/issues/2878)) as the output abstraction for Windows windows and wasm canvases.
8. **wgpu as guest renderer** ([Smithay #928](https://github.com/Smithay/smithay/issues/928)) for Windows (D3D12/Vulkan) and wasm (WebGPU).
9. **Hyprland compat by reimplementation**: hyprlang syntax parser plus hyprctl/socket2 IPC server in our tree; do not port Hyprland (maintainer hostile to Windows and wasm plugins). Treat aquamarine's nested Wayland backend as a testing target (run real Hyprland nested under our compositor for IPC conformance).
10. **WSLg/Weston RDP** only as a Linux-side comparison fallback; not for the product.

## 4. Blockers stated by maintainers

- No SCM_RIGHTS on Windows AF_UNIX (Microsoft) and "protocol isn't really possible without that" (ids1024, wayland-rs #832).
- libwayland assumes epoll (ids1024); Darwin MRs still open after 2+ years (wayland MR !380/!508).
- Wayland MR !279 closed: Windows/macOS "Not supported" (description only; reason not read).
- vaxerski: "I don't care" about Windows build (hyprutils #18); rejects wasm plugins (Hyprland #6119, "defeats the purpose of plugins").
- Smithay: winit backend is not a proper nested compositor experience (Drakulix); wgpu not first-class (i509VCB); non-Linux DRM unfunded (#481).
- Greenfield slow maintenance since late 2025; open build failures.
- Browser has no AF_UNIX and no fd concept (inference): the wasm compositor must be in-process or use MessagePort/SharedArrayBuffer for shm.

## 5. Not verified

- GitLab comment threads (auth required); maintainers' reasons for closing !279 and the full discussion on !380.
- smithay-universal and win-way claims (README only, not built).
- Licenses of hyprlang, Greenfield and waypipe must be confirmed before reuse.
