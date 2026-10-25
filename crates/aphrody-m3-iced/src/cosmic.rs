// SPDX-License-Identifier: Apache-2.0
//! libcosmic `cosmic-theme` builder (config schema v2) from one M3 scheme.
//!
//! Mirrors the `cosmic` column of `catalog/conversion.toml` and the RON written by
//! `aphrody-m3-emit` (`com.system76.CosmicTheme.{Light,Dark}.Builder/v2/<field>`).

use aphrody_m3_tokens::blend::custom_color;
use cosmic_theme::palette::{Srgb, Srgba};
use cosmic_theme::{CornerRadii, Spacing, Theme, ThemeBuilder};

use crate::{DynamicScheme, Role, WARNING_SEED, SUCCESS_SEED, shape};

fn rgb(argb: u32) -> Srgb {
    let c = |shift: u32| f32::from(((argb >> shift) & 0xFF) as u8) / 255.0;
    Srgb::new(c(16), c(8), c(0))
}

fn rgba(argb: u32) -> Srgba {
    let c = rgb(argb);
    Srgba::new(c.red, c.green, c.blue, 1.0)
}

/// M3 shape scale as cosmic corner radii (0, 4, 8, 12, 16, 28).
#[must_use]
pub fn corner_radii() -> CornerRadii {
    let r = |v: f32| [v; 4];
    CornerRadii {
        radius_0: r(shape::NONE),
        radius_xs: r(shape::EXTRA_SMALL),
        radius_s: r(shape::SMALL),
        radius_m: r(shape::MEDIUM),
        radius_l: r(shape::LARGE),
        radius_xl: r(shape::EXTRA_LARGE),
    }
}

/// The 4 dp grid as cosmic spacing.
#[must_use]
pub fn spacing() -> Spacing {
    Spacing {
        space_none: 0,
        space_xxxs: 4,
        space_xxs: 8,
        space_xs: 12,
        space_s: 16,
        space_m: 24,
        space_l: 32,
        space_xl: 48,
        space_xxl: 64,
        space_xxxl: 128,
    }
}

/// A `ThemeBuilder` (schema v2) carrying the M3 roles of `scheme`.
#[must_use]
pub fn builder(scheme: &DynamicScheme) -> ThemeBuilder {
    let high = scheme.contrast_level >= 1.0;
    let mut b = match (scheme.is_dark, high) {
        (true, false) => ThemeBuilder::dark(),
        (false, false) => ThemeBuilder::light(),
        (true, true) => ThemeBuilder::dark_high_contrast(),
        (false, true) => ThemeBuilder::light_high_contrast(),
    };
    let source = scheme.source.to_argb();
    let extended = |seed: u32| {
        let c = custom_color(source, seed, true);
        rgb(if scheme.is_dark { c.dark.color } else { c.light.color })
    };
    b.accent = Some(rgb(scheme.argb(Role::Primary)));
    b.bg_color = Some(rgba(scheme.argb(Role::Surface)));
    b.primary_container_bg = Some(rgba(scheme.argb(Role::SurfaceContainer)));
    b.secondary_container_bg = Some(rgba(scheme.argb(Role::SurfaceContainerHigh)));
    b.text_tint = Some(rgb(scheme.argb(Role::OnSurface)));
    b.neutral_tint = Some(rgb(scheme.argb(Role::NeutralPaletteKeyColor)));
    b.destructive = Some(rgb(scheme.argb(Role::Error)));
    b.success = Some(extended(SUCCESS_SEED));
    b.warning = Some(extended(WARNING_SEED));
    b.window_hint = Some(rgb(scheme.argb(Role::Primary)));
    b.corner_radii = corner_radii();
    b.spacing = spacing();
    b
}

/// The built cosmic [`Theme`] of `scheme`.
#[must_use]
pub fn theme(scheme: &DynamicScheme) -> Theme {
    builder(scheme).build()
}
