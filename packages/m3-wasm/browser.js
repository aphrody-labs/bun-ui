// SPDX-License-Identifier: Apache-2.0
// Browser entry: fetches and instantiates the engine once (top-level await), then re-exports it.
import init from "./pkg/aphrody_m3_wasm.js";

await init({ module_or_path: new URL("./pkg/aphrody_m3_wasm_bg.wasm", import.meta.url) });

export * from "./pkg/aphrody_m3_wasm.js";
