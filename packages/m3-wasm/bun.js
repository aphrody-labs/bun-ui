// SPDX-License-Identifier: Apache-2.0
// Bun entry: reads the engine with Bun.file and instantiates it synchronously, then re-exports it.
import { initSync } from "./pkg/aphrody_m3_wasm.js";

initSync({ module: await Bun.file(new URL("./pkg/aphrody_m3_wasm_bg.wasm", import.meta.url)).arrayBuffer() });

export * from "./pkg/aphrody_m3_wasm.js";
