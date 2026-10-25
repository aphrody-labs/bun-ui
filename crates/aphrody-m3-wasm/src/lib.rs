// SPDX-License-Identifier: Apache-2.0
//! WebAssembly bindings of the single Material 3 color engine.
//!
//! Every color is resolved by `aphrody-m3-tokens` (HCT, dynamic schemes, contrast, quantize and
//! score) and every host theme is written by `aphrody-m3-emit`. JavaScript consumers
//! (`@aphrody/m3-wasm`, `@aphrody/m3-tokens`) carry no color science of their own.

use aphrody_m3_emit::{Target, Theme, emit as emit_theme, hex};
use aphrody_m3_tokens::{
    blend, hct, image,
    palette::{CorePalette, TonalPalette},
    role::Role,
    scheme::{DynamicScheme, Variant},
};
use js_sys::{Array, Object, Reflect};
use wasm_bindgen::prelude::*;

/// Parses a variant name: kebab-case (`tonal-spot`), snake_case or camelCase (`tonalSpot`).
fn parse_variant(name: &str) -> Result<Variant, JsError> {
    let mut kebab = String::with_capacity(name.len() + 2);
    for ch in name.chars() {
        if ch.is_ascii_uppercase() {
            kebab.push('-');
            kebab.push(ch.to_ascii_lowercase());
        } else {
            kebab.push(ch);
        }
    }
    Variant::from_name(&kebab).ok_or_else(|| JsError::new(&format!("Unknown M3 scheme variant: {name}")))
}

fn check_contrast(contrast: f64) -> Result<f64, JsError> {
    if contrast.is_finite() && (-1.0..=1.0).contains(&contrast) {
        Ok(contrast)
    } else {
        Err(JsError::new("M3 contrast must be a finite number between -1 and 1"))
    }
}

fn set(obj: &Object, key: &str, value: &JsValue) {
    // Reflect.set only fails on frozen or non-object targets; `obj` is a fresh plain object.
    let _ = Reflect::set(obj, &JsValue::from_str(key), value);
}

fn scheme(argb: u32, variant: &str, dark: bool, contrast: f64) -> Result<DynamicScheme, JsError> {
    Ok(DynamicScheme::from_argb(argb, parse_variant(variant)?, dark, check_contrast(contrast)?))
}

/// Opaque `0xAARRGGBB` from a CSS hex (`#rgb`, `#rrggbb`, with or without `#`).
#[wasm_bindgen(js_name = argbFromHex)]
pub fn argb_from_hex(hex_text: &str) -> Result<u32, JsError> {
    let digits = hex_text.trim().trim_start_matches('#');
    let expanded: String = match digits.len() {
        3 => digits.chars().flat_map(|c| [c, c]).collect(),
        6 => digits.to_owned(),
        _ => return Err(JsError::new(&format!("Invalid hex color: {hex_text}"))),
    };
    u32::from_str_radix(&expanded, 16)
        .map(|rgb| 0xff00_0000 | rgb)
        .map_err(|_| JsError::new(&format!("Invalid hex color: {hex_text}")))
}

/// `#rrggbb` of an ARGB color.
#[wasm_bindgen(js_name = hexFromArgb)]
#[must_use]
pub fn hex_from_argb(argb: u32) -> String {
    hex(argb)
}

/// Camel-case names of every system role (`MaterialDynamicColors` keys), in engine order.
#[wasm_bindgen(js_name = roleNames)]
#[must_use]
pub fn role_names() -> Array {
    Role::ALL.iter().map(|role| JsValue::from_str(role.camel_name())).collect()
}

/// Kebab-case names of every scheme variant.
#[wasm_bindgen(js_name = variantNames)]
#[must_use]
pub fn variant_names() -> Array {
    Variant::ALL.iter().map(|variant| JsValue::from_str(variant.name())).collect()
}

/// Every system role of one mode: `{ primary: "#rrggbb", onPrimary: …, … }` (camel-case keys).
#[wasm_bindgen(js_name = schemeFromSeed)]
pub fn scheme_from_seed(argb: u32, variant: &str, dark: bool, contrast: f64) -> Result<Object, JsError> {
    let resolved = scheme(argb, variant, dark, contrast)?;
    let out = Object::new();
    for (role, value) in resolved.roles() {
        set(&out, role.camel_name(), &JsValue::from_str(&hex(value)));
    }
    Ok(out)
}

/// Same roles as [`scheme_from_seed`], as ARGB numbers.
#[wasm_bindgen(js_name = schemeArgbFromSeed)]
pub fn scheme_argb_from_seed(argb: u32, variant: &str, dark: bool, contrast: f64) -> Result<Object, JsError> {
    let resolved = scheme(argb, variant, dark, contrast)?;
    let out = Object::new();
    for (role, value) in resolved.roles() {
        set(&out, role.camel_name(), &JsValue::from_f64(f64::from(value)));
    }
    Ok(out)
}

/// The `aphrody-m3-emit` CSS stylesheet (light, dark and `prefers-color-scheme`) for a seed.
#[wasm_bindgen(js_name = cssForSeed)]
pub fn css_for_seed(argb: u32, variant: &str, contrast: f64) -> Result<String, JsError> {
    emit(argb, "css", variant, contrast)
}

