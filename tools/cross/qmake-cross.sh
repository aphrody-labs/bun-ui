#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# qmake stand-in for cross builds against the MSYS2 Qt 6 in the quasi-msys2 sysroot.
# cxx-qt-build / qt-build-utils only call `qmake -query [VAR]`; answer from the sysroot layout so
# headers and import libraries come from MSYS2 while moc/rcc/qmlcachegen run on the host.
#
#   BUNUI_QT_PREFIX       MSYS2 prefix (…/root/clang64), set by tools/cross/windows.ts env
#   BUNUI_QT_HOST_TOOLS   wine (default: MSYS2's own tools of the exact Qt version, run under Wine)
#                         or native (host tools from BUNUI_HOST_QT_LIBEXEC; must match the Qt minor)
# qt-build-utils calls qmake with env_clear(), so tools/cross/windows.ts env points QMAKE at a
# generated wrapper (target/cross/qmake-<arch>) that exports these variables first.
set -euo pipefail
prefix="${BUNUI_QT_PREFIX:?set BUNUI_QT_PREFIX (bun tools/cross/windows.ts env)}"
version="$(sed -n 's/^#define QT_VERSION_STR "\(.*\)"/\1/p' "$prefix/include/qt6/QtCore/qtcore-config.h" "$prefix/include/qt6/QtCore/qconfig.h" 2>/dev/null | head -n1 | tr -d '\r')"
[ -n "$version" ] || version="$(sed -n 's/^Version: //p' "$prefix/lib/pkgconfig/Qt6Core.pc" | tr -d '\r')"
mode="${BUNUI_QT_HOST_TOOLS:-wine}"
tools="${BUNUI_QT_TOOLS_DIR:-$HOME/build/win-cross/qt-host-$version-$mode}"

if [ ! -x "$tools/moc" ]; then
  mkdir -p "$tools"
  for t in moc rcc uic qmlcachegen qmltyperegistrar qmlimportscanner qmllint qmlformat qsb; do
    if [ "$mode" = native ]; then
      src="${BUNUI_HOST_QT_LIBEXEC:-/usr/lib/qt6/libexec}/$t"
      [ -x "$src" ] || src="$(command -v "$t" || true)"
      [ -n "$src" ] && ln -sfn "$src" "$tools/$t"
    else
      exe=""
      for d in "$prefix/share/qt6/bin" "$prefix/lib/qt6/bin" "$prefix/libexec/qt6" "$prefix/bin"; do
        [ -f "$d/$t.exe" ] && exe="$d/$t.exe" && break
      done
      [ -n "$exe" ] || continue
      cat >"$tools/$t" <<EOF
#!/usr/bin/env bash
# qt-build-utils runs tools with an empty environment; restore what Wine needs.
export PATH="\${PATH:-/usr/local/bin:/usr/bin:/bin}" HOME="\${HOME:-$HOME}"
export WINEPREFIX="\${WINEPREFIX:-$HOME/build/win-cross/wineprefix}" WINEDEBUG=-all
export WINEPATH="$prefix/bin"
exec wine "$exe" "\$@"
EOF
      chmod +x "$tools/$t"
    fi
  done
fi

query() {
  case "${1%/get}" in
    QT_VERSION) echo "$version" ;;
    QT_INSTALL_PREFIX | QT_INSTALL_ARCHDATA | QT_INSTALL_DATA | QT_SYSROOT) [ "$1" = QT_SYSROOT ] && echo "" || echo "$prefix" ;;
    QT_INSTALL_HEADERS) echo "$prefix/include/qt6" ;;
    QT_INSTALL_LIBS) echo "$prefix/lib" ;;
    QT_INSTALL_BINS) echo "$prefix/bin" ;;
    QT_INSTALL_LIBEXECS | QT_HOST_LIBEXECS | QT_HOST_BINS) echo "$tools" ;;
    QT_HOST_PREFIX | QT_HOST_DATA) echo "$prefix" ;;
    QT_HOST_LIBS) echo "$prefix/lib" ;;
    QT_INSTALL_PLUGINS) echo "$prefix/share/qt6/plugins" ;;
    QT_INSTALL_QML) echo "$prefix/share/qt6/qml" ;;
    QT_INSTALL_TRANSLATIONS) echo "$prefix/share/qt6/translations" ;;
    QT_INSTALL_DOCS) echo "$prefix/share/qt6/doc" ;;
    QMAKE_SPEC | QMAKE_XSPEC) echo "win32-clang-g++" ;;
    QMAKE_VERSION) echo "3.1" ;;
    *) return 1 ;;
  esac
}

if [ "${1:-}" = "-query" ]; then
  if [ -n "${2:-}" ]; then
    query "$2" || exit 1
  else
    for k in QT_SYSROOT QT_INSTALL_PREFIX QT_INSTALL_ARCHDATA QT_INSTALL_DATA QT_INSTALL_DOCS QT_INSTALL_HEADERS QT_INSTALL_LIBS QT_INSTALL_LIBEXECS QT_INSTALL_BINS QT_INSTALL_PLUGINS QT_INSTALL_QML QT_INSTALL_TRANSLATIONS QT_HOST_PREFIX QT_HOST_DATA QT_HOST_BINS QT_HOST_LIBEXECS QT_HOST_LIBS QMAKE_SPEC QMAKE_XSPEC QMAKE_VERSION QT_VERSION; do
      echo "$k:$(query "$k")"
    done
  fi
  exit 0
fi
if [ "${1:-}" = "-v" ] || [ "${1:-}" = "--version" ]; then
  echo "QMake version 3.1"
  echo "Using Qt version $version in $prefix/lib (Bun UI cross stand-in)"
  exit 0
fi
echo "qmake-cross.sh: only -query is supported" >&2
exit 2
