#!/usr/bin/env bun
// SPDX-License-Identifier: Apache-2.0
// Linux -> Windows 11 cross-compilation for Bun UI (x86_64/aarch64-pc-windows-gnullvm).
//
//   bun tools/cross/windows.ts setup [--apt] [--sysroot all] install the pins from toolchain.json
//   bun tools/cross/windows.ts doctor                       check the toolchain, sysroot and helpers
//   bun tools/cross/windows.ts env [--target T] [--shell|--json]   print the cargo/cmake/meson env
//   bun tools/cross/windows.ts meson-cross [--target T]     write the machine paths meson cross file
//   bun tools/cross/windows.ts build --crate NAME [--bin B|--example E] [--target T] [--release]
//                                    [--features F] [--no-default-features] [--no-sysroot]
//                                    [--manifest-path P] [--target-dir D] [--abi gnullvm|msvc]
//                                    [-- extra cargo args]   (--abi msvc is license-gated, see msvc)
//   bun tools/cross/windows.ts bundle --exe PATH [--name N] [--target T] [--no-zip]
//   bun tools/cross/windows.ts installer --dist DIR [--name N] [--version V] [--msi] [--machine]
//   bun tools/cross/windows.ts sign --file PATH              osslsigncode with BUNUI_SIGN_* env
//   bun tools/cross/windows.ts smoke --exe PATH [--timeout S] [--expect-exit] [--env K=V,..]
//                                    [--screenshot PNG] [-- args]
//   bun tools/cross/windows.ts msvc [cargo args]             opt-in cargo-xwin path (license gate)
//
// T is x86_64 (default) or aarch64. Paths come from the environment, never from a fixed
// workstation layout:
//   BUNUI_LLVM_MINGW     llvm-mingw root            (default ~/.local/opt/llvm-mingw)
//   BUNUI_WIN_SYSROOT    quasi-msys2 root/ dir      (default ~/build/win-sysroot/quasi-msys2/root)
//   BUNUI_WINEPREFIX     smoke-test Wine prefix     (default ~/build/win-cross/wineprefix)
//   BUNUI_HOST_QT_LIBEXEC host Qt tools (moc, rcc, qmlcachegen) matching the sysroot Qt version
//   BUNUI_MSVC_ACCEPT_LICENSE=1  owner opt-in for the MSVC CRT / Windows SDK download (msvc only)

import { $ } from "bun";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { homedir } from "node:os";

type Arch = "x86_64" | "aarch64";

const REPO = resolve(import.meta.dir, "..", "..");
const CROSS = import.meta.dir;
const HOME = homedir();
const LLVM_MINGW =
  process.env.BUNUI_LLVM_MINGW ?? join(HOME, ".local/opt/llvm-mingw");
const SYSROOT =
  process.env.BUNUI_WIN_SYSROOT ??
  join(HOME, "build/win-sysroot/quasi-msys2/root");
const WINEPREFIX =
  process.env.BUNUI_WINEPREFIX ?? join(HOME, "build/win-cross/wineprefix");
// Debian/Ubuntu keep wineserver out of PATH.
const WINESERVER =
  Bun.which("wineserver") ??
  [
    "/usr/lib/x86_64-linux-gnu/wine/wineserver",
    "/usr/lib/wine/wineserver64",
    "/usr/lib/wine/wineserver",
    "/usr/libexec/wine/wineserver",
  ].find(existsSync) ??
  "wineserver";

const TRIPLE: Record<
  Arch,
  { rust: string; clang: string; msys: string; msystem: string; meson: string }
> = {
  x86_64: {
    rust: "x86_64-pc-windows-gnullvm",
    clang: "x86_64-w64-mingw32",
    msys: "clang64",
    msystem: "CLANG64",
    meson: "x86_64",
  },
  aarch64: {
    rust: "aarch64-pc-windows-gnullvm",
    clang: "aarch64-w64-mingw32",
    msys: "clangarm64",
    msystem: "CLANGARM64",
    meson: "aarch64",
  },
};

// DLLs that ship with Windows 10/11 (API sets, CRT forwarders, system libraries). Never bundled.
const SYSTEM_DLL =
  /^(api-ms-win-|ext-ms-)|^winspool.drv$|^(kernel32|kernelbase|ntdll|user32|gdi32|gdiplus|advapi32|shell32|shlwapi|ole32|oleaut32|comctl32|comdlg32|ws2_32|wsock32|mswsock|secur32|crypt32|bcrypt|bcryptprimitives|ncrypt|rpcrt4|winmm|imm32|dwmapi|uxtheme|version|setupapi|cfgmgr32|hid|dbghelp|psapi|iphlpapi|dnsapi|winhttp|wininet|urlmon|userenv|netapi32|powrprof|propsys|d3d9|d3d11|d3d12|dxgi|dcomp|d2d1|dwrite|dxcore|opengl32|glu32|vulkan-1|usp10|msimg32|winspool\.drv|wtsapi32|mpr|authz|credui|cryptbase|msvcrt|ucrtbase|vcruntime140|vcruntime140_1|msvcp140|combase|shcore|windowscodecs|mf|mfplat|mfreadwrite|mfuuid|avrt|ksuser|hhctrl\.ocx|synchronization|wevtapi|ninput|coremessaging|oleacc|uiautomationcore|d3dcompiler_47|winusb|normaliz|msi|wldap32|dhcpcsvc|esent|xinput1_4|xinput9_1_0|dinput8|wintrust|sspicli|fwpuclnt|mscms|inputhost|twinapi\.appcore|windows\.ui|runtimeobject)\.dll$/i;

function die(message: string, code = 1): never {
  console.error(`windows.ts: ${message}`);
  process.exit(code);
}

function parseArgs(argv: string[]) {
  const flags = new Map<string, string | true>();
  const rest: string[] = [];
  let passthrough: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") {
      passthrough = argv.slice(i + 1);
      break;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (
        next !== undefined &&
        !next.startsWith("--") &&
        !BOOLEAN_FLAGS.has(key)
      ) {
        flags.set(key, next);
        i++;
      } else flags.set(key, true);
    } else rest.push(a);
  }
  return { flags, rest, passthrough };
}

const BOOLEAN_FLAGS = new Set([
  "release",
  "no-default-features",
  "no-sysroot",
  "shell",
  "json",
  "no-zip",
  "msi",
  "machine",
  "expect-exit",
  "headless",
  "keep",
]);

