// SPDX-License-Identifier: Apache-2.0
//! Material 3 adapter for Qt 6 through cxx-qt.
//!
//! - [`scheme`]: `M3Scheme`, a `#[qml_singleton]` in the `Aphrody.M3.Native` QML module with one
//!   read-only `QColor` property per M3 role plus writable `dark`, `seed`, `variant` and
//!   `contrast`, all resolved by `aphrody-m3-tokens`. The `Aphrody.M3` style
//!   (`packages/m3-qml`) can bind its `M3Theme` to it for runtime theming.
//! - [`palette`]: fills the application `QPalette` for Qt Widgets apps.
//!
//! Requires Qt 6.6+ (`QPalette::Accent`, `QStyleHints::colorScheme`).

pub mod palette;
pub mod scheme;

pub use aphrody_m3_emit::Theme;
pub use aphrody_m3_tokens::scheme::Variant;
pub use palette::{PALETTE_ROLES, apply_application_palette, apply_application_palette_for_system, palette_argb};

/// Default seed (M3 baseline `#6750A4`) as `0xAARRGGBB`.
pub const BASELINE_SEED: u32 = 0xff67_50a4;
