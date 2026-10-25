// SPDX-License-Identifier: Apache-2.0
//! Material 3 adapter for GTK 4 / libadwaita (tier B: Bun UI themes native widgets).
//!
//! - [`M3Gtk`] loads the `aphrody-m3-emit` [`Target::Gtk`](aphrody_m3_emit::Target::Gtk)
//!   stylesheet into a `GtkCssProvider` at application priority and regenerates it when
//!   `AdwStyleManager:dark` changes. It can also follow the system accent reported by
//!   `AdwStyleManager:accent-color-rgba` (libadwaita 1.6+); the M3 CSS overrides do not feed
//!   back into what the style manager reports.
//! - [`widgets`] builds M3 buttons, cards, chips and FABs from stock GTK widgets plus CSS
//!   classes; [`NavigationRail`] wraps `AdwNavigationSplitView`.
//! - [`icons`] installs Material Symbols SVGs as symbolic icons in the display icon theme.
//!
//! Colors come only from `aphrody-m3-tokens` through `aphrody-m3-emit`; this crate adds the
//! M3 shape, state-layer, elevation and type-scale rules on top (see `catalog/conversion.toml`).

pub mod icons;
mod rail;
mod theme;
pub mod widgets;

pub use aphrody_m3_emit::Theme;
pub use aphrody_m3_tokens::scheme::Variant;
pub use rail::NavigationRail;
pub use theme::{M3Gtk, components_css, stylesheet};
pub use widgets::{
    ButtonVariant, CardVariant, m3_button, m3_card, m3_chip, m3_fab, m3_icon_button,
};

/// Re-exported toolkit crates, so applications use the same versions.
pub use {adw, gtk};

/// Default seed (M3 baseline `#6750A4`) as `0xAARRGGBB`.
pub const BASELINE_SEED: u32 = 0xff67_50a4;

/// Baseline theme: [`BASELINE_SEED`], tonal spot, standard contrast.
#[must_use]
pub const fn baseline_theme() -> Theme {
    Theme { seed: BASELINE_SEED, variant: Variant::TonalSpot, contrast: 0.0 }
}