function str(
  flags: Map<string, string | true>,
  key: string,
): string | undefined {
  const v = flags.get(key);
  return typeof v === "string" ? v : undefined;
}

function archOf(flags: Map<string, string | true>): Arch {
  const t = str(flags, "target") ?? "x86_64";
  if (t === "x86_64" || t.startsWith("x86_64-")) return "x86_64";
  if (t === "aarch64" || t === "arm64" || t.startsWith("aarch64-"))
    return "aarch64";
  return die(`unknown --target ${t} (x86_64 or aarch64)`);
}

function msysPrefix(arch: Arch): string {
  return join(SYSROOT, TRIPLE[arch].msys);
}

function hasSysroot(arch: Arch): boolean {
  return existsSync(join(msysPrefix(arch), "lib"));
}

async function which(cmd: string): Promise<string | null> {
  return Bun.which(cmd);
}

async function capture(
  cmd: string[],
  env?: Record<string, string>,
  cwd?: string,
): Promise<{ code: number; out: string }> {
  try {
    const p = Bun.spawn(cmd, {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...env },
    });
    const [out, err] = await Promise.all([
      new Response(p.stdout).text(),
      new Response(p.stderr).text(),
    ]);
    return { code: await p.exited, out: (out + err).trim() };
  } catch (e) {
    return { code: 127, out: String(e) };
  }
}

// ---------------------------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------------------------

function crossEnv(arch: Arch, useSysroot: boolean): Record<string, string> {
  const t = TRIPLE[arch];
  const bin = join(LLVM_MINGW, "bin");
  const cc = join(bin, `${t.clang}-clang`);
  const cxx = join(bin, `${t.clang}-clang++`);
  const under = t.rust.replaceAll("-", "_");
  const upper = under.toUpperCase();
  const sys = useSysroot && hasSysroot(arch);
  const prefix = msysPrefix(arch);
  const sysFlags = sys ? `--sysroot=${prefix}` : "";
  const env: Record<string, string> = {
    BUNUI_CROSS_ARCH: arch,
    BUNUI_CROSS_TRIPLE: t.rust,
    BUNUI_LLVM_MINGW: LLVM_MINGW,
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    CARGO_BUILD_TARGET: t.rust,
    [`CARGO_TARGET_${upper}_LINKER`]: cc,
    [`CARGO_TARGET_${upper}_RUNNER`]: join(CROSS, "wine-runner.sh"),
    [`CC_${under}`]: cc,
    [`CXX_${under}`]: cxx,
    [`AR_${under}`]: join(bin, "llvm-ar"),
    [`RANLIB_${under}`]: join(bin, "llvm-ranlib"),
    [`RC_${under}`]: join(bin, `${t.clang}-windres`),
    [`CFLAGS_${under}`]: sysFlags,
    [`CXXFLAGS_${under}`]: sysFlags,
    [`CMAKE_TOOLCHAIN_FILE_${under}`]: join(
      CROSS,
      "cmake",
      "windows-llvm-mingw.cmake",
    ),
    BUNUI_CROSS_CLANG_TARGET: t.clang,
    WINEPREFIX,
    WINEDEBUG: process.env.WINEDEBUG ?? "-all",
  };
  if (sys) {
    env.BUNUI_WIN_SYSROOT = SYSROOT;
    env.BUNUI_WIN_PREFIX = prefix;
    env[`CARGO_TARGET_${upper}_RUSTFLAGS`] =
      `-C link-arg=--sysroot=${prefix} -L native=${join(prefix, "lib")}`;
    env.PKG_CONFIG_ALLOW_CROSS = "1";
    env[`PKG_CONFIG_SYSROOT_DIR_${under}`] = SYSROOT;
    env[`PKG_CONFIG_LIBDIR_${under}`] = [
      join(prefix, "lib/pkgconfig"),
      join(prefix, "share/pkgconfig"),
    ].join(":");
    env[`PKG_CONFIG_PATH_${under}`] = "";
    // pkg-config-rs reads the target-scoped variables; meson/cmake read the plain ones.
    env.PKG_CONFIG_SYSROOT_DIR = SYSROOT;
    env.PKG_CONFIG_LIBDIR = env[`PKG_CONFIG_LIBDIR_${under}`]!;
    env.PKG_CONFIG_PATH = "";
    env.WINEPATH = [join(prefix, "bin"), join(LLVM_MINGW, t.clang, "bin")].join(
      ";",
    );
    if (existsSync(join(prefix, "lib/cmake/Qt6"))) {
      env.QMAKE = qmakeWrapper(arch, prefix);
      env.BUNUI_QT_PREFIX = prefix;
    }
  } else {
    env.WINEPATH = join(LLVM_MINGW, t.clang, "bin");
  }
  return env;
}

// qt-build-utils runs `qmake -query` with an empty environment, so QMAKE must be a wrapper with the
// sysroot paths baked in. Written under target/cross/ (ignored), never committed.
function qmakeWrapper(arch: Arch, prefix: string): string {
  const dir = join(REPO, "target", "cross");
  const path = join(dir, `qmake-${arch}`);
  const body = [
    "#!/bin/sh",
    "# Generated by tools/cross/windows.ts env",
    `export BUNUI_QT_PREFIX=${shellQuote(prefix)} HOME=${shellQuote(HOME)} WINEPREFIX=${shellQuote(WINEPREFIX)}`,
    'export PATH="${PATH:-/usr/local/bin:/usr/bin:/bin}"',
    process.env.BUNUI_QT_HOST_TOOLS
      ? `export BUNUI_QT_HOST_TOOLS=${shellQuote(process.env.BUNUI_QT_HOST_TOOLS)}`
      : "",
    process.env.BUNUI_HOST_QT_LIBEXEC
      ? `export BUNUI_HOST_QT_LIBEXEC=${shellQuote(process.env.BUNUI_HOST_QT_LIBEXEC)}`
      : "",
    `exec ${shellQuote(join(CROSS, "qmake-cross.sh"))} "$@"`,
    "",
  ]
    .filter((l, i, a) => l !== "" || i === a.length - 1)
    .join("\n");
  mkdirSync(dir, { recursive: true });
  let current = "";
  try {
    current = readFileSync(path, "utf8");
  } catch {
    // First run: no wrapper yet.
  }
  if (current !== body) {
    writeFileSync(path, body);
    chmodSync(path, 0o755);
  }
  return path;
}

