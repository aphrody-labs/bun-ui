// SPDX-License-Identifier: Apache-2.0
// GJS-style globals: `imports.gi`, `imports.gi.versions`, `imports.mainloop`,
// `print`, `printerr` and `log`, so simple GJS scripts run unchanged on Bun.

import { require } from "./core.ts";

type Namespace = Record<string, unknown>;

const versions: Record<string, string> = {};

/** `imports.gi`: property access loads the namespace's typelib. */
export const gi = new Proxy({ versions } as Record<string, unknown>, {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    if (prop === "versions") return target.versions;
    if (prop === "then") return undefined;
    return require(prop, versions[prop] ?? null);
  },
}) as Record<string, Namespace> & { versions: Record<string, string> };

const loops = new Map<string, { quit: () => void; run: () => void }>();

/** `imports.mainloop`: the legacy GJS mainloop module on top of GLib.MainLoop. */
export const mainloop = {
  run(name = ""): void {
    const GLib = gi.GLib as Record<
      string,
      new (...a: unknown[]) => { run(): void; quit(): void }
    >;
    const loop = new GLib.MainLoop(null, false);
    loops.set(name, loop);
    loop.run();
  },
  quit(name = ""): void {
    loops.get(name)?.quit();
    loops.delete(name);
  },
  timeout_add(ms: number, fn: () => boolean): number {
    const GLib = gi.GLib as Record<string, (...a: unknown[]) => number> &
      Record<string, number>;
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, fn);
  },
  idle_add(fn: () => boolean): number {
    const GLib = gi.GLib as Record<string, (...a: unknown[]) => number> &
      Record<string, number>;
    return GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, fn);
  },
  source_remove(id: number): boolean {
    return (gi.GLib as Record<string, (id: number) => boolean>).source_remove(
      id,
    );
  },
};

export const imports = { gi, mainloop };

/** Install `imports`, `print`, `printerr` and `log` on globalThis. */
export function installGlobals(): typeof imports {
  const g = globalThis as Record<string, unknown>;
  g.imports ??= imports;
  g.print ??= (...args: unknown[]) => console.log(...args);
  g.printerr ??= (...args: unknown[]) => console.error(...args);
  g.log ??= (...args: unknown[]) => console.error("Gjs-Message:", ...args);
  return imports;
}
