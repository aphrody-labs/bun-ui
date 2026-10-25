// SPDX-License-Identifier: Apache-2.0
// GObject Introspection runtime for Bun: typelib loading, GIArgument and
// GValue marshalling, GObject/boxed wrappers, signals and properties.

import { JSCallback, type Pointer, ptr, read, toArrayBuffer } from "bun:ffi";
import {
  GI,
  type InfoKind,
  type Ptr,
  cbuf,
  cstr,
  girepository as gi,
  glib,
  gobject,
  instanceGType,
  readPtr,
} from "./lib.ts";
import * as mainloop from "./mainloop.ts";

// --- constants -------------------------------------------------------------

const enum Tag {
  VOID = 0,
  BOOLEAN = 1,
  INT8 = 2,
  UINT8 = 3,
  INT16 = 4,
  UINT16 = 5,
  INT32 = 6,
  UINT32 = 7,
  INT64 = 8,
  UINT64 = 9,
  FLOAT = 10,
  DOUBLE = 11,
  GTYPE = 12,
  UTF8 = 13,
  FILENAME = 14,
  ARRAY = 15,
  INTERFACE = 16,
  GLIST = 17,
  GSLIST = 18,
  GHASH = 19,
  ERROR = 20,
  UNICHAR = 21,
}
const enum Dir {
  IN = 0,
  OUT = 1,
  INOUT = 2,
}
const enum Transfer {
  NOTHING = 0,
  CONTAINER = 1,
  EVERYTHING = 2,
}
const enum Scope {
  INVALID = 0,
  CALL = 1,
  ASYNC = 2,
  NOTIFIED = 3,
  FOREVER = 4,
}
/** Fundamental GTypes (G_TYPE_MAKE_FUNDAMENTAL(n) = n << 2). */
export const GType = {
  NONE: 4,
  INTERFACE: 8,
  CHAR: 12,
  UCHAR: 16,
  BOOLEAN: 20,
  INT: 24,
  UINT: 28,
  LONG: 32,
  ULONG: 36,
  INT64: 40,
  UINT64: 44,
  ENUM: 48,
  FLAGS: 52,
  FLOAT: 56,
  DOUBLE: 60,
  STRING: 64,
  POINTER: 68,
  BOXED: 72,
  PARAM: 76,
  OBJECT: 80,
  VARIANT: 84,
} as const;
const GVALUE_SIZE = 24;

/** Symbol under which every wrapper stores its native pointer. */
export const PTR: unique symbol = Symbol.for("gi-bun.ptr") as never;
/** Static symbol holding the GType of a generated class. */
export const GTYPE: unique symbol = Symbol.for("gi-bun.gtype") as never;
const INFO = Symbol.for("gi-bun.info");

type Wrapper = { [PTR]: Ptr };
type Fn = (...args: unknown[]) => unknown;

// --- descriptors -----------------------------------------------------------

interface IfaceD {
  kind: InfoKind;
  info: Ptr;
  gtype: number;
  ns: string;
  name: string;
  size: number;
}
interface TypeD {
  tag: Tag;
  pointer: boolean;
  iface?: IfaceD;
  param?: TypeD;
  arrayType: number;
  lengthIndex: number;
  fixedSize: number;
  zeroTerminated: boolean;
}
interface ArgD {
  name: string;
  dir: Dir;
  type: TypeD;
  transfer: Transfer;
  mayBeNull: boolean;
  callerAllocates: boolean;
  closure: number;
  destroy: number;
  scope: Scope;
}
export interface CallableD {
  name: string;
  info: Ptr;
  symbol: string | null;
  isMethod: boolean;
  throws: boolean;
  ret: TypeD;
  retTransfer: Transfer;
  skipReturn: boolean;
  args: ArgD[];
  hidden: Set<number>;
  jsArgs: number[];
  nIn: number;
  nOut: number;
}

function isRegistered(kind: InfoKind): boolean {
  return [
    "object",
    "interface",
    "struct",
    "boxed",
    "union",
    "enum",
    "flags",
  ].includes(kind);
}

function ifaceD(info: Ptr): IfaceD {
  const kind = GI.kind(info);
  const gtype = isRegistered(kind)
    ? (gi.gi_registered_type_info_get_g_type(info) as number)
    : 0;
  let size = 0;
  if (kind === "struct" || kind === "boxed")
    size = gi.gi_struct_info_get_size(info) as number;
  else if (kind === "union") size = gi.gi_union_info_get_size(info) as number;
  return {
    kind,
    info,
    gtype,
    ns: GI.namespace(info),
    name: GI.name(info),
    size,
  };
}

function typeD(ti: Ptr): TypeD {
  const tag = gi.gi_type_info_get_tag(ti) as Tag;
  const t: TypeD = {
    tag,
    pointer: !!gi.gi_type_info_is_pointer(ti),
    arrayType: -1,
    lengthIndex: -1,
    fixedSize: -1,
    zeroTerminated: false,
  };
  if (tag === Tag.INTERFACE) {
    const info = gi.gi_type_info_get_interface(ti) as Ptr;
    if (info) t.iface = ifaceD(info);
  } else if (tag === Tag.ARRAY) {
    t.arrayType = gi.gi_type_info_get_array_type(ti) as number;
    t.lengthIndex = GI.arrayLength(ti);
    t.fixedSize = GI.arrayFixedSize(ti);
    t.zeroTerminated = !!gi.gi_type_info_is_zero_terminated(ti);
    t.param = paramD(ti, 0);
  } else if (tag === Tag.GLIST || tag === Tag.GSLIST) {
    t.param = paramD(ti, 0);
  }
  return t;
}

function paramD(ti: Ptr, n: number): TypeD | undefined {
  const p = gi.gi_type_info_get_param_type(ti, n) as Ptr;
  if (!p) return undefined;
  const d = typeD(p);
  GI.unref(p);
  return d;
}

const callableCache = new Map<Ptr, CallableD>();

export function callableD(info: Ptr): CallableD {
  const cached = callableCache.get(info);
  if (cached) return cached;
  const n = gi.gi_callable_info_get_n_args(info) as number;
  const args: ArgD[] = [];
  for (let i = 0; i < n; i++) {
    const a = gi.gi_callable_info_get_arg(info, i) as Ptr;
    const ti = gi.gi_arg_info_get_type_info(a) as Ptr;
    args.push({
      name: GI.name(a),
      dir: gi.gi_arg_info_get_direction(a) as Dir,
      type: typeD(ti),
      transfer: gi.gi_arg_info_get_ownership_transfer(a) as Transfer,
      mayBeNull:
        !!gi.gi_arg_info_may_be_null(a) || !!gi.gi_arg_info_is_optional(a),
      callerAllocates: !!gi.gi_arg_info_is_caller_allocates(a),
      closure: GI.closureIndex(a),
      destroy: GI.destroyIndex(a),
      scope: gi.gi_arg_info_get_scope(a) as Scope,
    });
    GI.unref(ti);
    GI.unref(a);
  }
  const rti = gi.gi_callable_info_get_return_type(info) as Ptr;
  const ret = typeD(rti);
  GI.unref(rti);
  const hidden = new Set<number>();
  const hideLength = (t: TypeD) => {
    if (t.tag === Tag.ARRAY && t.lengthIndex >= 0) hidden.add(t.lengthIndex);
  };
  hideLength(ret);
  args.forEach((a, i) => {
    hideLength(a.type);
    if (a.closure >= 0 && a.closure < n) {
      if (a.type.iface?.kind === "callback") hidden.add(a.closure);
      else if (a.closure !== i) hidden.add(i);
    }
    if (a.destroy >= 0 && a.destroy < n) hidden.add(a.destroy);
  });
  const kind = GI.kind(info);
  const d: CallableD = {
    name: GI.name(info),
    info,
    symbol:
      kind === "function"
        ? cstr(gi.gi_function_info_get_symbol(info) as Ptr)
        : null,
    isMethod: !!gi.gi_callable_info_is_method(info),
    throws: !!gi.gi_callable_info_can_throw_gerror(info),
    ret,
    retTransfer: gi.gi_callable_info_get_caller_owns(info) as Transfer,
    skipReturn: !!gi.gi_callable_info_skip_return(info),
    args,
    hidden,
    jsArgs: args.flatMap((a, i) =>
      a.dir !== Dir.OUT && !hidden.has(i) ? [i] : [],
    ),
    nIn: args.filter((a) => a.dir !== Dir.OUT).length,
    nOut: args.filter((a) => a.dir !== Dir.IN).length,
  };
  callableCache.set(info, d);
  return d;
}

