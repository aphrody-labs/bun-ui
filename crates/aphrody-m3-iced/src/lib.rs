// SPDX-License-Identifier: Apache-2.0
//! Material 3 adapter for iced 0.14 and (feature `cosmic`) libcosmic's `cosmic-theme`.
//!
//! [`theme`] builds an [`iced::Theme::custom_with_fn`] whose [`Palette`] and
//! [`Extended`](iced::theme::palette::Extended) palette carry the M3 roles of one
//! [`DynamicScheme`]. The style functions in [`style`] read those roles back from the theme, so
//! they work as plain `fn(&Theme, Status) -> Style` values:
//!
//! ```no_run
//! use aphrody_m3_iced::{style, theme, DynamicScheme, Variant};
//! let scheme = DynamicScheme::from_argb(0xFF67_50A4, Variant::TonalSpot, false, 0.0);
//! let theme = theme(&scheme);
//! let button = iced::widget::button("Save").style(style::button::filled);
//! # let _ = (theme, button);
//! ```
//!
//! Extended slot mapping (catalog `iced`/`cosmic` columns):
//!
//! | Extended | M3 role (`color` / `text`) |
//! | --- | --- |
//! | `background.base` | `surface` / `on-surface` |
//! | `background.weakest` .. `strong` | `surface-container-lowest` .. `surface-container-highest` |
//! | `background.stronger` | `outline-variant` / `on-surface-variant` |
//! | `background.strongest` | `outline` / `on-surface-variant` |
//! | `primary.base` / `weak` / `strong` | `primary`, `primary-container`, `inverse-primary` |
//! | `secondary.base` / `weak` / `strong` | `secondary-container`, `surface-variant`, `secondary` |
//! | `danger.base` / `weak` / `strong` | `error`, `error-container`, `inverse-surface` |
//! | `success`, `warning` | harmonised extended colours (base, container) |

use aphrody_m3_tokens::blend::custom_color;
pub use aphrody_m3_tokens::role::Role;
pub use aphrody_m3_tokens::scheme::{DynamicScheme, Variant};
use aphrody_m3_tokens::state;
use iced::theme::palette::{
    Background, Danger, Extended, Pair, Primary, Secondary, Success, Warning,
};
use iced::theme::{Mode, Palette};
use iced::{Color, Theme};

pub mod style;

#[cfg(feature = "cosmic")]
pub mod cosmic;

/// Seed of the Bun UI default scheme (M3 baseline purple).
pub const DEFAULT_SEED: u32 = 0xFF67_50A4;
/// Seed hue for the harmonised `warning` extended colour (amber).
pub const WARNING_SEED: u32 = 0xFFF5_9E0B;
/// Seed hue for the harmonised `success` extended colour (green).
pub const SUCCESS_SEED: u32 = 0xFF16_A34A;

/// `0xAARRGGBB` as an opaque iced [`Color`].
#[must_use]
pub fn color(argb: u32) -> Color {
    Color::from_rgb8((argb >> 16) as u8, (argb >> 8) as u8, argb as u8)
}

/// `color` with alpha `a`.
#[must_use]
pub fn alpha(color: Color, a: f32) -> Color {
    Color { a, ..color }
}

/// Composites `layer` over `base` at `opacity` in sRGB (the M3 state-layer formula).
#[must_use]
pub fn state_layer(base: Color, layer: Color, opacity: f32) -> Color {
    let mix = |a: f32, b: f32| a + (b - a) * opacity;
    Color {
        r: mix(base.r, layer.r),
        g: mix(base.g, layer.g),
        b: mix(base.b, layer.b),
        a: base.a + (1.0 - base.a) * opacity,
    }
}

/// M3 state-layer opacities.
pub mod opacity {
    use super::state;
    /// Hover (8 %).
    pub const HOVER: f32 = state::HOVER.opacity;
    /// Focus (10 %).
    pub const FOCUS: f32 = state::FOCUS.opacity;
    /// Pressed (10 %).
    pub const PRESSED: f32 = state::PRESSED.opacity;
    /// Dragged (16 %).
    pub const DRAGGED: f32 = state::DRAGGED.opacity;
    /// Disabled content (38 %).
    pub const DISABLED_CONTENT: f32 = state::DISABLED_CONTENT.opacity;
    /// Disabled container (12 %).
    pub const DISABLED_CONTAINER: f32 = state::DISABLED_CONTAINER.opacity;
}

