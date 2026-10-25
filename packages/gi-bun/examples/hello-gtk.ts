// SPDX-License-Identifier: Apache-2.0
// GTK 4 "hello world" written as a GJS script, running on Bun through
// GObject Introspection. Headless: GDK_BACKEND=broadway with gtk4-broadwayd.

import "../src/index.ts";

declare const imports: typeof import("../src/imports.ts").imports;
declare function print(...args: unknown[]): void;

imports.gi.versions.Gtk = "4.0";
// biome-ignore lint: introspected namespaces are dynamic
const { GLib, Gtk, Gio } = imports.gi as Record<string, any>;

print(
  `Gtk ${Gtk.get_major_version()}.${Gtk.get_minor_version()}.${Gtk.get_micro_version()}`,
);

const app = new Gtk.Application({
  application_id: "com.aphrody.GiBunHello",
  flags: Gio.ApplicationFlags.NON_UNIQUE,
});

app.connect("activate", () => {
  const window = new Gtk.ApplicationWindow({
    application: app,
    title: "Hello from Bun",
    default_width: 360,
    default_height: 200,
  });
  const box = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 12,
  });
  const label = new Gtk.Label({ label: "GTK 4 through gi-bun" });
  const button = Gtk.Button.new_with_label("Click me");
  let clicks = 0;
  button.connect("clicked", () => {
    clicks++;
    label.set_label(`Clicked ${clicks} time(s)`);
    print(`button 'clicked' -> label now '${label.get_label()}'`);
  });
  box.append(label);
  box.append(button);
  window.set_child(box);
  window.present();
  print(
    `window '${window.title}' ${window.default_width}x${window.default_height}, visible = ${window.visible}`,
  );
  print(`display: ${window.get_display().constructor.name}`);

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
    button.emit("clicked");
    return GLib.SOURCE_REMOVE;
  });
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
    print("closing window");
    window.close();
    return GLib.SOURCE_REMOVE;
  });
});

const status = app.run([]);
print(`Gtk.Application.run() returned ${status}`);
