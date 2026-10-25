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
| `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml` | Root Cargo workspace (resolver 3, edition 2024, Bun OS nightly) |
| `package.json`, `bun.lock`, `bunfig.toml`, `tsconfig.json` | Root Bun workspace (`packages/*`, `apps/*`) and its catalog |
| `crates/` | First-party Rust crates, one direct child per crate, all members of the root workspace |
| `packages/` | First-party Bun/TypeScript packages, one direct child per package |
| `apps/` | Showcases and qualification apps |
| `tools/` | Benchmarks and generators |
| `catalog/conversion.toml` | Colors, tokens, components and APIs per host |
| `upstream/<group>/<name>` | Pinned upstream sources as Git submodules |
| `upstream.json` | Machine-readable upstream inventory: URL, branch, commit, license |

Rust crates:

| Crate | Role |
| --- | --- |
| `aphrody-m3-tokens` | Color science (HCT, dynamic color) and M3 tokens; the only resolver |
| `aphrody-m3` | Component and layout contracts |
| `aphrody-m3-emit` | Host theme emitters (GTK, Qt, COSMIC, KDE, WinUI, Hyprland, CSS, DTCG) |
| `aphrody-m3-egui`, `aphrody-m3-iced`, `aphrody-m3-bevy` | Tier A host adapters (iced includes the cosmic-theme bridge) |
| `aphrody-m3-gtk`, `aphrody-m3-qt` | Native adapters: GTK 4/libadwaita and Qt 6 through cxx-qt |
| `aphrody-m3-wasm` | wasm-bindgen build of the color engine and emitters (`packages/m3-wasm`) |
| `aphrody-native-shell` | One app lifecycle API over eframe, winit, bevy and tauri |
| `bun-ui-layout` | CSS subset laid out by Taffy for bevy_ui and egui |
| `bun-ui-convert` | Constrained TSX/CSS to GtkBuilder, QML and egui |
| `aphrody-render`, `aphrody-m3-reproduce`, `craft-ui`, `libm3`, `libm3-wasm` | Imported from Bun OS |

`cargo check --all-targets` covers the default members. `aphrody-m3-qt` needs a
system Qt 6 and is built explicitly with `cargo check -p aphrody-m3-qt`.

### External workspace dependencies

Some imported packages depend on Bun OS workspace packages that are not part
of Bun UI. They resolve to the published npm releases (1.4.7) instead of
`workspace:*` and are not vendored: `@aphrody/ag-ui` (m3-showcase),
`@aphrody/bun` (m3), `@aphrody/bun-web` (web-to-tauri), `@aphrody/drive-client`,
`@aphrody/fuzzy`, `@aphrody/product`, `@aphrody/qr`, `@aphrody/webos-wasm`
(app-ui), `@aphrody/paths` (identity), and through the catalog
`@aphrody/tauri` and `@aphrody/material-web` (3.3.3). On the Rust side
`aphrody-identity` comes from crates.io, with `aphrody-m3-tokens` patched to
the local crate. TODO: switch each back to `workspace:*` or a path dependency
when its owner moves into Bun UI.

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