// --- raw value helpers -----------------------------------------------------

const fdv = new DataView(new ArrayBuffer(8));
const f32bits = (x: number) => (
  fdv.setFloat32(0, x, true),
  BigInt(fdv.getUint32(0, true))
);
const f64bits = (x: number) => (
  fdv.setFloat64(0, x, true),
  fdv.getBigUint64(0, true)
);
const bitsF32 = (r: bigint) => (
  fdv.setBigUint64(0, r, true),
  fdv.getFloat32(0, true)
);
const bitsF64 = (r: bigint) => (
  fdv.setBigUint64(0, r, true),
  fdv.getFloat64(0, true)
);
const u64 = (v: bigint | number) =>
  BigInt.asUintN(64, typeof v === "bigint" ? v : BigInt(Math.trunc(v)));
const toNumber = (v: bigint) =>
  v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(v)
    : v;
const addr = (b: ArrayBufferView) => ptr(b as never) as unknown as Ptr;

function sizeOf(t: TypeD): number {
  switch (t.tag) {
    case Tag.INT8:
    case Tag.UINT8:
      return 1;
    case Tag.INT16:
    case Tag.UINT16:
      return 2;
    case Tag.BOOLEAN:
    case Tag.INT32:
    case Tag.UINT32:
    case Tag.UNICHAR:
    case Tag.FLOAT:
      return 4;
    case Tag.INTERFACE:
      if (t.pointer) return 8;
      if (t.iface?.kind === "enum" || t.iface?.kind === "flags") return 4;
      return t.iface?.size || 8;
    default:
      return 8;
  }
}

function readRaw(p: Ptr, size: number): bigint {
  const q = p as Pointer;
  if (size === 1) return BigInt(read.u8(q, 0));
  if (size === 2) return BigInt(read.u16(q, 0));
  if (size === 4) return BigInt(read.u32(q, 0));
  return read.u64(q, 0) as bigint;
}

/** Native pointer of a wrapper, a raw number, or null. */
export function pointerOf(v: unknown): Ptr {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  const p = (v as Wrapper)[PTR];
  if (typeof p !== "number")
    throw new TypeError(
      `gi-bun: expected a GObject/boxed wrapper, got ${typeof v}`,
    );
  return p;
}

function gtypeOf(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return gobject.g_type_from_name(cbuf(v)) as number;
  const g =
    (v as { [GTYPE]?: number; $gtype?: number })?.[GTYPE] ??
    (v as { $gtype?: number })?.$gtype;
  if (typeof g === "number") return g;
  throw new TypeError("gi-bun: expected a GType");
}

export class GLibError extends Error {
  constructor(
    message: string,
    readonly domain: string | null,
    readonly code: number,
  ) {
    super(message);
    this.name = "GLib.Error";
  }
}

function takeError(p: Ptr, free = true): GLibError {
  const domain = read.u32(p as Pointer, 0);
  const code = read.i32(p as Pointer, 4);
  const message = cstr(readPtr(p, 8)) ?? "unknown GError";
  const error = new GLibError(
    message,
    cstr(glib.g_quark_to_string(domain) as Ptr),
    code,
  );
  if (free) glib.g_error_free(p as Pointer);
  return error;
}

// --- GIArgument encoding (JS -> C) -----------------------------------------

interface Ctx {
  keep: unknown[];
  lengths: Map<number, number>;
  after: (() => void)[];
}

function encode(t: TypeD, v: unknown, ctx: Ctx, transfer: Transfer): bigint {
  switch (t.tag) {
    case Tag.VOID:
      return u64(pointerOf(v));
    case Tag.BOOLEAN:
      return v ? 1n : 0n;
    case Tag.INT8:
    case Tag.UINT8:
    case Tag.INT16:
    case Tag.UINT16:
    case Tag.INT32:
    case Tag.UINT32:
    case Tag.INT64:
    case Tag.UINT64:
      return u64(typeof v === "bigint" ? v : Number(v ?? 0));
    case Tag.UNICHAR:
      return u64(
        typeof v === "string" ? (v.codePointAt(0) ?? 0) : Number(v ?? 0),
      );
    case Tag.FLOAT:
      return f32bits(Number(v ?? 0));
    case Tag.DOUBLE:
      return f64bits(Number(v ?? 0));
    case Tag.GTYPE:
      return u64(v == null ? 0 : gtypeOf(v));
    case Tag.UTF8:
    case Tag.FILENAME: {
      if (v == null) return 0n;
      const b = cbuf(String(v));
      if (transfer === Transfer.EVERYTHING) return u64(glib.g_strdup(b) as Ptr);
      ctx.keep.push(b);
      return u64(addr(b));
    }
    case Tag.ARRAY:
      return encodeArray(t, v, ctx, transfer);
    case Tag.INTERFACE: {
      const k = t.iface?.kind;
      if (k === "enum" || k === "flags") return u64(Number(v ?? 0));
      if (k === "callback")
        throw new TypeError(
          "gi-bun: callbacks are only supported as call arguments",
        );
      if (
        k === "struct" &&
        t.iface?.ns === "GLib" &&
        t.iface.name === "Variant" &&
        v != null &&
        !(PTR in (v as object))
      ) {
        throw new TypeError("gi-bun: expected a GLib.Variant");
      }
      const p = pointerOf(v);
      if (
        p &&
        transfer === Transfer.EVERYTHING &&
        (k === "object" || k === "interface")
      )
        gobject.g_object_ref(p as Pointer);
      return u64(p);
    }
    case Tag.ERROR:
      return 0n;
    default:
      if (v == null) return 0n;
      throw new TypeError(
        `gi-bun: cannot pass a JS value as GI type tag ${t.tag}`,
      );
  }
}

function encodeArray(
  t: TypeD,
  v: unknown,
  ctx: Ctx,
  transfer: Transfer,
): bigint {
  if (v == null) {
    if (t.lengthIndex >= 0) ctx.lengths.set(t.lengthIndex, 0);
    return 0n;
  }
  const elem = t.param as TypeD;
  if (t.arrayType !== 0)
    throw new TypeError("gi-bun: only C arrays are supported as input");
  const size = sizeOf(elem);
  let n: number;
  let buf: Uint8Array;
  if (v instanceof Uint8Array && size === 1) {
    n = v.length;
    buf = new Uint8Array(n + (t.zeroTerminated ? 1 : 0));
    buf.set(v);
  } else {
    const list =
      typeof v === "string" ? [...v] : Array.from(v as Iterable<unknown>);
    n = list.length;
    buf = new Uint8Array((n + (t.zeroTerminated ? 1 : 0)) * size || 8);
    const dv = new DataView(buf.buffer);
    const elemTransfer =
      transfer === Transfer.EVERYTHING ? Transfer.EVERYTHING : Transfer.NOTHING;
    list.forEach((item, i) => {
      const raw = encode(elem, item, ctx, elemTransfer);
      if (size === 1) dv.setUint8(i, Number(raw & 0xffn));
      else if (size === 2) dv.setUint16(i * 2, Number(raw & 0xffffn), true);
      else if (size === 4) dv.setUint32(i * 4, Number(raw & 0xffffffffn), true);
      else dv.setBigUint64(i * 8, raw, true);
    });
  }
  if (t.lengthIndex >= 0) ctx.lengths.set(t.lengthIndex, n);
  if (transfer !== Transfer.NOTHING) {
    const mem = glib.g_malloc0(buf.byteLength) as Ptr;
    new Uint8Array(toArrayBuffer(mem as Pointer, 0, buf.byteLength)).set(buf);
    return u64(mem);
  }
  ctx.keep.push(buf);
  return u64(addr(buf));
}

// --- GIArgument decoding (C -> JS) -----------------------------------------

