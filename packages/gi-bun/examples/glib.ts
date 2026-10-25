// SPDX-License-Identifier: Apache-2.0
// GJS-style GLib/GObject/Gio script running on Bun through GObject Introspection.
// Every call below is resolved from GLib-2.0/GObject-2.0/Gio-2.0 typelibs at
// run time; gi-bun declares no per-API symbols.

import gi from "../src/index.ts";

declare const imports: typeof import("../src/imports.ts").imports;
declare function print(...args: unknown[]): void;

// biome-ignore lint: introspected namespaces are dynamic
const { GLib, GObject, Gio } = imports.gi as Record<string, any>;

print(
  `libgirepository ${gi.girepositoryVersion} (${gi.girepositoryLibrary}), GLib-${GLib.__version__} typelib`,
);

// 1. Plain functions through introspection.
const user = GLib.get_user_name();
const host = GLib.get_host_name();
print(`GLib.get_user_name() = ${user}`);
print(`GLib.get_host_name() = ${host}`);
print(`  resolved: ${JSON.stringify(gi.describe("GLib", "get_user_name"))}`);
print(
  `GLib.getHomeDir() = ${GLib.getHomeDir()}  GLib.get_num_processors() = ${GLib.get_num_processors()}`,
);
print(
  `GLib.build_filenamev(['a','b','c.txt']) = ${GLib.build_filenamev(["a", "b", "c.txt"])}`,
);
print(
  `GLib.MAJOR_VERSION.MINOR = ${GLib.MAJOR_VERSION}.${GLib.MINOR_VERSION}, PRIORITY_DEFAULT = ${GLib.PRIORITY_DEFAULT}`,
);
print(
  `GLib.UserDirectory.DIRECTORY_DOWNLOAD = ${GLib.UserDirectory.DIRECTORY_DOWNLOAD}`,
);
print(
  `GLib.compute_checksum_for_string(SHA256, 'bun') = ${GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, "bun", -1)}`,
);

// 2. Enumerating the repository.
for (const ns of ["GLib", "GObject", "Gio"]) {
  const inv = gi.enumerate(ns);
  print(
    `${ns}-${inv.version}: ${inv.objects.length} objects, ${inv.interfaces.length} interfaces, ${inv.structs.length} structs, ` +
      `${inv.functions.length} functions, ${inv.enums.length} enums, ${inv.flags.length} flags, ${inv.constants.length} constants`,
  );
}

// 3. GError -> Error.
try {
  GLib.file_get_contents("/nonexistent/gi-bun");
} catch (error) {
  const e = error as {
    name: string;
    message: string;
    domain: string;
    code: number;
  };
  print(
    `GError -> ${e.name}: ${e.message} (domain=${e.domain}, code=${e.code})`,
  );
}
const [ok, bytes] = GLib.file_get_contents("/etc/hostname");
print(
  `GLib.file_get_contents('/etc/hostname') = [${ok}, ${new TextDecoder().decode(bytes).trim()}]`,
);

// 4. GObject instances, properties via GValue and signal round-trips.
const cancellable = new Gio.Cancellable();
let cancelled = 0;
const id = cancellable.connect("cancelled", (self: unknown) => {
  cancelled++;
  print(
    `  'cancelled' handler: self === cancellable -> ${self === cancellable}`,
  );
});
cancellable.cancel();
print(
  `Gio.Cancellable: is_cancelled() = ${cancellable.is_cancelled()}, handler calls = ${cancelled}`,
);
cancellable.disconnect(id);

const action = Gio.SimpleAction.new("greet", GLib.VariantType.new("s"));
let notified = "";
action.connect("notify::enabled", (_obj: unknown, pspec: { name: string }) => {
  notified = pspec.name;
});
const received: string[] = [];
action.connect("activate", (_obj: unknown, parameter: { unpack(): string }) => {
  received.push(parameter.unpack());
});
action.activate(new GLib.Variant("s", "hello from Bun"));
action.emit("activate", new GLib.Variant("s", "emitted from JS"));
action.enabled = false;
print(`Gio.SimpleAction: activate payloads = ${JSON.stringify(received)}`);
print(
  `  property enabled = ${action.enabled}, get_property('name') = ${action.get_property("name")}, notify:: fired for '${notified}'`,
);
print(
  `  instanceof Gio.Action = ${action instanceof Gio.Action}, instanceof GObject.Object = ${action instanceof GObject.Object}`,
);

// Construct-time properties (GJS style) and a returned object of a private type.
const app = new Gio.Application({
  application_id: "com.aphrody.GiBun",
  flags: Gio.ApplicationFlags.NON_UNIQUE,
});
print(`new Gio.Application({...}).application_id = ${app.application_id}`);
const file = Gio.File.new_for_path("/etc/hostname");
print(
  `Gio.File.new_for_path(): ${file.constructor.name}, get_basename() = ${file.get_basename()}, instanceof Gio.File = ${file instanceof Gio.File}`,
);

// 5. GLib main loop: blocking run() (GJS semantics) with a JS SourceFunc.
const loop = new GLib.MainLoop(null, false);
let ticks = 0;
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
  ticks++;
  if (ticks < 3) return GLib.SOURCE_CONTINUE;
  loop.quit();
  return GLib.SOURCE_REMOVE;
});
loop.run();
print(`GLib.MainLoop.run(): timeout_add callback ran ${ticks} times`);

// 6. Cooperative loop: GLib sources and Bun timers interleave on one thread.
const order: string[] = [];
const loop2 = new GLib.MainLoop(null, false);
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30, () => {
  order.push("glib-timeout");
  loop2.quit();
  return GLib.SOURCE_REMOVE;
});
setTimeout(() => order.push("bun-setTimeout"), 5);
GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
  order.push("glib-idle");
  return GLib.SOURCE_REMOVE;
});
await loop2.runAsync();
print(`GLib.MainLoop.runAsync(): ${order.join(" -> ")}`);
print("glib example done");
