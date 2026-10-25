# Bun UI workspace

- Read `README.md` first. Keep documentation and collaboration in English.
- One Material 3 contract: tokens and color science in `crates/aphrody-m3-tokens`,
  component contracts in `crates/aphrody-m3`, host adapters per toolkit. Never fork
  a parallel palette or component model per host.
- Upstream sources live only under `upstream/<group>/<name>` as pinned submodules
  and are listed in `upstream.json`. Never edit upstream code in place; carry
  patches in the first-party adapter or a recorded patch set.
- Preserve every upstream license, notice and history.
- Builds, clones of large upstreams and qualification run on the VPS
  (`~/src/bun-ui`). Do not initialize Qt, GNOME, KDE or MSYS2 submodules on the
  Windows workstation. Do not start WSL on the workstation.
- Use Bun 1.4.4+ native commands (`bun check`, `bun lint`, `bun fmt`) and the
  serialized Cargo wrapper. Do not add or run tests unless the owner asks.
- Commit as `aphrody-dev <contact@aphrody.com>` without co-authors. Fetch and
  verify ancestry before pushing. Never force-push. No new Git worktrees.