function decode(
  t: TypeD,
  raw: bigint,
  transfer: Transfer,
  length = -1,
): unknown {
  switch (t.tag) {
    case Tag.VOID:
      return t.pointer ? Number(raw) || null : undefined;
    case Tag.BOOLEAN:
      return (raw & 0xffffffffn) !== 0n;
    case Tag.INT8:
      return Number(BigInt.asIntN(8, raw));
    case Tag.UINT8:
      return Number(BigInt.asUintN(8, raw));
    case Tag.INT16:
      return Number(BigInt.asIntN(16, raw));
    case Tag.UINT16:
      return Number(BigInt.asUintN(16, raw));
    case Tag.INT32:
      return Number(BigInt.asIntN(32, raw));
    case Tag.UINT32:
      return Number(BigInt.asUintN(32, raw));
    case Tag.INT64:
      return toNumber(BigInt.asIntN(64, raw));
    case Tag.UINT64:
      return toNumber(BigInt.asUintN(64, raw));
    case Tag.FLOAT:
      return bitsF32(raw);
    case Tag.DOUBLE:
      return bitsF64(raw);
    case Tag.GTYPE:
      return Number(raw);
    case Tag.UNICHAR:
      return String.fromCodePoint(Number(BigInt.asUintN(32, raw)));
    case Tag.UTF8:
    case Tag.FILENAME: {
      const p = Number(raw);
      const s = cstr(p);
      if (p && transfer === Transfer.EVERYTHING) glib.g_free(p as Pointer);
      return s;
    }
    case Tag.ARRAY:
      return decodeArray(t, Number(raw), transfer, length);
    case Tag.INTERFACE: {
      const i = t.iface;
      if (!i) return Number(raw) || null;
      if (i.kind === "enum") return Number(BigInt.asIntN(32, raw));
      if (i.kind === "flags") return Number(BigInt.asUintN(32, raw));
      if (i.kind === "object" || i.kind === "interface")
        return wrapObject(Number(raw), transfer === Transfer.EVERYTHING);
      if (i.kind === "struct" || i.kind === "boxed" || i.kind === "union")
        return wrapStruct(i, Number(raw), transfer === Transfer.EVERYTHING);
      return Number(raw) || null;
    }
    case Tag.GLIST:
    case Tag.GSLIST: {
      const out: unknown[] = [];
      const head = Number(raw);
      const elemTransfer =
        transfer === Transfer.EVERYTHING
          ? Transfer.EVERYTHING
          : Transfer.NOTHING;
      for (let node = head; node; node = readPtr(node, 8)) {
        out.push(decode(t.param as TypeD, u64(readPtr(node, 0)), elemTransfer));
      }
      if (head && transfer !== Transfer.NOTHING) {
        if (t.tag === Tag.GLIST) glib.g_list_free(head as Pointer);
        else glib.g_slist_free(head as Pointer);
      }
      return out;
    }
    case Tag.ERROR: {
      const p = Number(raw);
      return p ? takeError(p, transfer === Transfer.EVERYTHING) : null;
    }
    default:
      return Number(raw) || null;
  }
}

function decodeArray(
  t: TypeD,
  p: Ptr,
  transfer: Transfer,
  length: number,
): unknown {
  if (!p) return null;
  const elem = t.param as TypeD;
  let data = p;
  let n = length;
  if (t.arrayType === 1 || t.arrayType === 2 || t.arrayType === 3) {
    // GArray, GPtrArray and GByteArray share { data, len } at the head.
    data = readPtr(p, 0);
    n = read.u32(p as Pointer, 8);
  }
  const size = t.arrayType === 2 ? 8 : t.arrayType === 3 ? 1 : sizeOf(elem);
  if (n < 0) n = t.fixedSize;
  if (n < 0 && t.zeroTerminated) {
    n = 0;
    while (readRaw(data + n * size, size) !== 0n) n++;
  }
  if (n < 0) n = 0;
  let result: unknown;
  if (
    size === 1 &&
    (t.arrayType === 3 || elem.tag === Tag.UINT8 || elem.tag === Tag.INT8)
  ) {
    result = n
      ? new Uint8Array(toArrayBuffer(data as Pointer, 0, n).slice(0))
      : new Uint8Array(0);
  } else {
    const items: unknown[] = [];
    const elemTransfer =
      transfer === Transfer.EVERYTHING ? Transfer.EVERYTHING : Transfer.NOTHING;
    const byValueStruct =
      elem.tag === Tag.INTERFACE &&
      !elem.pointer &&
      elem.iface &&
      sizeOf(elem) > 8;
    for (let i = 0; i < n; i++) {
      const at = data + i * size;
      if (byValueStruct)
        items.push(wrapStruct(elem.iface as IfaceD, at, false));
      else items.push(decode(elem, readRaw(at, size), elemTransfer));
    }
    result = items;
  }
  if (transfer !== Transfer.NOTHING && t.arrayType === 0)
    glib.g_free(p as Pointer);
  return result;
}

// --- callbacks (JS functions passed as C function pointers) ----------------

function ffiOf(t: TypeD): string {
  switch (t.tag) {
    case Tag.VOID:
      return t.pointer ? "ptr" : "void";
    case Tag.BOOLEAN:
    case Tag.INT32:
      return "i32";
    case Tag.INT8:
      return "i8";
    case Tag.UINT8:
      return "u8";
    case Tag.INT16:
      return "i16";
    case Tag.UINT16:
      return "u16";
    case Tag.UINT32:
    case Tag.UNICHAR:
      return "u32";
    case Tag.INT64:
      return "i64";
    case Tag.UINT64:
    case Tag.GTYPE:
      return "u64";
    case Tag.FLOAT:
      return "f32";
    case Tag.DOUBLE:
      return "f64";
    case Tag.INTERFACE:
      if (!t.pointer && t.iface?.kind === "enum") return "i32";
      if (!t.pointer && t.iface?.kind === "flags") return "u32";
      return "ptr";
    default:
      return "ptr";
  }
}

function rawOf(t: TypeD, v: unknown): bigint {
  if (v === null || v === undefined) return 0n;
  if (typeof v === "bigint") return BigInt.asUintN(64, v);
  if (t.tag === Tag.FLOAT) return f32bits(v as number);
  if (t.tag === Tag.DOUBLE) return f64bits(v as number);
  return u64(Number(v));
}

function nativeOf(t: TypeD, raw: bigint): unknown {
  const kind = ffiOf(t);
  if (kind === "void") return undefined;
  if (kind === "ptr") return Number(raw) || null;
  if (kind === "f32") return bitsF32(raw);
  if (kind === "f64") return bitsF64(raw);
  if (kind === "i64") return BigInt.asIntN(64, raw);
  if (kind === "u64") return BigInt.asUintN(64, raw);
  if (kind === "u32" || kind === "u8" || kind === "u16")
    return Number(BigInt.asUintN(32, raw));
  return Number(BigInt.asIntN(32, raw));
}

const liveCallbacks = new Map<number, JSCallback>();
let nextCallbackId = 1;
const destroyNotify = new JSCallback(
  (data: number | null) => {
    const id = Number(data ?? 0);
    const cb = liveCallbacks.get(id);
    liveCallbacks.delete(id);
    if (cb) setTimeout(() => cb.close(), 0);
  },
  { args: ["ptr"], returns: "void" },
);

/** Build a C function pointer for a GICallbackInfo backed by a JS function. */
export function makeCallback(info: Ptr, fn: Fn): JSCallback {
  const d = callableD(info);
  const userData = new Set<number>();
  d.args.forEach((a, i) => {
    if (a.closure === i) userData.add(i);
  });
  return new JSCallback(
    (...raw: unknown[]) => {
      const args: unknown[] = [];
      d.args.forEach((a, i) => {
        if (userData.has(i) || d.hidden.has(i)) return;
        args.push(decode(a.type, rawOf(a.type, raw[i]), Transfer.NOTHING));
      });
      try {
        const result = fn(...args);
        return nativeOf(
          d.ret,
          encode(
            d.ret,
            result,
            { keep: [], lengths: new Map(), after: [] },
            d.retTransfer,
          ),
        );
      } catch (error) {
        console.error(error);
        return nativeOf(d.ret, 0n);
      }
    },
    {
      args: d.args.map((a) => ffiOf(a.type)) as never,
      returns: ffiOf(d.ret) as never,
    },
  );
}

function encodeCallback(
  d: CallableD,
  i: number,
  v: unknown,
  raw: bigint[],
  ctx: Ctx,
): bigint {
  const a = d.args[i];
  if (v == null) return 0n;
  if (typeof v !== "function")
    throw new TypeError(`gi-bun: argument ${a.name} must be a function`);
  let fn = v as Fn;
  let cb: JSCallback | null = null;
  if (a.scope === Scope.ASYNC) {
    // Async callbacks fire once; release the trampoline after that call.
    const inner = fn;
    fn = (...args: unknown[]) => {
      try {
        return inner(...args);
      } finally {
        const self = cb;
        setTimeout(() => self?.close(), 0);
      }
    };
  }
  cb = makeCallback(a.type.iface?.info as Ptr, fn);
  const made = cb;
  if (a.scope === Scope.CALL) {
    ctx.after.push(() => made.close());
  } else {
    const id = nextCallbackId++;
    liveCallbacks.set(id, made);
    if (a.closure >= 0 && a.closure !== i) raw[a.closure] = BigInt(id);
    if (a.destroy >= 0) raw[a.destroy] = u64(destroyNotify.ptr as Ptr);
  }
  return u64(made.ptr as Ptr);
}

