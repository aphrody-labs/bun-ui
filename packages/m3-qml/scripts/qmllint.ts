// SPDX-License-Identifier: Apache-2.0
// Lints every QML file of the module with qmllint (Qt 6.8+), resolving Aphrody.M3 from this package.
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const qmllint = Bun.which("qmllint6") ?? Bun.which("qmllint");
if (!qmllint) {
  console.error("m3-qml: qmllint not found (install Qt 6 declarative tools)");
  process.exit(127);
}
const files = [...new Bun.Glob("{Aphrody/M3,examples}/*.qml").scanSync({ cwd: root, absolute: true })];
const proc = Bun.spawn([qmllint, "-I", root, ...files], { stdout: "inherit", stderr: "inherit" });
process.exit(await proc.exited);
