/* tslint:disable */
/* eslint-disable */

/**
 * A color in hue, chroma and tone (the `Hct` of material-color-utilities).
 */
export class Hct {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * The HCT of an ARGB color.
     */
    static fromInt(argb: number): Hct;
    /**
     * The displayable color closest to `hue`, `chroma` and `tone`.
     */
    static from(hue: number, chroma: number, tone: number): Hct;
    /**
     * The opaque ARGB value.
     */
    toInt(): number;
    /**
     * Chroma.
     */
    readonly chroma: number;
    /**
     * Hue angle in degrees.
     */
    readonly hue: number;
    /**
     * Tone (L*).
     */
    readonly tone: number;
}

/**
 * Opaque `0xAARRGGBB` from a CSS hex (`#rgb`, `#rrggbb`, with or without `#`).
 */
export function argbFromHex(hex_text: string): number;

/**
 * The `aphrody-m3-emit` CSS stylesheet (light, dark and `prefers-color-scheme`) for a seed.
 */
export function cssForSeed(argb: number, variant: string, contrast: number): string;

/**
 * A host theme from a seed: `css`, `gtk`, `kde`, `cosmic`, `qml`, `winui`, `hyprland` or `dtcg`.
 */
export function emit(argb: number, target: string, variant: string, contrast: number): string;

/**
 * Names of every `emit` target.
 */
export function emitTargets(): Array<any>;

/**
 * Rotates `design`'s hue up to 15 degrees toward `source`, keeping chroma and tone.
 */
export function harmonize(design: number, source: number): number;

/**
 * `#rrggbb` of an ARGB color.
 */
export function hexFromArgb(argb: number): string;

/**
 * The legacy `CorePalette` scheme (`themeFromSourceColor(...).schemes.light|dark`): camel-case
 * role keys to ARGB numbers.
 */
export function legacySchemeFromSeed(argb: number, dark: boolean): object;

/**
 * One tone of the tonal palette of `hue` and `chroma`.
 */
export function paletteTone(hue: number, chroma: number, tone: number): number;

/**
 * Camel-case names of every system role (`MaterialDynamicColors` keys), in engine order.
 */
export function roleNames(): Array<any>;

/**
 * Same roles as [`scheme_from_seed`], as ARGB numbers.
 */
export function schemeArgbFromSeed(argb: number, variant: string, dark: boolean, contrast: number): object;

/**
 * Every system role of one mode: `{ primary: "#rrggbb", onPrimary: …, … }` (camel-case keys).
 */
export function schemeFromSeed(argb: number, variant: string, dark: boolean, contrast: number): object;

/**
 * The color most suitable for a theme from tightly packed RGBA8 pixels
 * (`ImageData.data`): Celebi quantize to 128 colors, then score.
 */
export function sourceColorFromImage(rgba: Uint8Array): number;

/**
 * Kebab-case names of every scheme variant.
 */
export function variantNames(): Array<any>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_hct_free: (a: number, b: number) => void;
    readonly argbFromHex: (a: number, b: number, c: number) => void;
    readonly cssForSeed: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly emit: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly emitTargets: () => number;
    readonly harmonize: (a: number, b: number) => number;
    readonly hct_chroma: (a: number) => number;
    readonly hct_from: (a: number, b: number, c: number) => number;
    readonly hct_fromInt: (a: number) => number;
    readonly hct_hue: (a: number) => number;
    readonly hct_toInt: (a: number) => number;
    readonly hct_tone: (a: number) => number;
    readonly hexFromArgb: (a: number, b: number) => void;
    readonly legacySchemeFromSeed: (a: number, b: number) => number;
    readonly paletteTone: (a: number, b: number, c: number) => number;
    readonly roleNames: () => number;
    readonly schemeArgbFromSeed: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly schemeFromSeed: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly sourceColorFromImage: (a: number, b: number) => number;
    readonly variantNames: () => number;
    readonly __wbindgen_export: (a: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