// --- invocation ------------------------------------------------------------

/** Invoke a GIFunctionInfo through gi_function_info_invoke (libffi). */
export function invoke(
  d: CallableD,
  self: Ptr | null,
  values: unknown[],
): unknown {
  const n = d.args.length;
  const raw: bigint[] = new Array(n).fill(0n);
  const ctx: Ctx = { keep: [], lengths: new Map(), after: [] };
  d.jsArgs.forEach((i, j) => {
    const a = d.args[i];
    const v = values[j] ?? null;
    if (v === null && !a.mayBeNull && needsValue(a.type))
      throw new TypeError(
        `gi-bun: ${d.name}() argument '${a.name}' must not be null`,
      );
    raw[i] =
      a.type.iface?.kind === "callback"
        ? encodeCallback(d, i, v, raw, ctx)
        : encode(a.type, v, ctx, a.transfer);
  });
  for (const [i, len] of ctx.lengths) raw[i] = BigInt(len);

  const nIn = d.nIn + (d.isMethod ? 1 : 0);
  const inArgs = new BigUint64Array(Math.max(1, nIn));
  const outArgs = new BigUint64Array(Math.max(1, d.nOut));
  const cells = new BigUint64Array(Math.max(1, n));
  const ret = new BigUint64Array(1);
  const err = new BigUint64Array(1);
  const cellBase = addr(cells);
  let ip = 0;
  let op = 0;
  if (d.isMethod) inArgs[ip++] = u64(self ?? 0);
  d.args.forEach((a, i) => {
    if (a.dir === Dir.IN) {
      inArgs[ip++] = raw[i];
    } else if (a.dir === Dir.OUT) {
      if (a.callerAllocates && a.type.iface && a.type.iface.size > 0) {
        const mem = glib.g_malloc0(a.type.iface.size) as Ptr;
        cells[i] = u64(mem);
        outArgs[op++] = u64(mem);
      } else {
        outArgs[op++] = u64(cellBase + i * 8);
      }
    } else {
      cells[i] = raw[i];
      inArgs[ip++] = u64(cellBase + i * 8);
      outArgs[op++] = u64(cellBase + i * 8);
    }
  });
  const ok = gi.gi_function_info_invoke(
    d.info,
    inArgs,
    nIn,
    outArgs,
    d.nOut,
    ret,
    err,
  );
  for (const f of ctx.after) f();
  if (!ok) {
    if (err[0]) throw takeError(Number(err[0]));
    throw new Error(`gi-bun: invoking ${d.symbol ?? d.name} failed`);
  }
  const valueAt = (i: number) => (d.args[i].dir === Dir.IN ? raw[i] : cells[i]);
  const lengthOf = (t: TypeD) =>
    t.tag === Tag.ARRAY && t.lengthIndex >= 0
      ? Number(decode(d.args[t.lengthIndex].type, valueAt(t.lengthIndex), 0))
      : -1;
  const outs: unknown[] = [];
  d.args.forEach((a, i) => {
    if (a.dir === Dir.IN || d.hidden.has(i)) return;
    if (a.callerAllocates && a.type.iface && a.type.iface.size > 0) {
      const mem = Number(cells[i]);
      outs.push(wrapStruct(a.type.iface, mem, false));
      glib.g_free(mem as Pointer);
      return;
    }
    outs.push(decode(a.type, cells[i], a.transfer, lengthOf(a.type)));
  });
  const hasReturn =
    !d.skipReturn && !(d.ret.tag === Tag.VOID && !d.ret.pointer);
  if (!hasReturn)
    return outs.length === 0 ? undefined : outs.length === 1 ? outs[0] : outs;
  const value = decode(d.ret, ret[0], d.retTransfer, lengthOf(d.ret));
  return outs.length === 0 ? value : [value, ...outs];
}

function needsValue(t: TypeD): boolean {
  return (
    t.tag === Tag.UTF8 ||
    t.tag === Tag.FILENAME ||
    (t.tag === Tag.INTERFACE && t.pointer && t.iface?.kind !== "callback")
  );
}

// --- GValue ----------------------------------------------------------------

function valueGType(v: Ptr): number {
  return Number(read.u64(v as Pointer, 0));
}

export function fromGValue(v: Ptr): unknown {
  const t = valueGType(v);
  const q = v as Pointer;
  switch (gobject.g_type_fundamental(t) as number) {
    case GType.BOOLEAN:
      return gobject.g_value_get_boolean(q) !== 0;
    case GType.CHAR:
      return gobject.g_value_get_schar(q);
    case GType.UCHAR:
      return gobject.g_value_get_uchar(q);
    case GType.INT:
      return gobject.g_value_get_int(q);
    case GType.UINT:
      return gobject.g_value_get_uint(q);
    case GType.LONG:
      return gobject.g_value_get_long(q);
    case GType.ULONG:
      return gobject.g_value_get_ulong(q);
    case GType.INT64:
      return gobject.g_value_get_int64(q);
    case GType.UINT64:
      return gobject.g_value_get_uint64(q);
    case GType.FLOAT:
      return gobject.g_value_get_float(q);
    case GType.DOUBLE:
      return gobject.g_value_get_double(q);
    case GType.ENUM:
      return gobject.g_value_get_enum(q);
    case GType.FLAGS:
      return gobject.g_value_get_flags(q);
    case GType.STRING:
      return cstr(gobject.g_value_get_string(q) as Ptr);
    case GType.POINTER:
      return (gobject.g_value_get_pointer(q) as Ptr) || null;
    case GType.OBJECT:
    case GType.INTERFACE:
      return wrapObject(gobject.g_value_get_object(q) as Ptr, false);
    case GType.PARAM: {
      const p = gobject.g_value_get_param(q) as Ptr;
      return p
        ? {
            name: cstr(gobject.g_param_spec_get_name(p as Pointer) as Ptr),
            [PTR]: p,
          }
        : null;
    }
    case GType.VARIANT:
      return wrapVariant(gobject.g_value_get_variant(q) as Ptr, false);
    case GType.BOXED: {
      const p = gobject.g_value_get_boxed(q) as Ptr;
      if (!p) return null;
      const info = gi.gi_repository_find_by_gtype(GI.repo, t) as Ptr;
      return info ? wrapStruct(ifaceD(info), p, false) : p;
    }
    default:
      if (
        gobject.g_type_is_a(
          t,
          gobject.g_type_from_name(cbuf("GType")) as number,
        )
      )
        return gobject.g_value_get_gtype(q);
      return undefined;
  }
}

export function toGValue(v: Ptr, value: unknown): void {
  const t = valueGType(v);
  const q = v as Pointer;
  switch (gobject.g_type_fundamental(t) as number) {
    case GType.BOOLEAN:
      return gobject.g_value_set_boolean(q, value ? 1 : 0);
    case GType.CHAR:
      return gobject.g_value_set_schar(q, Number(value));
    case GType.UCHAR:
      return gobject.g_value_set_uchar(q, Number(value));
    case GType.INT:
      return gobject.g_value_set_int(q, Number(value));
    case GType.UINT:
      return gobject.g_value_set_uint(q, Number(value));
    case GType.LONG:
      return gobject.g_value_set_long(q, value as number);
    case GType.ULONG:
      return gobject.g_value_set_ulong(q, value as number);
    case GType.INT64:
      return gobject.g_value_set_int64(q, value as number);
    case GType.UINT64:
      return gobject.g_value_set_uint64(q, value as number);
    case GType.FLOAT:
      return gobject.g_value_set_float(q, Number(value));
    case GType.DOUBLE:
      return gobject.g_value_set_double(q, Number(value));
    case GType.ENUM:
      return gobject.g_value_set_enum(q, Number(value));
    case GType.FLAGS:
      return gobject.g_value_set_flags(q, Number(value));
    case GType.STRING:
      return gobject.g_value_set_string(
        q,
        value == null ? null : cbuf(String(value)),
      );
    case GType.POINTER:
      return gobject.g_value_set_pointer(q, pointerOf(value) as Pointer);
    case GType.OBJECT:
    case GType.INTERFACE:
      return gobject.g_value_set_object(q, pointerOf(value) as Pointer);
    case GType.VARIANT:
      return gobject.g_value_set_variant(q, pointerOf(value) as Pointer);
    case GType.BOXED:
      return gobject.g_value_set_boxed(q, pointerOf(value) as Pointer);
    default:
      if (
        gobject.g_type_is_a(
          t,
          gobject.g_type_from_name(cbuf("GType")) as number,
        )
      )
        return gobject.g_value_set_gtype(q, gtypeOf(value));
      throw new TypeError(
        `gi-bun: cannot store a JS value in a GValue of type ${cstr(gobject.g_type_name(t) as Ptr)}`,
      );
  }
}

