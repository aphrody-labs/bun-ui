// SPDX-License-Identifier: Apache-2.0
// @aphrody/gi-bun: GObject Introspection for Bun through bun:ffi.

import {
  GLibError,
  GObjectBase,
  GType,
  GTYPE,
  PTR,
  connect,
  describe,
  disconnect,
  emit,
  enumerate,
  getProperty,
  pointerOf,
  require,
  setProperty,
} from "./core.ts";
import { imports, installGlobals } from "./imports.ts";
import { girepositoryLibrary, girepositoryVersion } from "./lib.ts";
import * as mainloop from "./mainloop.ts";

export const gi = {
  /** Load `ns` (optionally at `version`) and return its namespace object. */
  require,
  /** List objects, interfaces, structs, functions, enums, flags and constants. */
  enumerate,
  /** Methods, properties, signals, C symbol or values of one info. */
  describe,
  connect,
  disconnect,
  emit,
  getProperty,
  setProperty,
  pointerOf,
  mainloop,
  /** libgirepository ABI in use: 2 (GLib >= 2.80) or 1 (gobject-introspection). */
  girepositoryVersion,
  girepositoryLibrary,
};

export {
  GLibError,
  GObjectBase,
  GType,
  GTYPE,
  PTR,
  imports,
  installGlobals,
  mainloop,
};
export default gi;

installGlobals();