function shellQuote(v: string): string {
  return /^[\w@%+=:,./-]*$/.test(v) ? v : `'${v.replaceAll("'", `'\\''`)}'`;
}

async function cmdEnv(flags: Map<string, string | true>) {
  const arch = archOf(flags);
  const env = crossEnv(arch, !flags.has("no-sysroot"));
  if (flags.has("json")) {
    console.log(JSON.stringify(env, null, 2));
    return;
  }
  for (const [k, v] of Object.entries(env))
    console.log(`export ${k}=${shellQuote(v)}`);
  console.log(
    `# cmake: -DCMAKE_TOOLCHAIN_FILE=${join(CROSS, "cmake", "windows-llvm-mingw.cmake")}`,
  );
  console.log(
    `# meson: bun tools/cross/windows.ts meson-cross --target ${arch} (prints the --cross-file arguments)`,
  );
}

async function cmdMesonCross(flags: Map<string, string | true>) {
  const arch = archOf(flags);
  const t = TRIPLE[arch];
  const outDir = join(REPO, "target", "cross");
  mkdirSync(outDir, { recursive: true });
  const paths = join(outDir, `meson-paths-${arch}.ini`);
  const sys = hasSysroot(arch) && !flags.has("no-sysroot");
  await Bun.write(
    paths,
    [
      "# Generated by tools/cross/windows.ts meson-cross. Machine paths for the shared cross files.",
      "[constants]",
      `llvm_mingw = '${LLVM_MINGW}'`,
      `triple = '${t.clang}'`,
      `sysroot = '${sys ? SYSROOT : ""}'`,
      `prefix = '${sys ? msysPrefix(arch) : ""}'`,
      `sysroot_args = [${sys ? `'--sysroot=${msysPrefix(arch)}'` : ""}]`,
      "",
    ].join("\n"),
  );
  const shared = join(CROSS, "meson", `${t.meson}-w64-mingw32.ini`);
  console.log(`--cross-file ${paths} --cross-file ${shared}`);
}

// ---------------------------------------------------------------------------------------------
// setup (pinned in toolchain.json; idempotent; --apt also installs system packages with sudo)
// ---------------------------------------------------------------------------------------------

async function cmdSetup(flags: Map<string, string | true>) {
  const pins = await Bun.file(join(CROSS, "toolchain.json")).json();
  const run = async (cmd: string[], cwd?: string) => {
    console.error(`+ ${cmd.join(" ")}`);
    const p = Bun.spawn(cmd, {
      cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, DEBIAN_FRONTEND: "noninteractive" },
    });
    if ((await p.exited) !== 0) die(`failed: ${cmd.join(" ")}`);
  };
  if (flags.has("apt"))
    await run([
      "sudo",
      "-n",
      "apt-get",
      "install",
      "-y",
      "--no-install-recommends",
      ...pins.apt,
    ]);
  const lm = pins.llvmMingw;
  const optDir = dirname(LLVM_MINGW);
  const versioned = join(optDir, `llvm-mingw-${lm.release}-ucrt`);
  if (!existsSync(join(versioned, "bin"))) {
    const dl = join(HOME, "build/win-cross/downloads");
    mkdirSync(dl, { recursive: true });
    const tarball = join(dl, lm.asset);
    if (!existsSync(tarball))
      await run(["curl", "-fL", "--retry", "3", "-o", tarball, lm.url]);
    const sum = new Bun.CryptoHasher("sha256")
      .update(await Bun.file(tarball).arrayBuffer())
      .digest("hex");
    if (sum !== lm.sha256) die(`sha256 mismatch for ${lm.asset}: ${sum}`);
    console.error(`sha256 ok ${lm.asset}`);
    mkdirSync(optDir, { recursive: true });
    await run(["tar", "-C", optDir, "-xf", tarball]);
    await run([
      "mv",
      join(optDir, lm.asset.replace(/\.tar\.xz$/, "")),
      versioned,
    ]);
  }
  await run(["ln", "-sfn", basename(versioned), LLVM_MINGW]);
  await run(["rustup", "target", "add", ...pins.rustTargets], REPO);
  const q = pins.quasiMsys2;
  const archs: Arch[] =
    flags.has("aarch64-sysroot") || str(flags, "sysroot") === "all"
      ? ["x86_64", "aarch64"]
      : ["x86_64"];
  for (const arch of archs) {
    // One quasi-msys2 copy per MSYS2 environment; x86_64 owns the default BUNUI_WIN_SYSROOT.
    const dir =
      arch === "x86_64"
        ? dirname(SYSROOT)
        : `${dirname(SYSROOT)}-${TRIPLE[arch].msys}`;
    if (!existsSync(join(dir, ".git"))) await run(["git", "clone", q.url, dir]);
    await run(["git", "-C", dir, "fetch", "--quiet", "origin"]);
    await run(["git", "-C", dir, "checkout", "--quiet", q.commit]);
    await Bun.write(join(dir, "msystem.txt"), `${q.msystems[arch]}\n`);
    await run(["make", "-C", dir, "install", ...q.packages]);
  }
  console.error("setup done; run: bun tools/cross/windows.ts doctor");
}

// ---------------------------------------------------------------------------------------------
// doctor
// ---------------------------------------------------------------------------------------------