/// M3 shape scale in logical pixels.
pub mod shape {
    use aphrody_m3_tokens::shape as s;
    /// `none`.
    pub const NONE: f32 = s::NONE.dp as f32;
    /// `extra-small` (4): menus, text fields, snackbars.
    pub const EXTRA_SMALL: f32 = s::EXTRA_SMALL.dp as f32;
    /// `small` (8): chips.
    pub const SMALL: f32 = s::SMALL.dp as f32;
    /// `medium` (12): cards.
    pub const MEDIUM: f32 = s::MEDIUM.dp as f32;
    /// `large` (16): FAB, drawers.
    pub const LARGE: f32 = s::LARGE.dp as f32;
    /// `extra-large` (28): dialogs, sheets.
    pub const EXTRA_LARGE: f32 = s::EXTRA_LARGE.dp as f32;
    /// `full` (iced clamps to half the height).
    pub const FULL: f32 = 9999.0;
}

/// The 4 dp spacing grid.
pub mod spacing {
    /// One grid step.
    pub const UNIT: f32 = 4.0;
    /// `n` grid steps.
    #[must_use]
    pub const fn dp(n: u16) -> f32 {
        UNIT * n as f32
    }
}

/// M3 typescale sizes (font size, line height) in logical pixels.
pub mod typescale {
    pub use aphrody_m3_tokens::typography::*;

    /// iced text size of an M3 type style.
    #[must_use]
    pub fn size(style: TypeStyle) -> f32 {
        style.size_dp
    }

    /// iced absolute line height of an M3 type style.
    #[must_use]
    pub fn line_height(style: TypeStyle) -> iced::widget::text::LineHeight {
        iced::widget::text::LineHeight::Absolute(iced::Pixels(style.line_height_dp))
    }
}

/// Every resolved role of one scheme as iced colours, plus the harmonised extended colours.
#[derive(Clone, Debug, PartialEq)]
pub struct Colors {
    colors: [Color; 49],
    /// Dark mode.
    pub dark: bool,
    /// Harmonised warning, its on-colour, container and on-container.
    pub warning: [Color; 4],
    /// Harmonised success, its on-colour, container and on-container.
    pub success: [Color; 4],
}

impl Colors {
    /// Resolves every role of `scheme`.
    #[must_use]
    pub fn from_scheme(scheme: &DynamicScheme) -> Self {
        let mut colors = [Color::BLACK; 49];
        for (slot, (_, argb)) in colors.iter_mut().zip(scheme.roles()) {
            *slot = color(argb);
        }
        let source = scheme.source.to_argb();
        let pick = |seed: u32| {
            let c = custom_color(source, seed, true);
            let g = if scheme.is_dark { c.dark } else { c.light };
            [
                color(g.color),
                color(g.on_color),
                color(g.color_container),
                color(g.on_color_container),
            ]
        };
        Self {
            colors,
            dark: scheme.is_dark,
            warning: pick(WARNING_SEED),
            success: pick(SUCCESS_SEED),
        }
    }

    /// Colour of a system role (palette key colours map to their nearest system role).
    #[must_use]
    pub fn get(&self, role: Role) -> Color {
        let role = match role {
            Role::PrimaryPaletteKeyColor => Role::Primary,
            Role::SecondaryPaletteKeyColor => Role::Secondary,
            Role::TertiaryPaletteKeyColor => Role::Tertiary,
            Role::ErrorPaletteKeyColor => Role::Error,
            Role::NeutralPaletteKeyColor => Role::Outline,
            Role::NeutralVariantPaletteKeyColor => Role::OutlineVariant,
            other => other,
        };
        Role::ALL
            .iter()
            .position(|r| *r == role)
            .map_or(Color::from_rgb(1.0, 0.0, 1.0), |i| self.colors[i])
    }

