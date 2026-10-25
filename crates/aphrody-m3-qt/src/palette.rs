// SPDX-License-Identifier: Apache-2.0
//! M3 roles mapped to `QPalette::ColorRole` (see `catalog/conversion.toml`, host `qt`).

use aphrody_m3_emit::Theme;
use aphrody_m3_tokens::role::Role;
use aphrody_m3_tokens::scheme::DynamicScheme;

/// `(QPalette role name, M3 role)` in the order `cpp/m3palette.cpp` reads them.
pub const PALETTE_ROLES: [(&str, Role); 21] = [
    ("Window", Role::Surface),
    ("WindowText", Role::OnSurface),
    ("Base", Role::SurfaceContainerLowest),
    ("AlternateBase", Role::SurfaceContainerLow),
    ("ToolTipBase", Role::InverseSurface),
    ("ToolTipText", Role::InverseOnSurface),
    ("PlaceholderText", Role::OnSurfaceVariant),
    ("Text", Role::OnSurface),
    ("Button", Role::SurfaceContainer),
    ("ButtonText", Role::OnSurface),
    ("BrightText", Role::Error),
    ("Light", Role::SurfaceBright),
    ("Midlight", Role::SurfaceContainerHigh),
    ("Mid", Role::OutlineVariant),
    ("Dark", Role::SurfaceDim),
    ("Shadow", Role::Shadow),
    ("Highlight", Role::Primary),
    ("HighlightedText", Role::OnPrimary),
    ("Link", Role::Primary),
    ("LinkVisited", Role::Tertiary),
    ("Accent", Role::Primary),
];

/// Palette colors (`0xAARRGGBB`) of `scheme` in [`PALETTE_ROLES`] order.
#[must_use]
pub fn palette_argb(scheme: &DynamicScheme) -> [u32; PALETTE_ROLES.len()] {
    PALETTE_ROLES.map(|(_, role)| scheme.argb(role) | 0xff00_0000)
}

/// Sets the application `QPalette` (Qt Widgets, Fusion and Basic styles) from `theme`.
///
/// Call after constructing `QApplication`/`QGuiApplication`; Qt sends `PaletteChange` to every
/// widget.
pub fn apply_application_palette(theme: &Theme, dark: bool) {
    crate::scheme::qobject::apply_application_palette(&palette_argb(&theme.scheme(dark)));
}

/// Applies `theme` in the mode reported by `QStyleHints::colorScheme`.
pub fn apply_application_palette_for_system(theme: &Theme) {
    apply_application_palette(theme, crate::scheme::qobject::system_prefers_dark());
}