async function cmdDoctor() {
  let failures = 0;
  const row = (ok: boolean | "warn", name: string, detail: string) => {
    if (ok === false) failures++;
    const mark = ok === true ? "ok  " : ok === "warn" ? "warn" : "FAIL";
    console.log(`${mark}  ${name.padEnd(26)} ${detail}`);
  };
  const clang = join(LLVM_MINGW, "bin", "x86_64-w64-mingw32-clang");
  const cv = await capture([clang, "--version"]);
  row(
    cv.code === 0,
    "llvm-mingw",
    cv.code === 0
      ? `${LLVM_MINGW} (${cv.out.split("\n")[0]})`
      : `missing at ${LLVM_MINGW}`,
  );
  const objdump = join(LLVM_MINGW, "bin", "llvm-objdump");
  row(existsSync(objdump), "llvm-objdump (DLL deps)", objdump);
  const targets = await capture(["rustup", "target", "list", "--installed"]);
  for (const arch of ["x86_64", "aarch64"] as Arch[]) {
    const t = TRIPLE[arch].rust;
    row(
      targets.out.includes(t),
      `rustup ${t}`,
      targets.out.includes(t) ? "installed" : `rustup target add ${t}`,
    );
  }
  for (const arch of ["x86_64", "aarch64"] as Arch[]) {
    const p = msysPrefix(arch);
    const ok = hasSysroot(arch);
    let detail = ok ? p : `absent (${p})`;
    if (ok) {
      const pcs = existsSync(join(p, "lib/pkgconfig"))
        ? readdirSync(join(p, "lib/pkgconfig"))
        : [];
      const want = [
        "gtk4.pc",
        "libadwaita-1.pc",
        "gtksourceview-5.pc",
        "Qt6Core.pc",
        "Qt6Qml.pc",
        "Qt6Svg.pc",
      ];
      detail += ` [${want.map((w) => (pcs.includes(w) ? w.replace(".pc", "") : `!${w.replace(".pc", "")}`)).join(" ")}]`;
    }
    row(
      ok ? true : arch === "x86_64" ? false : "warn",
      `MSYS2 ${TRIPLE[arch].msystem} sysroot`,
      detail,
    );
  }
  const qmsys = dirname(SYSROOT);
  if (existsSync(join(qmsys, ".git"))) {
    const head = await capture([
      "git",
      "-C",
      qmsys,
      "rev-parse",
      "--short=12",
      "HEAD",
    ]);
    row(true, "quasi-msys2", `${qmsys} @ ${head.out}`);
  } else row("warn", "quasi-msys2", `not found at ${qmsys}`);
  const qtExe = join(msysPrefix("x86_64"), "bin", "Qt6Core.dll");
  if (existsSync(qtExe)) {
    const host = process.env.BUNUI_HOST_QT_LIBEXEC ?? (await hostQtLibexec());
    row(
      host ? true : "warn",
      "host Qt tools (moc/rcc)",
      host ??
        "not found: set BUNUI_HOST_QT_LIBEXEC or install qt6-base-dev-tools",
    );
  }
  for (const [tool, why] of [
    ["wine", "smoke tests"],
    ["Xvfb", "headless smoke tests"],
    ["import", "smoke screenshots (ImageMagick)"],
    ["makensis", "NSIS installer"],
    ["wixl", "MSI (msitools)"],
    ["wixl-heat", "MSI file harvesting"],
    ["osslsigncode", "Authenticode signing"],
    ["pkg-config", "sysroot pkg-config"],
    ["cmake", "CMake toolchain"],
    ["meson", "Meson cross files"],
    ["ninja", "CMake/Meson backend"],
    ["zip", "dist archives"],
    ["glib-compile-schemas", "GTK schema compilation"],
  ] as const) {
    const p = await which(tool);
    let ver = "";
    if (p && tool === "wine") ver = (await capture(["wine", "--version"])).out;
    row(
      p ? true : "warn",
      tool,
      p ? `${p}${ver ? ` (${ver})` : ""} - ${why}` : `missing - ${why}`,
    );
  }
  const xwin = await which("cargo-xwin");
  row(
    "warn",
    "MSVC path (cargo-xwin)",
    `${xwin ?? "cargo-xwin not installed"}; gated: ${process.env.BUNUI_MSVC_ACCEPT_LICENSE === "1" ? "owner opted in" : "BUNUI_MSVC_ACCEPT_LICENSE unset, SDK not downloaded"}`,
  );
  console.log(
    failures
      ? `\n${failures} required check(s) failed`
      : "\nall required checks passed",
  );
  process.exit(failures ? 1 : 0);
}