/// A host theme from a seed: `css`, `gtk`, `kde`, `cosmic`, `qml`, `winui`, `hyprland` or `dtcg`.
#[wasm_bindgen]
pub fn emit(argb: u32, target: &str, variant: &str, contrast: f64) -> Result<String, JsError> {
    let target = Target::from_name(target).ok_or_else(|| JsError::new(&format!("Unknown m3-emit target: {target}")))?;
    let theme = Theme {
        seed: argb,
        variant: parse_variant(variant)?,
        contrast: check_contrast(contrast)?,
    };
    Ok(emit_theme(&theme, target))
}

/// Names of every `emit` target.
#[wasm_bindgen(js_name = emitTargets)]
#[must_use]
pub fn emit_targets() -> Array {
    Target::ALL.iter().map(|target| JsValue::from_str(target.name())).collect()
}

/// The color most suitable for a theme from tightly packed RGBA8 pixels
/// (`ImageData.data`): Celebi quantize to 128 colors, then score.
#[wasm_bindgen(js_name = sourceColorFromImage)]
#[must_use]
pub fn source_color_from_image(rgba: &[u8]) -> u32 {
    image::source_color_from_rgba8(rgba)
}

/// Rotates `design`'s hue up to 15 degrees toward `source`, keeping chroma and tone.
#[wasm_bindgen]
#[must_use]
pub fn harmonize(design: u32, source: u32) -> u32 {
    blend::harmonize(design, source)
}

/// One tone of the tonal palette of `hue` and `chroma`.
#[wasm_bindgen(js_name = paletteTone)]
#[must_use]
pub fn palette_tone(hue: f64, chroma: f64, tone: f64) -> u32 {
    TonalPalette::from_hue_and_chroma(hue, chroma).tone(tone)
}

/// The legacy `CorePalette` scheme (`themeFromSourceColor(...).schemes.light|dark`): camel-case
/// role keys to ARGB numbers.
#[wasm_bindgen(js_name = legacySchemeFromSeed)]
#[must_use]
pub fn legacy_scheme_from_seed(argb: u32, dark: bool) -> Object {
    let core = CorePalette::of(argb);
    let (a1, a2, a3, n1, n2, e) = (&core.a1, &core.a2, &core.a3, &core.n1, &core.n2, &core.error);
    let t = |light: f64, dark_tone: f64| if dark { dark_tone } else { light };
    let roles: [(&str, &TonalPalette, f64); 29] = [
        ("primary", a1, t(40.0, 80.0)),
        ("onPrimary", a1, t(100.0, 20.0)),
        ("primaryContainer", a1, t(90.0, 30.0)),
        ("onPrimaryContainer", a1, t(10.0, 90.0)),
        ("secondary", a2, t(40.0, 80.0)),
        ("onSecondary", a2, t(100.0, 20.0)),
        ("secondaryContainer", a2, t(90.0, 30.0)),
        ("onSecondaryContainer", a2, t(10.0, 90.0)),
        ("tertiary", a3, t(40.0, 80.0)),
        ("onTertiary", a3, t(100.0, 20.0)),
        ("tertiaryContainer", a3, t(90.0, 30.0)),
        ("onTertiaryContainer", a3, t(10.0, 90.0)),
        ("error", e, t(40.0, 80.0)),
        ("onError", e, t(100.0, 20.0)),
        ("errorContainer", e, t(90.0, 30.0)),
        ("onErrorContainer", e, t(10.0, 90.0)),
        ("background", n1, t(99.0, 10.0)),
        ("onBackground", n1, t(10.0, 90.0)),
        ("surface", n1, t(99.0, 10.0)),
        ("onSurface", n1, t(10.0, 90.0)),
        ("surfaceVariant", n2, t(90.0, 30.0)),
        ("onSurfaceVariant", n2, t(30.0, 80.0)),
        ("outline", n2, t(50.0, 60.0)),
        ("outlineVariant", n2, t(80.0, 30.0)),
        ("shadow", n1, 0.0),
        ("scrim", n1, 0.0),
        ("inverseSurface", n1, t(20.0, 90.0)),
        ("inverseOnSurface", n1, t(95.0, 20.0)),
        ("inversePrimary", a1, t(80.0, 40.0)),
    ];
    let out = Object::new();
    for (name, palette, tone) in roles {
        set(&out, name, &JsValue::from_f64(f64::from(palette.tone(tone))));
    }
    out
}

/// A color in hue, chroma and tone (the `Hct` of material-color-utilities).
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct Hct(hct::Hct);

#[wasm_bindgen]
impl Hct {
    /// The displayable color closest to `hue`, `chroma` and `tone`.
    #[wasm_bindgen(js_name = from)]
    #[must_use]
    pub fn from_hct(hue: f64, chroma: f64, tone: f64) -> Hct {
        Hct(hct::Hct::new(hue, chroma, tone))
    }

    /// The HCT of an ARGB color.
    #[wasm_bindgen(js_name = fromInt)]
    #[must_use]
    pub fn from_int(argb: u32) -> Hct {
        Hct(hct::Hct::from_argb(argb))
    }

    /// Hue angle in degrees.
    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn hue(&self) -> f64 {
        self.0.hue
    }

    /// Chroma.
    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn chroma(&self) -> f64 {
        self.0.chroma
    }

    /// Tone (L*).
    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn tone(&self) -> f64 {
        self.0.tone
    }

    /// The opaque ARGB value.
    #[wasm_bindgen(js_name = toInt)]
    #[must_use]
    pub fn to_int(&self) -> u32 {
        self.0.to_argb()
    }
}
