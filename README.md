# Bun UI

Bun UI is the low-level, cross-platform UI stack of Bun OS. It sits beside the
Bun runtime fork (`aphrody-labs/bun`) and the Bun OS distribution
(`aphrody-labs/bun-distribution`). One Material 3 token, theme and component
contract feeds every host:

- web and WebAssembly (TS/CSS/JSX, Base UI, material-web);
- Rust toolkits: bevy_ui, egui, libcosmic/iced, gtk4-rs, Qt 6 through cxx-qt;
- native toolkits: GTK 4/libadwaita, Qt 6/Kirigami, Win32/WinUI;
- shells and sessions: Wayland, Hyprland, GNOME Shell, KDE Plasma, COSMIC,
  Arch Linux on bare metal, in WebAssembly and on Win32 (MSYS2).

## Layout

| Path | Owner |
| --- | --- |
| `crates/` | First-party Rust crates, one direct child per crate |
| `packages/` | First-party Bun/TypeScript packages, one direct child per package |
| `apps/` | Showcases and qualification apps |
| `tools/` | Converters and generators (TS/CSS/JSX to GTK, Qt, egui, bevy_ui) |
| `upstream/<group>/<name>` | Pinned upstream sources as Git submodules |
| `upstream.json` | Machine-readable upstream inventory: URL, branch, commit, license |

Upstream groups: `gnome` (GTK, GLib, GNOME Shell, Mutter, build tools),
`qt` (Qt nightly and Rust bindings), `kde` (KDE Frameworks, Plasma, build
tools), `rust` (egui, winit, wgpu, bevy, libcosmic, iced and their plugins),
`wayland` (Wayland, wlroots, Hyprland), `os` (Arch, Omarchy, CachyOS,
Bazzite, gaming), `windows` (MSYS2 runtime and packages, windows-rs) and
`wasm` (Linux and Wayland in WebAssembly).

Upstream sources keep their own licenses, notices and histories. First-party
code states its license in each file or package manifest.

Builds and qualification run on the VPS. The Windows workstation edits and
synchronizes sources and does not initialize the large upstream submodules.
