# SPDX-License-Identifier: Apache-2.0
# CMake toolchain: Linux -> Windows (llvm-mingw, UCRT) with the optional MSYS2 CLANG64/CLANGARM64
# sysroot from quasi-msys2. Paths come from the environment that `bun tools/cross/windows.ts env`
# prints; nothing here names a workstation path.
#
#   cmake -G Ninja -DCMAKE_TOOLCHAIN_FILE=tools/cross/cmake/windows-llvm-mingw.cmake \
#         [-DBUNUI_CROSS_ARCH=aarch64] -S . -B build-win

set(CMAKE_SYSTEM_NAME Windows)
set(CMAKE_SYSTEM_VERSION 10.0)

if(NOT BUNUI_CROSS_ARCH)
  if(DEFINED ENV{BUNUI_CROSS_ARCH})
    set(BUNUI_CROSS_ARCH "$ENV{BUNUI_CROSS_ARCH}")
  else()
    set(BUNUI_CROSS_ARCH x86_64)
  endif()
endif()
set(CMAKE_SYSTEM_PROCESSOR ${BUNUI_CROSS_ARCH})
if(BUNUI_CROSS_ARCH STREQUAL "aarch64")
  set(_msys clangarm64)
else()
  set(_msys clang64)
endif()
set(_triple ${BUNUI_CROSS_ARCH}-w64-mingw32)

if(DEFINED ENV{BUNUI_LLVM_MINGW})
  set(BUNUI_LLVM_MINGW "$ENV{BUNUI_LLVM_MINGW}")
else()
  set(BUNUI_LLVM_MINGW "$ENV{HOME}/.local/opt/llvm-mingw")
endif()
if(DEFINED ENV{BUNUI_WIN_SYSROOT})
  set(BUNUI_WIN_SYSROOT "$ENV{BUNUI_WIN_SYSROOT}")
else()
  set(BUNUI_WIN_SYSROOT "$ENV{HOME}/build/win-sysroot/quasi-msys2/root")
endif()
set(BUNUI_WIN_PREFIX "${BUNUI_WIN_SYSROOT}/${_msys}")

set(CMAKE_C_COMPILER "${BUNUI_LLVM_MINGW}/bin/${_triple}-clang")
set(CMAKE_CXX_COMPILER "${BUNUI_LLVM_MINGW}/bin/${_triple}-clang++")
set(CMAKE_RC_COMPILER "${BUNUI_LLVM_MINGW}/bin/${_triple}-windres")
set(CMAKE_AR "${BUNUI_LLVM_MINGW}/bin/llvm-ar" CACHE FILEPATH "")
set(CMAKE_RANLIB "${BUNUI_LLVM_MINGW}/bin/llvm-ranlib" CACHE FILEPATH "")

if(EXISTS "${BUNUI_WIN_PREFIX}/lib")
  set(CMAKE_SYSROOT "${BUNUI_WIN_PREFIX}")
  set(CMAKE_FIND_ROOT_PATH "${BUNUI_WIN_PREFIX}")
  set(CMAKE_PREFIX_PATH "${BUNUI_WIN_PREFIX}")
  set(ENV{PKG_CONFIG_SYSROOT_DIR} "${BUNUI_WIN_SYSROOT}")
  set(ENV{PKG_CONFIG_LIBDIR} "${BUNUI_WIN_PREFIX}/lib/pkgconfig:${BUNUI_WIN_PREFIX}/share/pkgconfig")
  set(ENV{PKG_CONFIG_PATH} "")
  # Qt 6 cross builds need host tools of the same version (moc, rcc, ...). Point QT_HOST_PATH at a
  # host Qt prefix when one exists; otherwise use the qmake-cross.sh Wine wrappers.
  if(DEFINED ENV{BUNUI_QT_HOST_PATH})
    set(QT_HOST_PATH "$ENV{BUNUI_QT_HOST_PATH}" CACHE PATH "")
  endif()
endif()

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
set(CMAKE_CROSSCOMPILING_EMULATOR wine)