function withGValue<T>(gtype: number, fn: (v: Ptr) => T): T {
  const buf = new Uint8Array(GVALUE_SIZE);
  const v = addr(buf);
  gobject.g_value_init(v as Pointer, gtype);
  try {
    return fn(v);
  } finally {
    gobject.g_value_unset(v as Pointer);
  }
}

// --- properties ------------------------------------------------------------

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/_/g, "-");
const snake = (name: string) =>
  name.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const camel = (name: string) =>
  name.replace(/[-_]([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function findPSpec(klass: Ptr, name: string): Ptr {
  return gobject.g_object_class_find_property(
    klass as Pointer,
    cbuf(kebab(name)),
  ) as Ptr;
}

function pspecValueType(pspec: Ptr): number {
  return Number(read.u64(pspec as Pointer, 24));
}

export function getProperty(obj: Wrapper, name: string): unknown {
  const p = obj[PTR];
  const pspec = findPSpec(readPtr(p, 0), name);
  if (!pspec)
    throw new TypeError(`gi-bun: no property '${name}' on ${typeName(p)}`);
  return withGValue(pspecValueType(pspec), (v) => {
    gobject.g_object_get_property(
      p as Pointer,
      cbuf(kebab(name)),
      v as Pointer,
    );
    return fromGValue(v);
  });
}

export function setProperty(obj: Wrapper, name: string, value: unknown): void {
  const p = obj[PTR];
  const pspec = findPSpec(readPtr(p, 0), name);
  if (!pspec)
    throw new TypeError(`gi-bun: no property '${name}' on ${typeName(p)}`);
  withGValue(pspecValueType(pspec), (v) => {
    toGValue(v, value);
    gobject.g_object_set_property(
      p as Pointer,
      cbuf(kebab(name)),
      v as Pointer,
    );
  });
}

function typeName(p: Ptr): string {
  return cstr(gobject.g_type_name_from_instance(p as Pointer) as Ptr) ?? "?";
}

/** g_object_new_with_properties from a GJS-style property bag. */
export function newObject(
  gtype: number,
  props: Record<string, unknown> = {},
): Ptr {
  const klass = gobject.g_type_class_ref(gtype) as Ptr;
  const entries = Object.entries(props).filter(([, v]) => v !== undefined);
  const names = new BigUint64Array(Math.max(1, entries.length));
  const values = new Uint8Array(Math.max(1, entries.length) * GVALUE_SIZE);
  const base = addr(values);
  const keep: Buffer[] = [];
  let inited = 0;
  try {
    entries.forEach(([key, value], i) => {
      const pspec = findPSpec(klass, key);
      if (!pspec)
        throw new TypeError(
          `gi-bun: no property '${key}' on ${cstr(gobject.g_type_name(gtype) as Ptr)}`,
        );
      const b = cbuf(kebab(key));
      keep.push(b);
      names[i] = u64(addr(b));
      gobject.g_value_init(
        (base + i * GVALUE_SIZE) as Pointer,
        pspecValueType(pspec),
      );
      inited++;
      toGValue(base + i * GVALUE_SIZE, value);
    });
    const p = gobject.g_object_new_with_properties(
      gtype,
      entries.length,
      names,
      values,
    ) as Ptr;
    if (!p)
      throw new Error(
        `gi-bun: cannot construct ${cstr(gobject.g_type_name(gtype) as Ptr)}`,
      );
    return p;
  } finally {
    for (let i = 0; i < inited; i++)
      gobject.g_value_unset((base + i * GVALUE_SIZE) as Pointer);
    gobject.g_type_class_unref(klass as Pointer);
  }
}

// --- signals ---------------------------------------------------------------

const handlers = new Map<number, Fn>();
let nextHandler = 1;

// One marshaller serves every signal closure: GClosure->data (offset 16)
// carries the handler id, the parameters arrive as a GValue array.
const marshal = new JSCallback(
  (closure: number, ret: number | null, n: number, params: number) => {
    const fn = handlers.get(Number(read.u64(closure as Pointer, 16)));
    if (!fn) return;
    const args: unknown[] = [];
    for (let i = 0; i < n; i++) args.push(fromGValue(params + i * GVALUE_SIZE));
    try {
      const result = fn(...args);
      if (ret && valueGType(ret) !== 0 && result !== undefined)
        toGValue(ret, result);
    } catch (error) {
      console.error(error);
    }
  },
  { args: ["ptr", "ptr", "u32", "ptr", "ptr", "ptr"], returns: "void" },
);
const closureFinalized = new JSCallback(
  (data: number | null) => {
    handlers.delete(Number(data ?? 0));
  },
  { args: ["ptr", "ptr"], returns: "void" },
);

export function connect(
  obj: Wrapper,
  signal: string,
  fn: Fn,
  after = false,
): number {
  if (typeof fn !== "function")
    throw new TypeError("gi-bun: signal handler must be a function");
  const id = nextHandler++;
  handlers.set(id, fn);
  const closure = gobject.g_closure_new_simple(
    32,
    id as unknown as Pointer,
  ) as Ptr;
  gobject.g_closure_set_marshal(closure as Pointer, marshal.ptr);
  gobject.g_closure_add_finalize_notifier(
    closure as Pointer,
    id as unknown as Pointer,
    closureFinalized.ptr,
  );
  const hid = gobject.g_signal_connect_closure(
    obj[PTR] as Pointer,
    cbuf(signal),
    closure as Pointer,
    after ? 1 : 0,
  ) as number;
  if (!hid)
    throw new TypeError(
      `gi-bun: no signal '${signal}' on ${typeName(obj[PTR])}`,
    );
  return hid;
}

export function disconnect(obj: Wrapper, id: number): void {
  gobject.g_signal_handler_disconnect(obj[PTR] as Pointer, id);
}

export function emit(
  obj: Wrapper,
  signal: string,
  ...args: unknown[]
): unknown {
  const p = obj[PTR];
  const itype = instanceGType(p);
  const ids = new Uint32Array(2);
  if (
    !gobject.g_signal_parse_name(
      cbuf(signal),
      itype,
      addr(ids.subarray(0, 1)) as Pointer,
      addr(ids.subarray(1)) as Pointer,
      1,
    )
  )
    throw new TypeError(`gi-bun: no signal '${signal}' on ${typeName(p)}`);
  const q = new Uint8Array(56);
  gobject.g_signal_query(ids[0], q);
  const qv = new DataView(q.buffer);
  const returnType = Number(qv.getBigUint64(32, true) & ~1n);
  const nParams = qv.getUint32(40, true);
  const paramTypes = Number(qv.getBigUint64(48, true));
  const values = new Uint8Array((nParams + 1) * GVALUE_SIZE);
  const base = addr(values);
  gobject.g_value_init(base as Pointer, itype);
  gobject.g_value_set_object(base as Pointer, p as Pointer);
  for (let i = 0; i < nParams; i++) {
    const t = Number((read.u64(paramTypes as Pointer, i * 8) as bigint) & ~1n);
    const v = base + (i + 1) * GVALUE_SIZE;
    gobject.g_value_init(v as Pointer, t);
    toGValue(v, args[i]);
  }
  const retBuf = new Uint8Array(GVALUE_SIZE);
  const hasRet = returnType !== GType.NONE && returnType !== 0;
  if (hasRet) gobject.g_value_init(retBuf, returnType);
  try {
    gobject.g_signal_emitv(values, ids[0], ids[1], hasRet ? retBuf : null);
    return hasRet ? fromGValue(addr(retBuf)) : undefined;
  } finally {
    for (let i = 0; i <= nParams; i++)
      gobject.g_value_unset((base + i * GVALUE_SIZE) as Pointer);
    if (hasRet) gobject.g_value_unset(retBuf);
  }
}

// --- wrappers --------------------------------------------------------------

type Held = { p: Ptr; kind: "object" | "boxed" | "variant"; gtype: number };
const objects = new Map<Ptr, WeakRef<Wrapper>>();
const registry = new FinalizationRegistry<Held>((h) => {
  if (h.kind === "object") {
    if (!objects.get(h.p)?.deref()) objects.delete(h.p);
    gobject.g_object_unref(h.p as Pointer);
  } else if (h.kind === "boxed") {
    gobject.g_boxed_free(h.gtype, h.p as Pointer);
  } else {
    glib.g_variant_unref(h.p as Pointer);
  }
});

function adoptObject(target: Wrapper, p: Ptr): void {
  target[PTR] = p;
  objects.set(p, new WeakRef(target));
  registry.register(target, { p, kind: "object", gtype: 0 });
}

/** Wrap a GObject pointer; owns one reference released on garbage collection. */
export function wrapObject(p: Ptr, transferFull: boolean): Wrapper | null {
  if (!p) return null;
  const existing = objects.get(p)?.deref();
  if (existing) {
    if (transferFull) gobject.g_object_unref(p as Pointer);
    return existing;
  }
  if (gobject.g_object_is_floating(p as Pointer))
    gobject.g_object_ref_sink(p as Pointer);
  else if (!transferFull) gobject.g_object_ref(p as Pointer);
  const cls = classForGType(instanceGType(p));
  const obj = Object.create(cls.prototype) as Wrapper;
  adoptObject(obj, p);
  return obj;
}

function isBoxed(gtype: number): boolean {
  return (
    gtype > GType.VARIANT && gobject.g_type_fundamental(gtype) === GType.BOXED
  );
}

function wrapVariant(p: Ptr, transferFull: boolean): Wrapper | null {
  if (!p) return null;
  const cls = structClass(
    ifaceD(
      gi.gi_repository_find_by_name(
        GI.repo,
        cbuf("GLib"),
        cbuf("Variant"),
      ) as Ptr,
    ),
  );
  if (glib.g_variant_is_floating(p as Pointer))
    glib.g_variant_ref_sink(p as Pointer);
  else if (!transferFull) glib.g_variant_ref(p as Pointer);
  const obj = Object.create(cls.prototype) as Wrapper;
  obj[PTR] = p;
  registry.register(obj, { p, kind: "variant", gtype: 0 });
  return obj;
}

/** Wrap a struct/boxed/union pointer. Boxed values are owned (copied if borrowed). */
export function wrapStruct(
  i: IfaceD,
  p: Ptr,
  transferFull: boolean,
): Wrapper | null {
  if (!p) return null;
  if (i.ns === "GLib" && i.name === "Variant")
    return wrapVariant(p, transferFull);
  const cls = structClass(i);
  const obj = Object.create(cls.prototype) as Wrapper;
  if (isBoxed(i.gtype)) {
    const owned = transferFull
      ? p
      : (gobject.g_boxed_copy(i.gtype, p as Pointer) as Ptr);
    obj[PTR] = owned;
    registry.register(obj, { p: owned, kind: "boxed", gtype: i.gtype });
  } else {
    obj[PTR] = p;
  }
  return obj;
}

// --- generated classes -----------------------------------------------------

const define = (proto: object, name: string, value: unknown) =>
  Object.defineProperty(proto, name, {
    value,
    writable: true,
    configurable: true,
    enumerable: false,
  });

function methodFn(info: Ptr): Fn {
  let d: CallableD | null = null;
  const name = GI.name(info);
  const fn = function (this: Wrapper, ...args: unknown[]) {
    d ??= callableD(info);
    return invoke(d, d.isMethod ? this[PTR] : null, args);
  };
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}

function addCallables(cls: Fn, infos: Ptr[]): void {
  const proto = cls.prototype as object;
  for (const info of infos) {
    const name = GI.name(info);
    const target = gi.gi_callable_info_is_method(info) ? proto : cls;
    if (Object.hasOwn(target, name)) continue;
    let fn = methodFn(info);
    if (target === proto && name in SIGNAL_METHODS)
      fn = signalAware(name as keyof typeof SIGNAL_METHODS, fn);
    define(target, name, fn);
    const alias = camel(name);
    if (alias !== name && !Object.hasOwn(target, alias))
      define(target, alias, fn);
  }
}

// Introspected methods named like the GObject signal helpers (for example
// g_cancellable_connect) keep working, while a signal name as first argument
// (or a connected signal handler id) still selects the signal helper.
const SIGNAL_METHODS = { connect: 0, connect_after: 0, disconnect: 0, emit: 0 };

function signalAware(name: keyof typeof SIGNAL_METHODS, native: Fn): Fn {
  return function (this: Wrapper, ...args: unknown[]) {
    const signalCall =
      name === "disconnect"
        ? typeof args[0] === "number" &&
          !!gobject.g_signal_handler_is_connected(this[PTR] as Pointer, args[0])
        : typeof args[0] === "string";
    if (!signalCall) return native.apply(this, args);
    return (GObjectBase.prototype[name] as Fn).apply(this, args);
  };
}

function list(n: number, get: (i: number) => Ptr): Ptr[] {
  return Array.from({ length: n }, (_, i) => get(i));
}

/** Base of every generated GObject class. */
export class GObjectBase {
  declare [PTR]: Ptr;
  constructor(props?: Record<string, unknown>) {
    const gtype = (new.target as unknown as { [GTYPE]: number })[GTYPE];
    const p = newObject(gtype, props);
    if (gobject.g_object_is_floating(p as Pointer))
      gobject.g_object_ref_sink(p as Pointer);
    adoptObject(this as unknown as Wrapper, p);
  }
  connect(signal: string, fn: Fn): number {
    return connect(this as unknown as Wrapper, signal, fn, false);
  }
  connect_after(signal: string, fn: Fn): number {
    return connect(this as unknown as Wrapper, signal, fn, true);
  }
  disconnect(id: number): void {
    disconnect(this as unknown as Wrapper, id);
  }
  emit(signal: string, ...args: unknown[]): unknown {
    return emit(this as unknown as Wrapper, signal, ...args);
  }
  toString(): string {
    return `[object instance wrapper GType:${typeName(this[PTR])} ${this[PTR].toString(16)}]`;
  }
}

const classes = new Map<string, Fn>();
const constructorHooks = new Map<string, Fn>();
const gtypeClasses = new Map<number, Fn>();

function key(info: Ptr): string {
  return `${GI.namespace(info)}.${GI.name(info)}`;
}

function interfaceProps(info: Ptr, kind: InfoKind): Ptr[] {
  if (kind === "object")
    return list(gi.gi_object_info_get_n_properties(info), (i) =>
      gi.gi_object_info_get_property(info, i),
    );
  return list(gi.gi_interface_info_get_n_properties(info), (i) =>
    gi.gi_interface_info_get_property(info, i),
  );
}

function addProperties(proto: object, props: Ptr[]): void {
  for (const prop of props) {
    const name = GI.name(prop);
    for (const alias of new Set([name.replace(/-/g, "_"), camel(name)])) {
      if (alias in proto) continue;
      Object.defineProperty(proto, alias, {
        configurable: true,
        enumerable: false,
        get(this: Wrapper) {
          return getProperty(this, name);
        },
        set(this: Wrapper, value: unknown) {
          setProperty(this, name, value);
        },
      });
    }
  }
}

function mixInterface(proto: object, iface: Fn): void {
  for (const name of Object.getOwnPropertyNames(iface.prototype)) {
    if (name === "constructor" || name in proto) continue;
    const desc = Object.getOwnPropertyDescriptor(iface.prototype, name);
    if (desc) Object.defineProperty(proto, name, desc);
  }
}

/** JS class of a GIObjectInfo, with its parent chain and interfaces. */
export function objectClass(info: Ptr): Fn {
  const k = key(info);
  const cached = classes.get(k);
  if (cached) return cached;
  const parentInfo = gi.gi_object_info_get_parent(info) as Ptr;
  const parent = parentInfo
    ? objectClass(parentInfo)
    : (GObjectBase as unknown as Fn);
  const name = GI.name(info);
  const cls = {
    [name]: class extends (parent as unknown as typeof GObjectBase) {},
  }[name] as unknown as Fn;
  const gtype = gi.gi_registered_type_info_get_g_type(info) as number;
  Object.defineProperty(cls, GTYPE, { value: gtype });
  Object.defineProperty(cls, "$gtype", { value: gtype });
  Object.defineProperty(cls, INFO, { value: info });
  classes.set(k, cls);
  gtypeClasses.set(gtype, cls);
  addCallables(
    cls,
    list(gi.gi_object_info_get_n_methods(info), (i) =>
      gi.gi_object_info_get_method(info, i),
    ),
  );
  const proto = cls.prototype as object;
  addProperties(proto, interfaceProps(info, "object"));
  for (
    let i = 0;
    i < (gi.gi_object_info_get_n_interfaces(info) as number);
    i++
  ) {
    mixInterface(
      proto,
      interfaceClass(gi.gi_object_info_get_interface(info, i) as Ptr),
    );
  }
  for (const c of list(gi.gi_object_info_get_n_constants(info), (i) =>
    gi.gi_object_info_get_constant(info, i),
  )) {
    define(cls, GI.name(c), constantValue(c));
  }
  applyOverrides(k, cls);
  return cls;
}

/** JS class standing for a GIInterfaceInfo: a mixin source with instanceof support. */
export function interfaceClass(info: Ptr): Fn {
  const k = key(info);
  const cached = classes.get(k);
  if (cached) return cached;
  const name = GI.name(info);
  const gtype = gi.gi_registered_type_info_get_g_type(info) as number;
  const cls = {
    [name]: class {
      constructor() {
        throw new TypeError(`gi-bun: ${k} is an interface`);
      }
      static [Symbol.hasInstance](v: unknown): boolean {
        const p = (v as Wrapper | null)?.[PTR];
        return (
          typeof p === "number" &&
          !!gobject.g_type_is_a(instanceGType(p), gtype)
        );
      }
    },
  }[name] as unknown as Fn;
  Object.defineProperty(cls, GTYPE, { value: gtype });
  Object.defineProperty(cls, "$gtype", { value: gtype });
  classes.set(k, cls);
  addCallables(
    cls,
    list(gi.gi_interface_info_get_n_methods(info), (i) =>
      gi.gi_interface_info_get_method(info, i),
    ),
  );
  addProperties(cls.prototype as object, interfaceProps(info, "interface"));
  // Expose the signal helpers on the mixin so interface-typed values work.
  for (const m of ["connect", "connect_after", "disconnect", "emit"] as const)
    define(cls.prototype as object, m, GObjectBase.prototype[m]);
  return cls;
}

/** JS class of a GIStructInfo/GIUnionInfo (boxed or plain). */
export function structClass(i: IfaceD): Fn {
  const k = `${i.ns}.${i.name}`;
  const cached = classes.get(k);
  if (cached) return cached;
  const cls = {
    [i.name]: class {
      declare [PTR]: Ptr;
      constructor(...args: unknown[]) {
        const hook = constructorHooks.get(k);
        // biome-ignore lint: constructor returns the wrapped native value
        if (hook) return hook(...args) as never;
        const ctor = (cls as unknown as { new?: Fn }).new;
        if (typeof ctor === "function" && Object.hasOwn(cls, "new")) {
          const made = ctor(...args) as Wrapper;
          // biome-ignore lint: constructor returns the wrapped native value
          return made as never;
        }
        if (!i.size) throw new TypeError(`gi-bun: ${k} has no constructor`);
        const mem = glib.g_malloc0(i.size) as Ptr;
        if (isBoxed(i.gtype)) {
          const owned = gobject.g_boxed_copy(i.gtype, mem as Pointer) as Ptr;
          glib.g_free(mem as Pointer);
          this[PTR] = owned;
          registry.register(this, { p: owned, kind: "boxed", gtype: i.gtype });
        } else {
          this[PTR] = mem;
        }
      }
    },
  }[i.name] as unknown as Fn;
  Object.defineProperty(cls, GTYPE, { value: i.gtype });
  Object.defineProperty(cls, "$gtype", { value: i.gtype });
  classes.set(k, cls);
  const info = i.info;
  const methods =
    i.kind === "union"
      ? list(gi.gi_union_info_get_n_methods(info), (n) =>
          gi.gi_union_info_get_method(info, n),
        )
      : list(gi.gi_struct_info_get_n_methods(info), (n) =>
          gi.gi_struct_info_get_method(info, n),
        );
  addCallables(cls, methods);
  applyOverrides(k, cls);
  return cls;
}

/** Class of a runtime GType, synthesizing one for private subclasses. */
export function classForGType(gtype: number): Fn {
  const cached = gtypeClasses.get(gtype);
  if (cached) return cached;
  const info = gi.gi_repository_find_by_gtype(GI.repo, gtype) as Ptr;
  if (info && GI.kind(info) === "object") {
    const cls = objectClass(info);
    gtypeClasses.set(gtype, cls);
    return cls;
  }
  const parentType = gobject.g_type_parent(gtype) as number;
  const parent = parentType
    ? classForGType(parentType)
    : (GObjectBase as unknown as Fn);
  const name = cstr(gobject.g_type_name(gtype) as Ptr) ?? "Anonymous";
  const cls = {
    [name]: class extends (parent as unknown as typeof GObjectBase) {},
  }[name] as unknown as Fn;
  Object.defineProperty(cls, GTYPE, { value: gtype });
  const count = new Uint32Array(1);
  const ifaces = gobject.g_type_interfaces(gtype, count) as Ptr;
  for (let i = 0; i < count[0]; i++) {
    const iinfo = gi.gi_repository_find_by_gtype(
      GI.repo,
      Number(read.u64(ifaces as Pointer, i * 8)),
    ) as Ptr;
    if (iinfo && GI.kind(iinfo) === "interface")
      mixInterface(cls.prototype as object, interfaceClass(iinfo));
  }
  if (ifaces) glib.g_free(ifaces as Pointer);
  gtypeClasses.set(gtype, cls);
  return cls;
}

// --- enums and constants ---------------------------------------------------

function enumObject(info: Ptr): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < (gi.gi_enum_info_get_n_values(info) as number); i++) {
    const v = gi.gi_enum_info_get_value(info, i) as Ptr;
    out[GI.name(v).toUpperCase()] = Number(gi.gi_value_info_get_value(v));
    GI.unref(v);
  }
  const holder = function () {} as unknown as Fn;
  addCallables(
    holder,
    list(gi.gi_enum_info_get_n_methods(info), (i) =>
      gi.gi_enum_info_get_method(info, i),
    ),
  );
  for (const name of Object.getOwnPropertyNames(holder)) {
    if (!["length", "name", "prototype"].includes(name))
      out[name] = (holder as unknown as Record<string, unknown>)[name];
  }
  const gtype = gi.gi_registered_type_info_get_g_type(info) as number;
  Object.defineProperty(out, "$gtype", { value: gtype });
  return Object.freeze(out);
}

function constantValue(info: Ptr): unknown {
  const ti = gi.gi_constant_info_get_type_info(info) as Ptr;
  const t = typeD(ti);
  GI.unref(ti);
  const arg = new BigUint64Array(1);
  gi.gi_constant_info_get_value(info, arg);
  const value = decode(t, arg[0], Transfer.NOTHING);
  gi.gi_constant_info_free_value(info, arg);
  return value;
}

// --- namespaces ------------------------------------------------------------

const namespaces = new Map<string, Record<string, unknown>>();

function valueOfInfo(info: Ptr): unknown {
  switch (GI.kind(info)) {
    case "function":
      return methodFn(info);
    case "object":
      return objectClass(info);
    case "interface":
      return interfaceClass(info);
    case "struct":
    case "boxed":
    case "union":
      return structClass(ifaceD(info));
    case "enum":
    case "flags":
      return enumObject(info);
    case "constant":
      return constantValue(info);
    case "callback":
      return { $callback: key(info) };
    default:
      return undefined;
  }
}

function infoNames(ns: string): string[] {
  const nsb = cbuf(ns);
  const n = gi.gi_repository_get_n_infos(GI.repo, nsb) as number;
  return list(n, (i) => gi.gi_repository_get_info(GI.repo, nsb, i)).map(
    (info) => {
      const name = GI.name(info);
      GI.unref(info);
      return name;
    },
  );
}

/** Load a typelib (dependencies included) and return its namespace object. */
export function require(
  ns: string,
  version?: string | null,
): Record<string, unknown> {
  const cached = namespaces.get(ns);
  if (cached) return cached;
  const err = new BigUint64Array(1);
  const typelib = gi.gi_repository_require(
    GI.repo,
    cbuf(ns),
    version ? cbuf(version) : null,
    0,
    err,
  );
  if (!typelib) throw takeError(Number(err[0]));
  const loadedVersion = cstr(
    gi.gi_repository_get_version(GI.repo, cbuf(ns)) as Ptr,
  );
  const cache = new Map<string, unknown>();
  const target: Record<string, unknown> = Object.create(null);
  const nsb = cbuf(ns);
  const proxy: Record<string, unknown> = new Proxy(target, {
    get(_t, prop) {
      if (typeof prop !== "string" || prop === "then") return undefined;
      if (prop === "__name__") return ns;
      if (prop === "__version__") return loadedVersion;
      if (cache.has(prop)) return cache.get(prop);
      let info = gi.gi_repository_find_by_name(GI.repo, nsb, cbuf(prop)) as Ptr;
      if (!info && /[a-z][A-Z]/.test(prop))
        info = gi.gi_repository_find_by_name(
          GI.repo,
          nsb,
          cbuf(snake(prop)),
        ) as Ptr;
      const value = info ? valueOfInfo(info) : overrideFor(ns, prop);
      cache.set(prop, value);
      return value;
    },
    has(_t, prop) {
      return typeof prop === "string" && proxy[prop] !== undefined;
    },
    ownKeys() {
      return infoNames(ns);
    },
    getOwnPropertyDescriptor(_t, prop) {
      const value: unknown = proxy[prop as string];
      return value === undefined
        ? undefined
        : { value, enumerable: true, configurable: true, writable: false };
    },
  });
  namespaces.set(ns, proxy);
  return proxy;
}

export interface Inventory {
  namespace: string;
  version: string | null;
  objects: string[];
  interfaces: string[];
  structs: string[];
  unions: string[];
  functions: string[];
  enums: string[];
  flags: string[];
  constants: string[];
  callbacks: string[];
}

/** Enumerate every info of a loaded namespace through GIRepository. */
export function enumerate(ns: string, version?: string | null): Inventory {
  require(ns, version);
  const inv: Inventory = {
    namespace: ns,
    version: cstr(gi.gi_repository_get_version(GI.repo, cbuf(ns)) as Ptr),
    objects: [],
    interfaces: [],
    structs: [],
    unions: [],
    functions: [],
    enums: [],
    flags: [],
    constants: [],
    callbacks: [],
  };
  const nsb = cbuf(ns);
  const n = gi.gi_repository_get_n_infos(GI.repo, nsb) as number;
  for (let i = 0; i < n; i++) {
    const info = gi.gi_repository_get_info(GI.repo, nsb, i) as Ptr;
    const name = GI.name(info);
    const bucket = (
      {
        object: inv.objects,
        interface: inv.interfaces,
        struct: inv.structs,
        boxed: inv.structs,
        union: inv.unions,
        function: inv.functions,
        enum: inv.enums,
        flags: inv.flags,
        constant: inv.constants,
        callback: inv.callbacks,
      } as Partial<Record<InfoKind, string[]>>
    )[GI.kind(info)];
    bucket?.push(name);
    GI.unref(info);
  }
  return inv;
}

/** Describe one info: kind, C symbol, methods, properties, signals, values. */
export function describe(
  ns: string,
  name: string,
): Record<string, unknown> | null {
  require(ns);
  const info = gi.gi_repository_find_by_name(
    GI.repo,
    cbuf(ns),
    cbuf(name),
  ) as Ptr;
  if (!info) return null;
  const kind = GI.kind(info);
  const names = (infos: Ptr[]) => infos.map((i) => GI.name(i));
  const out: Record<string, unknown> = { namespace: ns, name, kind };
  if (kind === "function") {
    const d = callableD(info);
    out.symbol = d.symbol;
    out.args = d.args.map((a) => ({
      name: a.name,
      direction: ["in", "out", "inout"][a.dir],
      tag: a.type.tag,
    }));
    out.throws = d.throws;
  } else if (kind === "object") {
    const parent = gi.gi_object_info_get_parent(info) as Ptr;
    out.parent = parent ? key(parent) : null;
    out.gtype = gi.gi_registered_type_info_get_g_type(info);
    out.methods = names(
      list(gi.gi_object_info_get_n_methods(info), (i) =>
        gi.gi_object_info_get_method(info, i),
      ),
    );
    out.properties = names(interfaceProps(info, "object"));
    out.signals = names(
      list(gi.gi_object_info_get_n_signals(info), (i) =>
        gi.gi_object_info_get_signal(info, i),
      ),
    );
    out.interfaces = list(gi.gi_object_info_get_n_interfaces(info), (i) =>
      gi.gi_object_info_get_interface(info, i),
    ).map(key);
  } else if (kind === "interface") {
    out.methods = names(
      list(gi.gi_interface_info_get_n_methods(info), (i) =>
        gi.gi_interface_info_get_method(info, i),
      ),
    );
    out.properties = names(interfaceProps(info, "interface"));
    out.signals = names(
      list(gi.gi_interface_info_get_n_signals(info), (i) =>
        gi.gi_interface_info_get_signal(info, i),
      ),
    );
  } else if (kind === "struct" || kind === "boxed" || kind === "union") {
    out.methods = names(
      kind === "union"
        ? list(gi.gi_union_info_get_n_methods(info), (i) =>
            gi.gi_union_info_get_method(info, i),
          )
        : list(gi.gi_struct_info_get_n_methods(info), (i) =>
            gi.gi_struct_info_get_method(info, i),
          ),
    );
  } else if (kind === "enum" || kind === "flags") {
    out.values = enumObject(info);
  } else if (kind === "constant") {
    out.value = constantValue(info);
  }
  return out;
}

// --- GJS-compatible overrides ----------------------------------------------

function overrideFor(_ns: string, _prop: string): unknown {
  return undefined;
}

const loopWaiters = new WeakMap<object, () => void>();

function applyOverrides(k: string, cls: Fn): void {
  const proto = cls.prototype as Record<string, unknown>;
  if (k === "GObject.Object") {
    define(proto, "get_property", function (this: Wrapper, name: string) {
      return getProperty(this, name);
    });
    define(
      proto,
      "set_property",
      function (this: Wrapper, name: string, value: unknown) {
        setProperty(this, name, value);
      },
    );
    define(
      proto,
      "set",
      function (this: Wrapper, props: Record<string, unknown>) {
        for (const [name, value] of Object.entries(props))
          setProperty(this, name, value);
      },
    );
  } else if (k === "GLib.MainLoop") {
    const nativeQuit = proto.quit as Fn;
    // Cooperative run: GLib sources are dispatched from the Bun event loop,
    // so Bun timers, I/O and promises keep running. `run()` stays blocking
    // like GJS; `runAsync()` resolves when `quit()` is called.
    define(proto, "runAsync", function (this: Wrapper) {
      return new Promise<void>((resolve) => {
        mainloop.start();
        loopWaiters.set(this, () => {
          mainloop.stop();
          resolve();
        });
      });
    });
    define(proto, "quit", function (this: Wrapper) {
      nativeQuit.call(this);
      const done = loopWaiters.get(this);
      loopWaiters.delete(this);
      done?.();
    });
  } else if (k === "GLib.Variant") {
    variantOverrides(cls);
  }
}

function variantOverrides(cls: Fn): void {
  const statics = cls as unknown as Record<string, Fn>;
  const make = (sig: string, value: unknown): unknown => {
    switch (sig) {
      case "s":
        return statics.new_string(value);
      case "o":
        return statics.new_object_path(value);
      case "g":
        return statics.new_signature(value);
      case "b":
        return statics.new_boolean(value);
      case "y":
        return statics.new_byte(value);
      case "n":
        return statics.new_int16(value);
      case "q":
        return statics.new_uint16(value);
      case "i":
        return statics.new_int32(value);
      case "u":
        return statics.new_uint32(value);
      case "x":
        return statics.new_int64(value);
      case "t":
        return statics.new_uint64(value);
      case "h":
        return statics.new_handle(value);
      case "d":
        return statics.new_double(value);
      case "as":
        return statics.new_strv(value);
      case "v":
        return statics.new_variant(value);
      default:
        throw new TypeError(
          `gi-bun: GLib.Variant signature '${sig}' is not supported yet`,
        );
    }
  };
  // `new GLib.Variant('s', 'hello')` as in GJS.
  constructorHooks.set("GLib.Variant", (sig: unknown, value: unknown) =>
    make(String(sig), value),
  );
  const proto = cls.prototype as Record<string, unknown>;
  define(proto, "unpack", function (this: Record<string, Fn>) {
    const sig = this.get_type_string() as string;
    switch (sig) {
      case "s":
      case "o":
      case "g":
        return (this.get_string() as unknown[])[0];
      case "b":
        return this.get_boolean();
      case "y":
        return this.get_byte();
      case "n":
        return this.get_int16();
      case "q":
        return this.get_uint16();
      case "i":
        return this.get_int32();
      case "u":
        return this.get_uint32();
      case "x":
        return this.get_int64();
      case "t":
        return this.get_uint64();
      case "h":
        return this.get_handle();
      case "d":
        return this.get_double();
      case "as":
        return this.get_strv();
      case "v":
        return this.get_variant();
      default:
        return this;
    }
  });
  define(proto, "deepUnpack", proto.unpack);
  define(proto, "toString", function (this: Wrapper) {
    const s = glib.g_variant_print(this[PTR] as Pointer, 1) as Ptr;
    const out = cstr(s);
    glib.g_free(s as Pointer);
    return `GLib.Variant(${out})`;
  });
}
