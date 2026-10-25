// SPDX-License-Identifier: Apache-2.0
// Rebuilds pkg/ from crates/aphrody-m3-wasm: cargo (wasm32-unknown-unknown, the root workspace
// `m3-wasm` profile), then the wasm-bindgen CLI (web target, shared by the browser and Bun
// entries). The wasm-bindgen CLI version must equal the `wasm-bindgen` crate pin in
// crates/aphrody-m3-wasm/Cargo.toml. The crate is a member of the Bun UI root Cargo workspace.
//
//   bun scripts/build.ts            # build with the cargo and wasm-bindgen on PATH
//   CARGO=… WASM_BINDGEN=… CARGO_TARGET_DIR=… bun scripts/build.ts
import { $ } from "bun";

const packageDir = new URL("..", import.meta.url).pathname;
const crateDir = new URL("../../../crates/aphrody-m3-wasm/", import.meta.url).pathname;
const manifest = `${crateDir}Cargo.toml`;
const targetDir = Bun.env.CARGO_TARGET_DIR ?? new URL("../../../target", import.meta.url).pathname;
const cargo = Bun.env.CARGO ?? "cargo";
const wasmBindgen = Bun.env.WASM_BINDGEN ?? "wasm-bindgen";
const outDir = `${packageDir}pkg`;

const pin = /wasm-bindgen\s*=\s*"=([\d.]+)"/.exec(await Bun.file(manifest).text())?.[1];
const cli = (await $`${wasmBindgen} --version`.text()).trim().split(/\s+/).at(-1);
if (pin && cli !== pin) throw new Error(`wasm-bindgen CLI ${cli} does not match the crate pin ${pin}`);

await $`${cargo} build --profile m3-wasm --locked --target wasm32-unknown-unknown --manifest-path ${manifest}`.env({
  ...Bun.env,
  CARGO_TARGET_DIR: targetDir,
});

const wasm = `${targetDir}/wasm32-unknown-unknown/m3-wasm/aphrody_m3_wasm.wasm`;
await $`rm -rf ${outDir}`;
await $`${wasmBindgen} --target web --out-dir ${outDir} --out-name aphrody_m3_wasm ${wasm}`;
await $`rm -f ${outDir}/.gitignore ${outDir}/package.json`;

for (const name of ["aphrody_m3_wasm.js", "aphrody_m3_wasm.d.ts", "aphrody_m3_wasm_bg.wasm", "aphrody_m3_wasm_bg.wasm.d.ts"]) {
  const file = Bun.file(`${outDir}/${name}`);
  if (!(await file.exists())) throw new Error(`wasm-bindgen did not write ${name}`);
  console.log(`${name.padEnd(30)} ${file.size} bytes`);
}
