// SPDX-License-Identifier: Apache-2.0
// Regenerates Aphrody/M3/M3Theme.qml with aphrody-m3-emit (Target::Qml).
// Usage: bun scripts/generate.ts [--seed '#6750a4'] [--variant tonal-spot] [--contrast 0]
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = fileURLToPath(new URL("../../../crates/aphrody-m3-emit/Cargo.toml", import.meta.url));
const out = `${root}Aphrody/M3`;

const proc = Bun.spawn(
  ["cargo", "run", "--quiet", "--manifest-path", manifest, "--bin", "m3-emit", "--", "--target", "qml", "--out", out, ...Bun.argv.slice(2)],
  { stdout: "inherit", stderr: "inherit" },
);
const code = await proc.exited;
if (code !== 0) process.exit(code);
console.log(`m3-qml: wrote ${out}/M3Theme.qml`);