    /// The iced base [`Palette`].
    #[must_use]
    pub fn palette(&self) -> Palette {
        Palette {
            background: self.get(Role::Surface),
            text: self.get(Role::OnSurface),
            primary: self.get(Role::Primary),
            success: self.success[0],
            warning: self.warning[0],
            danger: self.get(Role::Error),
        }
    }

    /// The iced [`Extended`] palette carrying the M3 roles (see the crate docs for the slots).
    #[must_use]
    pub fn extended(&self) -> Extended {
        use Role as R;
        let pair = |c: R, t: R| Pair {
            color: self.get(c),
            text: self.get(t),
        };
        let on_surface = R::OnSurface;
        Extended {
            background: Background {
                base: pair(R::Surface, on_surface),
                weakest: pair(R::SurfaceContainerLowest, on_surface),
                weaker: pair(R::SurfaceContainerLow, on_surface),
                weak: pair(R::SurfaceContainer, on_surface),
                neutral: pair(R::SurfaceContainerHigh, on_surface),
                strong: pair(R::SurfaceContainerHighest, on_surface),
                stronger: pair(R::OutlineVariant, R::OnSurfaceVariant),
                strongest: pair(R::Outline, R::OnSurfaceVariant),
            },
            primary: Primary {
                base: pair(R::Primary, R::OnPrimary),
                weak: pair(R::PrimaryContainer, R::OnPrimaryContainer),
                strong: pair(R::InversePrimary, R::InverseSurface),
            },
            secondary: Secondary {
                base: pair(R::SecondaryContainer, R::OnSecondaryContainer),
                weak: pair(R::SurfaceVariant, R::OnSurfaceVariant),
                strong: pair(R::Secondary, R::OnSecondary),
            },
            success: Success {
                base: Pair {
                    color: self.success[0],
                    text: self.success[1],
                },
                weak: Pair {
                    color: self.success[2],
                    text: self.success[3],
                },
                strong: Pair {
                    color: state_layer(self.success[0], self.success[1], opacity::HOVER),
                    text: self.success[1],
                },
            },
            warning: Warning {
                base: Pair {
                    color: self.warning[0],
                    text: self.warning[1],
                },
                weak: Pair {
                    color: self.warning[2],
                    text: self.warning[3],
                },
                strong: Pair {
                    color: state_layer(self.warning[0], self.warning[1], opacity::HOVER),
                    text: self.warning[1],
                },
            },
            danger: Danger {
                base: pair(R::Error, R::OnError),
                weak: pair(R::ErrorContainer, R::OnErrorContainer),
                strong: pair(R::InverseSurface, R::InverseOnSurface),
            },
            is_dark: self.dark,
        }
    }
}

/// The M3 iced theme of `scheme`.
#[must_use]
pub fn theme(scheme: &DynamicScheme) -> Theme {
    let colors = Colors::from_scheme(scheme);
    let name = format!(
        "Bun UI M3 {} {}",
        scheme.variant.name(),
        if scheme.is_dark { "dark" } else { "light" }
    );
    let extended = colors.extended();
    Theme::custom_with_fn(name, colors.palette(), move |_| extended)
}

/// Light and dark M3 themes for one seed.
#[derive(Clone, Debug)]
pub struct Themes {
    /// Light theme.
    pub light: Theme,
    /// Dark theme.
    pub dark: Theme,
}

impl Themes {
    /// Resolves both modes of `seed`, `variant` and `contrast` (`-1.0..=1.0`).
    #[must_use]
    pub fn new(seed: u32, variant: Variant, contrast: f64) -> Self {
        Self {
            light: theme(&DynamicScheme::from_argb(seed, variant, false, contrast)),
            dark: theme(&DynamicScheme::from_argb(seed, variant, true, contrast)),
        }
    }

    /// The theme for a system [`Mode`] (from `iced::system::theme_changes()`); `Mode::None`
    /// picks dark.
    #[must_use]
    pub fn for_mode(&self, mode: Mode) -> Theme {
        match mode {
            Mode::Light => self.light.clone(),
            Mode::Dark | Mode::None => self.dark.clone(),
        }
    }
}

impl Default for Themes {
    fn default() -> Self {
        Self::new(DEFAULT_SEED, Variant::TonalSpot, 0.0)
    }
}