async function hostQtLibexec(): Promise<string | null> {
  for (const dir of [
    "/usr/lib/qt6/libexec",
    "/usr/lib/x86_64-linux-gnu/qt6/libexec",
    "/usr/libexec/qt6",
  ]) {
    if (existsSync(join(dir, "moc"))) return dir;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------------------------

async function cmdBuild(
  flags: Map<string, string | true>,
  passthrough: string[],
) {
  const crate = str(flags, "crate") ?? die("build needs --crate <name>");
  const arch = archOf(flags);
  if ((str(flags, "abi") ?? "gnullvm") === "msvc") {
    // Same license gate as `msvc`: refuses unless the owner exported BUNUI_MSVC_ACCEPT_LICENSE=1.
    const msvcArgs = [
      "build",
      "-p",
      crate,
      "--target",
      `${arch}-pc-windows-msvc`,
    ];
    if (flags.has("release")) msvcArgs.push("--release");
    if (str(flags, "example"))
      msvcArgs.push("--example", str(flags, "example")!);
    if (str(flags, "bin")) msvcArgs.push("--bin", str(flags, "bin")!);
    return cmdMsvc(passthrough, msvcArgs);
  }
  const env = crossEnv(arch, !flags.has("no-sysroot"));
  // --manifest-path builds a project outside the Bun UI workspace (for example a pinned upstream
  // under upstream/); --target-dir keeps its artifacts away from a tree another job is using.
  const manifest = str(flags, "manifest-path")
    ? resolve(str(flags, "manifest-path")!)
    : null;
  const cwd = manifest ? dirname(manifest) : REPO;
  const targetDir = resolve(str(flags, "target-dir") ?? join(cwd, "target"));
  const args = [
    "cargo",
    "build",
    "-p",
    crate,
    "--target",
    TRIPLE[arch].rust,
    "--target-dir",
    targetDir,
  ];
  if (manifest) args.push("--manifest-path", manifest);
  if (flags.has("release")) args.push("--release");
  const bin = str(flags, "bin");
  const example = str(flags, "example");
  if (bin) args.push("--bin", bin);
  if (example) args.push("--example", example);
  if (flags.has("no-default-features")) args.push("--no-default-features");
  const features = str(flags, "features");
  if (features) args.push("--features", features);
  if (str(flags, "jobs")) args.push("-j", str(flags, "jobs")!);
  args.push(...passthrough);
  // Upstream projects pin their own toolchain (rust-toolchain.toml); make sure it has the target.
  const installed = await capture(
    ["rustup", "target", "list", "--installed"],
    undefined,
    cwd,
  );
  if (
    installed.code === 0 &&
    !installed.out.split("\n").includes(TRIPLE[arch].rust)
  ) {
    console.error(
      `+ rustup target add ${TRIPLE[arch].rust} (toolchain of ${cwd})`,
    );
    const add = Bun.spawn(["rustup", "target", "add", TRIPLE[arch].rust], {
      cwd,
      stdout: "inherit",
      stderr: "inherit",
    });
    if ((await add.exited) !== 0) die("rustup target add failed");
  }
  console.error(`+ ${args.join(" ")}`);
  const p = Bun.spawn(args, {
    cwd,
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await p.exited;
  if (code !== 0) process.exit(code);
  const profile = flags.has("release") ? "release" : "debug";
  const outDir = join(
    targetDir,
    TRIPLE[arch].rust,
    profile,
    example ? "examples" : "",
  );
  const exe = join(outDir, `${example ?? bin ?? crate}.exe`);
  if (existsSync(exe)) console.log(exe);
}

// ---------------------------------------------------------------------------------------------
// DLL resolution (llvm-objdump -p, recursive, like mingw-ldd)
// ---------------------------------------------------------------------------------------------

async function importsOf(file: string): Promise<string[]> {
  const r = await capture([
    join(LLVM_MINGW, "bin", "llvm-objdump"),
    "-p",
    file,
  ]);
  if (r.code !== 0)
    die(`llvm-objdump failed on ${file}: ${r.out.slice(0, 300)}`);
  return [...r.out.matchAll(/DLL Name:\s*(\S+)/g)].map((m) => m[1]!);
}

function searchDirs(arch: Arch, exeDir: string): string[] {
  const t = TRIPLE[arch];
  return [
    exeDir,
    join(msysPrefix(arch), "bin"),
    join(LLVM_MINGW, t.clang, "bin"),
  ].filter(existsSync);
}

function findDll(name: string, dirs: string[]): string | null {
  const lower = name.toLowerCase();
  for (const d of dirs) {
    const direct = join(d, name);
    if (existsSync(direct)) return direct;
    const hit = readdirSync(d).find((f) => f.toLowerCase() === lower);
    if (hit) return join(d, hit);
  }
  return null;
}

async function resolveDlls(roots: string[], dirs: string[]) {
  const found = new Map<string, string>();
  const missing = new Set<string>();
  const system = new Set<string>();
  const queue = [...roots];
  const seen = new Set<string>();
  while (queue.length) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const dll of await importsOf(file)) {
      const key = dll.toLowerCase();
      if (found.has(key) || missing.has(key) || system.has(key)) continue;
      if (SYSTEM_DLL.test(dll)) {
        system.add(key);
        continue;
      }
      const path = findDll(dll, dirs);
      if (!path) {
        missing.add(key);
        continue;
      }
      found.set(key, path);
      queue.push(path);
    }
  }
  return { found, missing, system };
}

// ---------------------------------------------------------------------------------------------
// bundle
// ---------------------------------------------------------------------------------------------

function copyTree(
  src: string,
  dst: string,
  filter?: (path: string) => boolean,
) {
  if (!existsSync(src)) return false;
  cpSync(src, dst, {
    recursive: true,
    dereference: true,
    filter: filter ? (s) => filter(s) : undefined,
  });
  return true;
}

async function cmdBundle(flags: Map<string, string | true>) {
  const exe = resolve(str(flags, "exe") ?? die("bundle needs --exe <path>"));
  if (!existsSync(exe)) die(`no such file ${exe}`);
  const arch = archOf(flags);
  const name = str(flags, "name") ?? basename(exe, ".exe");
  const dist = resolve(
    str(flags, "out") ?? join(REPO, "dist", `${name}-windows-${arch}`),
  );
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  const prefix = msysPrefix(arch);
  cpSync(exe, join(dist, basename(exe)));
  const roots = [join(dist, basename(exe))];
  const extraExes = str(flags, "extra")?.split(",") ?? [];
  for (const e of extraExes) {
    cpSync(resolve(e), join(dist, basename(e)));
    roots.push(join(dist, basename(e)));
  }
  const dirs = searchDirs(arch, dirname(exe));
  const report: string[] = [];

  // First pass to learn which runtime the binary uses.
  let deps = await resolveDlls(roots, dirs);
  const has = (re: RegExp) => [...deps.found.keys()].some((k) => re.test(k));

  if (has(/^libgtk-4-1\.dll$/)) {
    report.push("gtk4: pixbuf loaders, schemas, icons, settings.ini");
    const loaders = join(prefix, "lib/gdk-pixbuf-2.0/2.10.0");
    if (copyTree(loaders, join(dist, "lib/gdk-pixbuf-2.0/2.10.0"))) {
      for (const f of readdirSync(
        join(dist, "lib/gdk-pixbuf-2.0/2.10.0/loaders"),
      )) {
        if (f.endsWith(".dll"))
          roots.push(join(dist, "lib/gdk-pixbuf-2.0/2.10.0/loaders", f));
      }
      // loaders.cache from MSYS2 uses relative "lib\\gdk-pixbuf-2.0\\..." paths, valid in the bundle.
    }
    const schemas = join(dist, "share/glib-2.0/schemas");
    mkdirSync(schemas, { recursive: true });
    for (const f of readdirSync(join(prefix, "share/glib-2.0/schemas"))) {
      if (f.endsWith(".xml") || f.endsWith(".override"))
        cpSync(join(prefix, "share/glib-2.0/schemas", f), join(schemas, f));
    }
    if (await which("glib-compile-schemas"))
      await $`glib-compile-schemas ${schemas}`.quiet();
    else
      cpSync(
        join(prefix, "share/glib-2.0/schemas/gschemas.compiled"),
        join(schemas, "gschemas.compiled"),
      );
    for (const theme of ["hicolor", "Adwaita"]) {
      copyTree(
        join(prefix, "share/icons", theme),
        join(dist, "share/icons", theme),
        (p) => !/\/(cursors)\//.test(p),
      );
    }
    if (has(/^libgtksourceview-5/))
      copyTree(
        join(prefix, "share/gtksourceview-5"),
        join(dist, "share/gtksourceview-5"),
      );
    mkdirSync(join(dist, "etc/gtk-4.0"), { recursive: true });
    await Bun.write(
      join(dist, "etc/gtk-4.0/settings.ini"),
      "[Settings]\ngtk-font-name=Segoe UI 10\n",
    );
    copyTree(
      join(prefix, "share/locale"),
      join(dist, "share/locale"),
      (p) =>
        !/\/LC_MESSAGES\/(?!gtk40|libadwaita|glib20|gtksourceview-5)[^/]+\.mo$/.test(
          p,
        ) || !p.endsWith(".mo"),
    );
  }

  const qtCore = [...deps.found.keys()].find((k) => /^qt6core\.dll$/.test(k));
  if (qtCore) {
    report.push(
      "qt6: platforms, styles, imageformats, iconengines, tls, qml (when linked), qt.conf",
    );
    const plugins = join(prefix, "share/qt6/plugins");
    for (const group of [
      "platforms",
      "styles",
      "imageformats",
      "iconengines",
      "tls",
      "generic",
      "networkinformation",
    ]) {
      if (
        copyTree(
          join(plugins, group),
          join(dist, "plugins", group),
          (p) =>
            !/d\.dll$/.test(p) || /qwindows|qsvg|qdds|qwbmp/.test(basename(p)),
        )
      ) {
        for (const f of readdirSync(join(dist, "plugins", group)))
          if (f.endsWith(".dll")) roots.push(join(dist, "plugins", group, f));
      }
    }
    if (has(/^qt6qml\.dll$/)) {
      const qml = join(prefix, "share/qt6/qml");
      const wanted = (
        str(flags, "qml-modules") ?? "QtQml,QtQuick,QtCore"
      ).split(",");
      for (const m of wanted) {
        if (copyTree(join(qml, m), join(dist, "qml", m))) {
          for (const f of new Bun.Glob("**/*.dll").scanSync(
            join(dist, "qml", m),
          ))
            roots.push(join(dist, "qml", m, f));
        }
      }
    }
    await Bun.write(
      join(dist, "qt.conf"),
      "[Paths]\nPrefix = .\nPlugins = plugins\nQmlImports = qml\nTranslations = translations\n",
    );
  }

  // Second pass over the exe plus every plugin/loader that was copied.
  deps = await resolveDlls(roots, dirs);
  for (const [, path] of deps.found) {
    const dst = join(dist, basename(path));
    if (!existsSync(dst) && dirname(path) !== dist)
      cpSync(path, dst, { dereference: true });
  }
  const manifest = {
    name,
    arch,
    exe: basename(exe),
    dlls: [...deps.found.values()].map((p) => basename(p)).sort(),
    system: [...deps.system].sort(),
    missing: [...deps.missing].sort(),
    extras: report,
  };
  await Bun.write(
    join(dist, "bundle.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const size = (await capture(["du", "-sh", dist])).out.split("\t")[0];
  console.log(
    `bundled ${name} -> ${relative(REPO, dist) || dist} (${manifest.dlls.length} DLLs, ${size})`,
  );
  for (const r of report) console.log(`  + ${r}`);
  if (manifest.missing.length)
    console.log(
      `  ! unresolved (not system, not in sysroot): ${manifest.missing.join(", ")}`,
    );
  if (!flags.has("no-zip")) {
    const zip = `${dist}.zip`;
    rmSync(zip, { force: true });
    await $`zip -qr9 ${zip} ${basename(dist)}`.cwd(dirname(dist));
    console.log(
      `  zip ${relative(REPO, zip) || zip} (${(statSync(zip).size / 1048576).toFixed(1)} MiB)`,
    );
  }
}

// ---------------------------------------------------------------------------------------------
// installer (NSIS, optional wixl MSI)
// ---------------------------------------------------------------------------------------------

function listFiles(root: string): string[] {
  return [
    ...new Bun.Glob("**/*").scanSync({ cwd: root, onlyFiles: true }),
  ].sort();
}

async function cmdInstaller(flags: Map<string, string | true>) {
  const dist = resolve(
    str(flags, "dist") ?? die("installer needs --dist <bundle dir>"),
  );
  const meta = existsSync(join(dist, "bundle.json"))
    ? await Bun.file(join(dist, "bundle.json")).json()
    : {};
  const name: string = str(flags, "name") ?? meta.name ?? basename(dist);
  const exe: string = str(flags, "exe") ?? meta.exe ?? `${name}.exe`;
  const version = str(flags, "version") ?? "0.1.0";
  const publisher = str(flags, "publisher") ?? "Aphrody";
  const machine = flags.has("machine");
  const arch: Arch = meta.arch ?? archOf(flags);
  const outDir = dirname(dist);
  const files = listFiles(dist);
  const dirsSet = new Set(
    files.map((f) => dirname(f)).filter((d) => d !== "."),
  );
  const win = (p: string) => p.replaceAll("/", "\\");
  const nsi = join(outDir, `${name}-windows-${arch}.nsi`);
  const setup = join(outDir, `${name}-${version}-windows-${arch}-setup.exe`);
  const lines = [
    "; Generated by bun tools/cross/windows.ts installer",
    "Unicode true",
    "ManifestDPIAware true",
    `!define APPNAME "${name}"`,
    `!define APPVERSION "${version}"`,
    `!define PUBLISHER "${publisher}"`,
    `Name "\${APPNAME}"`,
    `OutFile "${setup}"`,
    machine
      ? 'InstallDir "$PROGRAMFILES64\\${APPNAME}"'
      : 'InstallDir "$LOCALAPPDATA\\Programs\\${APPNAME}"',
    `RequestExecutionLevel ${machine ? "admin" : "user"}`,
    "SetCompressor /SOLID lzma",
    arch === "aarch64" ? "; ARM64 payload: install on Windows 11 on Arm" : "",
    '!include "MUI2.nsh"',
    "!insertmacro MUI_PAGE_DIRECTORY",
    "!insertmacro MUI_PAGE_INSTFILES",
    "!insertmacro MUI_UNPAGE_CONFIRM",
    "!insertmacro MUI_UNPAGE_INSTFILES",
    '!insertmacro MUI_LANGUAGE "English"',
    `!define UNINST_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${APPNAME}"`,
    'Section "Install"',
    '  SetOutPath "$INSTDIR"',
    `  File /r "${dist}/*"`,
    '  WriteUninstaller "$INSTDIR\\uninstall.exe"',
    `  CreateShortCut "$SMPROGRAMS\\\${APPNAME}.lnk" "$INSTDIR\\${win(exe)}"`,
    `  WriteRegStr ${machine ? "HKLM" : "HKCU"} "\${UNINST_KEY}" "DisplayName" "\${APPNAME}"`,
    `  WriteRegStr ${machine ? "HKLM" : "HKCU"} "\${UNINST_KEY}" "DisplayVersion" "\${APPVERSION}"`,
    `  WriteRegStr ${machine ? "HKLM" : "HKCU"} "\${UNINST_KEY}" "Publisher" "\${PUBLISHER}"`,
    `  WriteRegStr ${machine ? "HKLM" : "HKCU"} "\${UNINST_KEY}" "DisplayIcon" "$INSTDIR\\${win(exe)}"`,
    `  WriteRegStr ${machine ? "HKLM" : "HKCU"} "\${UNINST_KEY}" "UninstallString" '"$INSTDIR\\uninstall.exe"'`,
    "SectionEnd",
    'Section "Uninstall"',
    `  Delete "$SMPROGRAMS\\\${APPNAME}.lnk"`,
    ...files.map((f) => `  Delete "$INSTDIR\\${win(f)}"`),
    ...[...dirsSet]
      .sort((a, b) => b.length - a.length)
      .map((d) => `  RMDir "$INSTDIR\\${win(d)}"`),
    '  Delete "$INSTDIR\\uninstall.exe"',
    '  RMDir "$INSTDIR"',
    `  DeleteRegKey ${machine ? "HKLM" : "HKCU"} "\${UNINST_KEY}"`,
    "SectionEnd",
    "",
  ].filter((l) => l !== "");
  await Bun.write(nsi, lines.join("\n") + "\n");
  if (await which("makensis")) {
    const r = await capture(["makensis", "-V2", "-INPUTCHARSET", "UTF8", nsi]);
    if (r.code !== 0) die(`makensis failed:\n${r.out}`);
    console.log(
      `nsis ${setup} (${(statSync(setup).size / 1048576).toFixed(1)} MiB)`,
    );
  } else console.log(`nsis script ${nsi} (makensis not installed)`);

  if (flags.has("msi")) {
    if (!(await which("wixl")) || !(await which("wixl-heat")))
      die("--msi needs wixl and wixl-heat (apt install wixl)");
    const upgrade = new Bun.CryptoHasher("sha1")
      .update(`bun-ui:${name}:${arch}`)
      .digest("hex");
    const guid = (h: string) =>
      `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`.toUpperCase();
    const fragment = join(outDir, `${name}-files.wxs`);
    const listing = files.map((f) => join(dist, f)).join("\n") + "\n";
    const heat = Bun.spawn(
      [
        "wixl-heat",
        "-p",
        `${dist}/`,
        "--component-group",
        "AppFiles",
        "--var",
        "var.SourceDir",
        "--directory-ref",
        "INSTALLDIR",
        "--win64",
      ],
      { stdin: new Blob([listing]), stdout: "pipe", stderr: "pipe" },
    );
    const fragXml = await new Response(heat.stdout).text();
    if ((await heat.exited) !== 0)
      die(`wixl-heat failed: ${await new Response(heat.stderr).text()}`);
    await Bun.write(fragment, fragXml);
    const product = join(outDir, `${name}-product.wxs`);
    const msiVersion = version
      .split(/[.-]/)
      .slice(0, 3)
      .map((n) => String(Number.parseInt(n, 10) || 0))
      .join(".");
    await Bun.write(
      product,
      `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by bun tools/cross/windows.ts installer (msi) -->
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" Name="${name}" Language="1033" Version="${msiVersion}" Manufacturer="${publisher}" UpgradeCode="${guid(upgrade)}">
    <Package InstallerVersion="500" Compressed="yes" InstallScope="${machine ? "perMachine" : "perUser"}"/>
    <MajorUpgrade DowngradeErrorMessage="A newer version of ${name} is already installed."/>
    <Media Id="1" Cabinet="app.cab" EmbedCab="yes"/>
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="${machine ? "ProgramFiles64Folder" : "LocalAppDataFolder"}">
        <Directory Id="INSTALLDIR" Name="${name}"/>
      </Directory>
    </Directory>
    <Feature Id="Main" Level="1">
      <ComponentGroupRef Id="AppFiles"/>
    </Feature>
  </Product>
</Wix>
`,
    );
    const msi = join(outDir, `${name}-${version}-windows-${arch}.msi`);
    const r = await capture([
      "wixl",
      "-a",
      arch === "aarch64" ? "arm64" : "x64",
      "-D",
      `SourceDir=${dist}`,
      "-D",
      "Win64=yes",
      "-o",
      msi,
      product,
      fragment,
    ]);
    if (r.code !== 0) die(`wixl failed:\n${r.out}`);
    console.log(
      `msi  ${msi} (${(statSync(msi).size / 1048576).toFixed(1)} MiB)`,
    );
  }
}

// ---------------------------------------------------------------------------------------------
// sign (osslsigncode; the certificate never lives in the repository)
// ---------------------------------------------------------------------------------------------

async function cmdSign(flags: Map<string, string | true>) {
  const file = resolve(
    str(flags, "file") ?? die("sign needs --file <exe|msi|dll>"),
  );
  const pkcs12 = process.env.BUNUI_SIGN_PKCS12;
  const passFile = process.env.BUNUI_SIGN_PASSFILE;
  if (!pkcs12)
    die(
      "set BUNUI_SIGN_PKCS12 (path to a .pfx in a protected store) and optionally BUNUI_SIGN_PASSFILE",
      2,
    );
  const out = `${file}.signed`;
  const args = [
    "osslsigncode",
    "sign",
    "-pkcs12",
    pkcs12,
    "-n",
    str(flags, "description") ?? basename(file),
    "-h",
    "sha256",
  ];
  if (passFile) args.push("-readpass", passFile);
  const ts = process.env.BUNUI_SIGN_TIMESTAMP_URL;
  if (ts) args.push("-ts", ts);
  args.push("-in", file, "-out", out);
  const r = await capture(args);
  if (r.code !== 0) die(`osslsigncode failed:\n${r.out}`);
  await $`mv ${out} ${file}`;
  console.log(
    (await capture(["osslsigncode", "verify", "-in", file])).out
      .split("\n")
      .slice(-3)
      .join("\n"),
  );
}

// ---------------------------------------------------------------------------------------------
// smoke (Wine, headless through xvfb-run when no display)
// ---------------------------------------------------------------------------------------------

async function cmdSmoke(
  flags: Map<string, string | true>,
  passthrough: string[],
) {
  const exe = resolve(str(flags, "exe") ?? die("smoke needs --exe <path>"));
  if (!existsSync(exe)) die(`no such file ${exe}`);
  const arch = archOf(flags);
  if (arch === "aarch64")
    die(
      "smoke runs x86_64 binaries only; aarch64 needs Windows on Arm or an ARM64 Wine host",
      2,
    );
  const seconds = Number(str(flags, "timeout") ?? "20");
  const env = {
    ...process.env,
    ...crossEnv(arch, true),
    WINEPREFIX,
    WINEDEBUG: process.env.WINEDEBUG ?? "-all",
  } as Record<string, string>;
  // An unbundled exe resolves its DLLs from the sysroot; a bundled one from its own directory.
  if (!existsSync(join(dirname(exe), "bundle.json")))
    env.WINEPATH = searchDirs(arch, dirname(exe)).join(";");
  else delete env.WINEPATH;
  if (str(flags, "env"))
    for (const kv of str(flags, "env")!.split(","))
      env[kv.split("=")[0]!] = kv.split("=").slice(1).join("=");
  mkdirSync(WINEPREFIX, { recursive: true });
  const headless = flags.has("headless") || !process.env.DISPLAY;
  const screenshot = str(flags, "screenshot")
    ? resolve(str(flags, "screenshot")!)
    : null;
  // Headless: a private Xvfb display (xvfb-run does not forward signals to Wine and cannot be
  // screenshotted from outside).
  let xvfb: ReturnType<typeof Bun.spawn> | null = null;
  if (headless && Bun.which("Xvfb")) {
    const display = `:${200 + Math.floor(Math.random() * 400)}`;
    xvfb = Bun.spawn(
      ["Xvfb", display, "-screen", "0", "1280x800x24", "-nolisten", "tcp"],
      { stdout: "ignore", stderr: "ignore" },
    );
    env.DISPLAY = display;
    await Bun.sleep(800);
  }
  const cmd = ["wine", exe, ...passthrough];
  console.error(
    `+ DISPLAY=${env.DISPLAY ?? ""} ${cmd.join(" ")} (timeout ${seconds}s)`,
  );
  const started = performance.now();
  const p = Bun.spawn(cmd, {
    env,
    stdout: "pipe",
    stderr: "pipe",
    cwd: dirname(exe),
  });
  let timedOut = false;
  let shot: Promise<unknown> = Promise.resolve();
  const shotTimer =
    screenshot && env.DISPLAY && Bun.which("import")
      ? setTimeout(
          () => {
            shot = capture([
              "import",
              "-display",
              env.DISPLAY!,
              "-window",
              "root",
              screenshot,
            ]);
          },
          Math.max(1, seconds - 2) * 1000,
        )
      : null;
  const timer = setTimeout(async () => {
    timedOut = true;
    await shot;
    // Stop every process of this prefix so the output pipes close.
    await Bun.spawn([WINESERVER, "-k"], {
      env,
      stdout: "ignore",
      stderr: "ignore",
    }).exited;
    p.kill("SIGTERM");
  }, seconds * 1000);
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  const code = await p.exited;
  clearTimeout(timer);
  if (shotTimer) clearTimeout(shotTimer);
  await shot;
  // Wine leaves wineserver and helper processes behind; stop them for this prefix.
  await capture([WINESERVER, "-k"], env);
  xvfb?.kill("SIGTERM");
  if (screenshot && existsSync(screenshot))
    console.error(`screenshot ${screenshot}`);
  const ms = Math.round(performance.now() - started);
  if (out) process.stdout.write(out.endsWith("\n") ? out : `${out}\n`);
  const errTail = err
    .split("\n")
    .filter(
      (l) =>
        l &&
        !/^(Xvfb|_XSERVTrans|The XKEYBOARD|Errors from xkbcomp|X connection to|> |>)/.test(
          l,
        ),
    )
    .slice(-25)
    .join("\n");
  if (errTail) console.error(errTail);
  const expectExit = flags.has("expect-exit");
  // A crashed process can stay "alive" behind Wine's crash dialog; treat these as failures.
  const crash =
    /Unhandled exception|unimplemented function .*aborting|Unhandled page fault|wine: could not load|err:module:import_dll/.exec(
      err,
    );
  if (crash) console.error(`wine reported: ${crash[0]}`);
  const ok =
    !crash && (expectExit ? !timedOut && code === 0 : timedOut || code === 0);
  console.error(
    `smoke ${ok ? "PASS" : "FAIL"}: ${basename(exe)} ${timedOut ? `alive after ${seconds}s (stopped)` : `exited ${code}`} in ${ms} ms`,
  );
  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------------------------------------
// msvc (opt-in only)
// ---------------------------------------------------------------------------------------------

async function cmdMsvc(passthrough: string[], rest: string[]) {
  if (process.env.BUNUI_MSVC_ACCEPT_LICENSE !== "1") {
    console.error(
      [
        "The *-pc-windows-msvc path downloads the Microsoft CRT and Windows SDK through cargo-xwin/xwin,",
        "which requires accepting the Microsoft license (https://go.microsoft.com/fwlink/?LinkId=2086102).",
        "Bun UI never accepts it on the owner's behalf. The default path is *-pc-windows-gnullvm.",
        "To opt in, the owner sets BUNUI_MSVC_ACCEPT_LICENSE=1 (and XWIN_CACHE_DIR outside the repo), then runs:",
        "  bun tools/cross/windows.ts msvc build -p <crate> --target x86_64-pc-windows-msvc",
      ].join("\n"),
    );
    process.exit(3);
  }
  const args = ["cargo", "xwin", ...rest, ...passthrough];
  const env = {
    ...process.env,
    XWIN_ACCEPT_LICENSE: "1",
    XWIN_CACHE_DIR:
      process.env.XWIN_CACHE_DIR ?? join(HOME, "build/win-cross/xwin-cache"),
  };
  console.error(`+ ${args.join(" ")}`);
  const p = Bun.spawn(args, {
    cwd: REPO,
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(await p.exited);
}

// ---------------------------------------------------------------------------------------------

const [command, ...argv] = Bun.argv.slice(2);
const { flags, rest, passthrough } = parseArgs(argv);
switch (command) {
  case "setup":
    await cmdSetup(flags);
    break;
  case "doctor":
    await cmdDoctor();
    break;
  case "env":
    await cmdEnv(flags);
    break;
  case "meson-cross":
    await cmdMesonCross(flags);
    break;
  case "build":
    await cmdBuild(flags, passthrough);
    break;
  case "bundle":
    await cmdBundle(flags);
    break;
  case "installer":
    await cmdInstaller(flags);
    break;
  case "sign":
    await cmdSign(flags);
    break;
  case "smoke":
    await cmdSmoke(flags, passthrough);
    break;
  case "msvc":
    await cmdMsvc(passthrough, rest);
    break;
  default: {
    const lines = (await Bun.file(import.meta.path).text())
      .split("\n")
      .slice(2);
    const head = lines.slice(
      0,
      lines.findIndex((l) => !l.startsWith("//")),
    );
    console.log(head.map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(command ? 2 : 0);
  }
}
