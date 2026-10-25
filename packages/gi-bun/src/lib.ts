// SPDX-License-Identifier: Apache-2.0
// Native libraries behind @aphrody/gi-bun: GLib, GObject and libgirepository
// (2.0 from GLib >= 2.80 preferred, gobject-introspection 1.0 as fallback),
// all bound through bun:ffi.

import { CString, dlopen, read, type Pointer } from "bun:ffi";

export type Ptr = number;

const P = "ptr" as const;
const V = "void" as const;
const I32 = "i32" as const;
const U32 = "u32" as const;
const I64 = "i64_fast" as const;
const U64 = "u64_fast" as const;
/** u64 argument (GType, gsize, gulong); results use u64_fast numbers. */
const G = "u64" as const;
const I8 = "i8" as const;
const U8 = "u8" as const;
const F32 = "f32" as const;
const F64 = "f64" as const;
const S64 = "i64" as const;

function candidates(base: string, soVersion: string): string[] {
  if (process.platform === "darwin")
    return [`lib${base}.${soVersion}.dylib`, `lib${base}.dylib`];
  if (process.platform === "win32")
    return [`lib${base}-${soVersion}.dll`, `${base}.dll`];
  return [`lib${base}.so.${soVersion}`, `lib${base}.so`];
}

// biome-ignore lint: bun:ffi symbol tables are structurally typed
function open<T extends Record<string, any>>(names: string[], symbols: T) {
  let lastError: unknown;
  for (const name of names) {
    try {
      return { name, lib: dlopen(name, symbols) };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `gi-bun: cannot load any of ${names.join(", ")}: ${String(lastError)}`,
  );
}

export const glib = open(candidates("glib-2.0", "0"), {
  g_free: { args: [P], returns: V },
  g_malloc0: { args: [G], returns: P },
  g_strdup: { args: [P], returns: P },
  g_strfreev: { args: [P], returns: V },
  g_list_free: { args: [P], returns: V },
  g_slist_free: { args: [P], returns: V },
  g_error_free: { args: [P], returns: V },
  g_quark_to_string: { args: [U32], returns: P },
  g_main_context_iteration: { args: [P, I32], returns: I32 },
  g_main_context_pending: { args: [P], returns: I32 },
  g_main_loop_quit: { args: [P], returns: V },
  g_variant_ref: { args: [P], returns: P },
  g_variant_ref_sink: { args: [P], returns: P },
  g_variant_is_floating: { args: [P], returns: I32 },
  g_variant_unref: { args: [P], returns: V },
  g_variant_print: { args: [P, I32], returns: P },
  g_variant_get_type_string: { args: [P], returns: P },
}).lib.symbols;

export const gobject = open(candidates("gobject-2.0", "0"), {
  g_type_name_from_instance: { args: [P], returns: P },
  g_type_name: { args: [G], returns: P },
  g_type_from_name: { args: [P], returns: U64 },
  g_type_parent: { args: [G], returns: U64 },
  g_type_fundamental: { args: [G], returns: U64 },
  g_type_is_a: { args: [G, G], returns: I32 },
  g_type_interfaces: { args: [G, P], returns: P },
  g_type_class_ref: { args: [G], returns: P },
  g_type_class_unref: { args: [P], returns: V },
  g_type_default_interface_ref: { args: [G], returns: P },
  g_object_ref: { args: [P], returns: P },
  g_object_unref: { args: [P], returns: V },
  g_object_ref_sink: { args: [P], returns: P },
  g_object_is_floating: { args: [P], returns: I32 },
  g_object_class_find_property: { args: [P, P], returns: P },
  g_object_class_list_properties: { args: [P, P], returns: P },
  g_object_interface_find_property: { args: [P, P], returns: P },
  g_object_get_property: { args: [P, P, P], returns: V },
  g_object_set_property: { args: [P, P, P], returns: V },
  g_object_new_with_properties: { args: [G, U32, P, P], returns: P },
  g_value_init: { args: [P, G], returns: P },
  g_value_unset: { args: [P], returns: V },
  g_value_get_boolean: { args: [P], returns: I32 },
  g_value_get_schar: { args: [P], returns: I8 },
  g_value_get_uchar: { args: [P], returns: U8 },
  g_value_get_int: { args: [P], returns: I32 },
  g_value_get_uint: { args: [P], returns: U32 },
  g_value_get_long: { args: [P], returns: I64 },
  g_value_get_ulong: { args: [P], returns: U64 },
  g_value_get_int64: { args: [P], returns: I64 },
  g_value_get_uint64: { args: [P], returns: U64 },
  g_value_get_float: { args: [P], returns: F32 },
  g_value_get_double: { args: [P], returns: F64 },
  g_value_get_enum: { args: [P], returns: I32 },
  g_value_get_flags: { args: [P], returns: U32 },
  g_value_get_string: { args: [P], returns: P },
  g_value_get_pointer: { args: [P], returns: P },
  g_value_get_boxed: { args: [P], returns: P },
  g_value_get_object: { args: [P], returns: P },
  g_value_get_param: { args: [P], returns: P },
  g_value_get_variant: { args: [P], returns: P },
  g_value_get_gtype: { args: [P], returns: U64 },
  g_value_set_boolean: { args: [P, I32], returns: V },
  g_value_set_schar: { args: [P, I8], returns: V },
  g_value_set_uchar: { args: [P, U8], returns: V },
  g_value_set_int: { args: [P, I32], returns: V },
  g_value_set_uint: { args: [P, U32], returns: V },
  g_value_set_long: { args: [P, S64], returns: V },
  g_value_set_ulong: { args: [P, G], returns: V },
  g_value_set_int64: { args: [P, S64], returns: V },
  g_value_set_uint64: { args: [P, G], returns: V },
  g_value_set_float: { args: [P, F32], returns: V },
  g_value_set_double: { args: [P, F64], returns: V },
  g_value_set_enum: { args: [P, I32], returns: V },
  g_value_set_flags: { args: [P, U32], returns: V },
  g_value_set_string: { args: [P, P], returns: V },
  g_value_set_pointer: { args: [P, P], returns: V },
  g_value_set_boxed: { args: [P, P], returns: V },
  g_value_set_object: { args: [P, P], returns: V },
  g_value_set_variant: { args: [P, P], returns: V },
  g_value_set_gtype: { args: [P, G], returns: V },
  g_param_spec_get_name: { args: [P], returns: P },
  g_signal_connect_closure: { args: [P, P, P, I32], returns: U64 },
  g_signal_handler_disconnect: { args: [P, G], returns: V },
  g_signal_handler_is_connected: { args: [P, G], returns: I32 },
  g_signal_parse_name: { args: [P, G, P, P, I32], returns: I32 },
  g_signal_query: { args: [U32, P], returns: V },
  g_signal_list_ids: { args: [G, P], returns: P },
  g_signal_emitv: { args: [P, U32, U32, P], returns: V },
  g_closure_new_simple: { args: [U32, P], returns: P },
  g_closure_set_marshal: { args: [P, P], returns: V },
  g_closure_add_finalize_notifier: { args: [P, P, P], returns: V },
  g_boxed_copy: { args: [G, P], returns: P },
  g_boxed_free: { args: [G, P], returns: V },
}).lib.symbols;

// --- libgirepository -------------------------------------------------------

/** GIInfo kinds, normalized across libgirepository 1.0 and 2.0. */
export type InfoKind =
  | "function"
  | "callback"
  | "struct"
  | "boxed"
  | "enum"
  | "flags"
  | "object"
  | "interface"
  | "constant"
  | "union"
  | "value"
  | "signal"
  | "vfunc"
  | "property"
  | "field"
  | "arg"
  | "type"
  | "unresolved"
  | "invalid";

const KINDS_1: InfoKind[] = [
  "invalid",
  "function",
  "callback",
  "struct",
  "boxed",
  "enum",
  "flags",
  "object",
  "interface",
  "constant",
  "invalid",
  "union",
  "value",
  "signal",
  "vfunc",
  "property",
  "field",
  "arg",
  "type",
  "unresolved",
];

// Symbols with the libgirepository-2.0 spelling. Entries whose 1.0 name is not
// the mechanical gi_ -> g_ (and gi_repository_ -> g_irepository_) rename, or
// whose 1.0 signature differs, are rewritten in `forVersion1`.
const GI2 = {
  gi_repository_dup_default: { args: [], returns: P },
  gi_repository_require: { args: [P, P, P, I32, P], returns: P },
  gi_repository_get_n_infos: { args: [P, P], returns: U32 },
  gi_repository_get_info: { args: [P, P, U32], returns: P },
  gi_repository_find_by_name: { args: [P, P, P], returns: P },
  gi_repository_find_by_gtype: { args: [P, G], returns: P },
  gi_repository_get_version: { args: [P, P], returns: P },
  gi_base_info_unref: { args: [P], returns: V },
  gi_base_info_get_name: { args: [P], returns: P },
  gi_base_info_get_namespace: { args: [P], returns: P },
  gi_base_info_is_deprecated: { args: [P], returns: I32 },
  gi_callable_info_get_n_args: { args: [P], returns: U32 },
  gi_callable_info_get_arg: { args: [P, U32], returns: P },
  gi_callable_info_get_return_type: { args: [P], returns: P },
  gi_callable_info_get_caller_owns: { args: [P], returns: I32 },
  gi_callable_info_is_method: { args: [P], returns: I32 },
  gi_callable_info_can_throw_gerror: { args: [P], returns: I32 },
  gi_callable_info_may_return_null: { args: [P], returns: I32 },
  gi_callable_info_skip_return: { args: [P], returns: I32 },
  gi_arg_info_get_direction: { args: [P], returns: I32 },
  gi_arg_info_get_type_info: { args: [P], returns: P },
  gi_arg_info_get_ownership_transfer: { args: [P], returns: I32 },
  gi_arg_info_may_be_null: { args: [P], returns: I32 },
  gi_arg_info_is_optional: { args: [P], returns: I32 },
  gi_arg_info_is_caller_allocates: { args: [P], returns: I32 },
  gi_arg_info_is_skip: { args: [P], returns: I32 },
  gi_arg_info_get_scope: { args: [P], returns: I32 },
  gi_arg_info_get_closure_index: { args: [P, P], returns: I32 },
  gi_arg_info_get_destroy_index: { args: [P, P], returns: I32 },
  gi_type_info_get_tag: { args: [P], returns: I32 },
  gi_type_info_is_pointer: { args: [P], returns: I32 },
  gi_type_info_get_interface: { args: [P], returns: P },
  gi_type_info_get_param_type: { args: [P, U32], returns: P },
  gi_type_info_get_array_type: { args: [P], returns: I32 },
  gi_type_info_get_array_length_index: { args: [P, P], returns: I32 },
  gi_type_info_get_array_fixed_size: { args: [P, P], returns: I32 },
  gi_type_info_is_zero_terminated: { args: [P], returns: I32 },
  gi_function_info_get_symbol: { args: [P], returns: P },
  gi_function_info_invoke: { args: [P, P, G, P, G, P, P], returns: I32 },
  gi_registered_type_info_get_g_type: { args: [P], returns: U64 },
  gi_enum_info_get_n_values: { args: [P], returns: U32 },
  gi_enum_info_get_value: { args: [P, U32], returns: P },
  gi_enum_info_get_n_methods: { args: [P], returns: U32 },
  gi_enum_info_get_method: { args: [P, U32], returns: P },
  gi_value_info_get_value: { args: [P], returns: I64 },
  gi_constant_info_get_type_info: { args: [P], returns: P },
  gi_constant_info_get_value: { args: [P, P], returns: U64 },
  gi_constant_info_free_value: { args: [P, P], returns: V },
  gi_object_info_get_parent: { args: [P], returns: P },
  gi_object_info_get_n_methods: { args: [P], returns: U32 },
  gi_object_info_get_method: { args: [P, U32], returns: P },
  gi_object_info_get_n_interfaces: { args: [P], returns: U32 },
  gi_object_info_get_interface: { args: [P, U32], returns: P },
  gi_object_info_get_n_properties: { args: [P], returns: U32 },
  gi_object_info_get_property: { args: [P, U32], returns: P },
  gi_object_info_get_n_signals: { args: [P], returns: U32 },
  gi_object_info_get_signal: { args: [P, U32], returns: P },
  gi_object_info_get_n_constants: { args: [P], returns: U32 },
  gi_object_info_get_constant: { args: [P, U32], returns: P },
  gi_object_info_get_abstract: { args: [P], returns: I32 },
  gi_object_info_get_fundamental: { args: [P], returns: I32 },
  gi_interface_info_get_n_methods: { args: [P], returns: U32 },
  gi_interface_info_get_method: { args: [P, U32], returns: P },
  gi_interface_info_get_n_properties: { args: [P], returns: U32 },
  gi_interface_info_get_property: { args: [P, U32], returns: P },
  gi_interface_info_get_n_signals: { args: [P], returns: U32 },
  gi_interface_info_get_signal: { args: [P, U32], returns: P },
  gi_struct_info_get_n_methods: { args: [P], returns: U32 },
  gi_struct_info_get_method: { args: [P, U32], returns: P },
  gi_struct_info_get_size: { args: [P], returns: U64 },
  gi_union_info_get_n_methods: { args: [P], returns: U32 },
  gi_union_info_get_method: { args: [P, U32], returns: P },
  gi_union_info_get_size: { args: [P], returns: U64 },
  gi_property_info_get_type_info: { args: [P], returns: P },
  gi_property_info_get_flags: { args: [P], returns: I32 },
};

type GI2Symbols = typeof GI2;

const RENAMED_1: Record<string, string> = {
  gi_repository_dup_default: "g_irepository_get_default",
  gi_arg_info_get_type_info: "g_arg_info_get_type",
  gi_constant_info_get_type_info: "g_constant_info_get_type",
  gi_property_info_get_type_info: "g_property_info_get_type",
  gi_arg_info_get_closure_index: "g_arg_info_get_closure",
  gi_arg_info_get_destroy_index: "g_arg_info_get_destroy",
  gi_type_info_get_array_length_index: "g_type_info_get_array_length",
};

function v1Name(name: string): string {
  return (
    RENAMED_1[name] ??
    name.replace(/^gi_repository_/, "g_irepository_").replace(/^gi_/, "g_")
  );
}

function forVersion1(): Record<string, { args: string[]; returns: string }> {
  const out: Record<string, { args: string[]; returns: string }> = {};
  for (const [name, spec] of Object.entries(GI2)) {
    out[v1Name(name)] = { args: [...spec.args], returns: spec.returns };
  }
  // 1.0 signature differences: int indices returned instead of out-params.
  out.g_arg_info_get_closure = { args: [P], returns: I32 };
  out.g_arg_info_get_destroy = { args: [P], returns: I32 };
  out.g_type_info_get_array_length = { args: [P], returns: I32 };
  out.g_type_info_get_array_fixed_size = { args: [P], returns: I32 };
  out.g_constant_info_get_value = { args: [P, P], returns: I32 };
  out.g_function_info_invoke = {
    args: [P, P, I32, P, I32, P, P],
    returns: I32,
  };
  out.g_base_info_get_type = { args: [P], returns: I32 };
  return out;
}

const forced = process.env.GI_BUN_GIREPOSITORY; // "1" or "2"
let giVersion: 1 | 2 = 2;
// biome-ignore lint: dynamic symbol table
let gi: any;
let giLibrary = "";
if (forced !== "1") {
  try {
    const o = open(candidates("girepository-2.0", "0"), GI2);
    gi = o.lib.symbols;
    giLibrary = o.name;
  } catch (error) {
    if (forced === "2") throw error;
  }
}
if (!gi) {
  const o = open(candidates("girepository-1.0", "1"), forVersion1());
  giVersion = 1;
  giLibrary = o.name;
  const s = o.lib.symbols as Record<string, unknown>;
  gi = {};
  for (const name of Object.keys(GI2)) {
    gi[name] = s[v1Name(name)];
  }
  gi.g_base_info_get_type = s.g_base_info_get_type;
}

export const girepository = gi as {
  [K in keyof GI2Symbols]: (...args: unknown[]) => never;
};
export const girepositoryVersion = giVersion;
export const girepositoryLibrary = giLibrary;

// --- small helpers ---------------------------------------------------------

export function cstr(p: Ptr | null | undefined): string | null {
  if (!p) return null;
  return new CString(p as Pointer).toString();
}

export function cbuf(s: string): Buffer {
  return Buffer.from(`${s}\0`, "utf8");
}

export function readPtr(p: Ptr, offset = 0): Ptr {
  return read.ptr(p as Pointer, offset) as Ptr;
}

/** G_TYPE_FROM_INSTANCE: instance->g_class->g_type. */
export function instanceGType(p: Ptr): number {
  return Number(read.u64(read.ptr(p as Pointer, 0) as Pointer, 0));
}

/** Uniform view over libgirepository 1.0/2.0. */
export const GI = {
  version: giVersion,
  repo: (gi.gi_repository_dup_default() as Ptr) ?? 0,
  kind(info: Ptr): InfoKind {
    if (giVersion === 1)
      return KINDS_1[gi.g_base_info_get_type(info) as number] ?? "invalid";
    const name =
      cstr(gobject.g_type_name_from_instance(info as Pointer) as Ptr) ?? "";
    const k = name.replace(/^GI/, "").replace(/Info$/, "").toLowerCase();
    return (k === "vfunc" ? "vfunc" : k) as InfoKind;
  },
  name: (info: Ptr) => cstr(gi.gi_base_info_get_name(info)) ?? "",
  namespace: (info: Ptr) => cstr(gi.gi_base_info_get_namespace(info)) ?? "",
  unref: (info: Ptr) => gi.gi_base_info_unref(info),
  closureIndex(arg: Ptr): number {
    if (giVersion === 1) return gi.gi_arg_info_get_closure_index(arg) as number;
    const out = new Uint32Array(1);
    return gi.gi_arg_info_get_closure_index(arg, out) ? out[0] : -1;
  },
  destroyIndex(arg: Ptr): number {
    if (giVersion === 1) return gi.gi_arg_info_get_destroy_index(arg) as number;
    const out = new Uint32Array(1);
    return gi.gi_arg_info_get_destroy_index(arg, out) ? out[0] : -1;
  },
  arrayLength(type: Ptr): number {
    if (giVersion === 1)
      return gi.gi_type_info_get_array_length_index(type) as number;
    const out = new Uint32Array(1);
    return gi.gi_type_info_get_array_length_index(type, out) ? out[0] : -1;
  },
  arrayFixedSize(type: Ptr): number {
    if (giVersion === 1)
      return gi.gi_type_info_get_array_fixed_size(type) as number;
    const out = new BigUint64Array(1);
    return gi.gi_type_info_get_array_fixed_size(type, out)
      ? Number(out[0])
      : -1;
  },
};
