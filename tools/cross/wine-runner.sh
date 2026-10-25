#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Cargo runner for *-pc-windows-gnullvm (`cargo run`/`cargo test` under Wine). DLLs resolve from
# WINEPATH, which tools/cross/windows.ts env points at the sysroot and llvm-mingw runtime.
set -euo pipefail
export WINEPREFIX="${WINEPREFIX:-$HOME/build/win-cross/wineprefix}" WINEDEBUG="${WINEDEBUG:--all}"
if [ -z "${DISPLAY:-}" ] && command -v xvfb-run >/dev/null; then
  exec xvfb-run -a wine "$@"
fi
exec wine "$@"
