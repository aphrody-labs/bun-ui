// SPDX-License-Identifier: Apache-2.0
//! `M3Scheme`: a QML singleton exposing every M3 color role resolved by `aphrody-m3-tokens`.
//!
//! QML: `import Aphrody.M3.Native` then `M3Scheme.primary`, `M3Scheme.dark = true`,
//! `M3Scheme.seed = "#1b6ef3"`, `M3Scheme.variant = "vibrant"`, `M3Scheme.contrast = 0.5`.
//! Role properties are read-only and share the `schemeChanged` notify signal.
//! The role list follows `aphrody_m3_emit::ROLES`.

#[cxx_qt::bridge]
pub mod qobject {
    unsafe extern "C++" {
        include!("cxx-qt-lib/qcolor.h");
        type QColor = cxx_qt_lib::QColor;
        include!("cxx-qt-lib/qstring.h");
        type QString = cxx_qt_lib::QString;
    }

    unsafe extern "C++" {
        include!("aphrody-m3-qt/cpp/m3palette.h");

        /// Fills a `QPalette` from `argb` (order of `crate::palette::PALETTE_ROLES`) and sets it
        /// as the application palette.
        #[namespace = "aphrody_m3"]
        fn apply_application_palette(argb: &[u32]);

        /// `QGuiApplication::styleHints()->colorScheme() == Qt::ColorScheme::Dark` (Qt 6.5+).
        #[namespace = "aphrody_m3"]
        fn system_prefers_dark() -> bool;
    }

    #[auto_cxx_name]
    extern "RustQt" {
        #[qobject]
        #[qml_element]
        #[qml_singleton]
        #[qproperty(bool, dark, READ, WRITE = set_dark, NOTIFY = scheme_changed)]
        #[qproperty(QColor, seed, READ, WRITE = set_seed, NOTIFY = scheme_changed)]
        #[qproperty(QString, variant, READ, WRITE = set_variant, NOTIFY = scheme_changed)]
        #[qproperty(f64, contrast, READ, WRITE = set_contrast, NOTIFY = scheme_changed)]
        #[qproperty(QColor, primary, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_primary, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, primary_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_primary_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, inverse_primary, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, secondary, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_secondary, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, secondary_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_secondary_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, tertiary, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_tertiary, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, tertiary_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_tertiary_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, error, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_error, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, error_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_error_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, background, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_background, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_surface, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_variant, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, on_surface_variant, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_dim, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_bright, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_container_lowest, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_container_low, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_container, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_container_high, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_container_highest, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, surface_tint, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, outline, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, outline_variant, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, inverse_surface, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, inverse_on_surface, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, shadow, READ, NOTIFY = scheme_changed)]
        #[qproperty(QColor, scrim, READ, NOTIFY = scheme_changed)]
        type M3Scheme = super::M3SchemeRust;

        /// Emitted after any input changes and every role is recomputed.
        #[qsignal]
        fn scheme_changed(self: Pin<&mut M3Scheme>);

        /// Sets `dark` from the platform color scheme.
        #[qinvokable]
        fn sync_system_color_scheme(self: Pin<&mut M3Scheme>);

        /// Applies the current scheme to the application `QPalette` (Qt Widgets and Basic style).
        #[qinvokable]
        fn apply_to_application_palette(self: &M3Scheme);

        /// `#rrggbb` of a role by kebab-case or camel-case name, empty when unknown.
        #[qinvokable]
        fn role_hex(self: &M3Scheme, role: &QString) -> QString;
    }

    impl cxx_qt::Initialize for M3Scheme {}
}

use core::pin::Pin;

use aphrody_m3_emit::{Theme, hex};
use aphrody_m3_tokens::role::Role;
use aphrody_m3_tokens::scheme::{DynamicScheme, Variant};
use cxx_qt::CxxQtType;
use cxx_qt_lib::{QColor, QString};

use crate::palette::palette_argb;

fn color(argb: u32) -> QColor {
    QColor::from_rgb(((argb >> 16) & 0xff) as i32, ((argb >> 8) & 0xff) as i32, (argb & 0xff) as i32)
}

fn argb(c: &QColor) -> u32 {
    let ch = |v: i32| v.clamp(0, 255) as u32;
    0xff00_0000 | ch(c.red()) << 16 | ch(c.green()) << 8 | ch(c.blue())
}

/// Rust state behind `M3Scheme`.
pub struct M3SchemeRust {
    dark: bool,
    seed: QColor,
    variant: QString,
    contrast: f64,
    primary: QColor,
    on_primary: QColor,
    primary_container: QColor,
    on_primary_container: QColor,
    inverse_primary: QColor,
    secondary: QColor,
    on_secondary: QColor,
    secondary_container: QColor,
    on_secondary_container: QColor,
    tertiary: QColor,
    on_tertiary: QColor,
    tertiary_container: QColor,
    on_tertiary_container: QColor,
    error: QColor,
    on_error: QColor,
    error_container: QColor,
    on_error_container: QColor,
    background: QColor,
    on_background: QColor,
    surface: QColor,
    on_surface: QColor,
    surface_variant: QColor,
    on_surface_variant: QColor,
    surface_dim: QColor,
    surface_bright: QColor,
    surface_container_lowest: QColor,
    surface_container_low: QColor,
    surface_container: QColor,
    surface_container_high: QColor,
    surface_container_highest: QColor,
    surface_tint: QColor,
    outline: QColor,
    outline_variant: QColor,
    inverse_surface: QColor,
    inverse_on_surface: QColor,
    shadow: QColor,
    scrim: QColor,
}

impl Default for M3SchemeRust {
    fn default() -> Self {
        Self {
            dark: false,
            seed: color(crate::BASELINE_SEED),
            variant: QString::from(Variant::TonalSpot.name()),
            contrast: 0.0,
            primary: QColor::default(),
            on_primary: QColor::default(),
            primary_container: QColor::default(),
            on_primary_container: QColor::default(),
            inverse_primary: QColor::default(),
            secondary: QColor::default(),
            on_secondary: QColor::default(),
            secondary_container: QColor::default(),
            on_secondary_container: QColor::default(),
            tertiary: QColor::default(),
            on_tertiary: QColor::default(),
            tertiary_container: QColor::default(),
            on_tertiary_container: QColor::default(),
            error: QColor::default(),
            on_error: QColor::default(),
            error_container: QColor::default(),
            on_error_container: QColor::default(),
            background: QColor::default(),
            on_background: QColor::default(),
            surface: QColor::default(),
            on_surface: QColor::default(),
            surface_variant: QColor::default(),
            on_surface_variant: QColor::default(),
            surface_dim: QColor::default(),
            surface_bright: QColor::default(),
            surface_container_lowest: QColor::default(),
            surface_container_low: QColor::default(),
            surface_container: QColor::default(),
            surface_container_high: QColor::default(),
            surface_container_highest: QColor::default(),
            surface_tint: QColor::default(),
            outline: QColor::default(),
            outline_variant: QColor::default(),
            inverse_surface: QColor::default(),
            inverse_on_surface: QColor::default(),
            shadow: QColor::default(),
            scrim: QColor::default(),
        }
    }
}

impl M3SchemeRust {
    /// Theme request of the current inputs (unknown variants fall back to tonal spot).
    #[must_use]
    pub fn theme(&self) -> Theme {
        Theme {
            seed: argb(&self.seed),
            variant: Variant::from_name(&self.variant.to_string()).unwrap_or(Variant::TonalSpot),
            contrast: self.contrast.clamp(-1.0, 1.0),
        }
    }

    /// Resolved scheme of the current inputs.
    #[must_use]
    pub fn scheme(&self) -> DynamicScheme {
        self.theme().scheme(self.dark)
    }
}

impl qobject::M3Scheme {
    fn recompute(mut self: Pin<&mut Self>) {
        let s = self.as_ref().rust().scheme();
        let mut rust = self.as_mut().rust_mut();
        rust.primary = color(s.argb(Role::Primary));
        rust.on_primary = color(s.argb(Role::OnPrimary));
        rust.primary_container = color(s.argb(Role::PrimaryContainer));
        rust.on_primary_container = color(s.argb(Role::OnPrimaryContainer));
        rust.inverse_primary = color(s.argb(Role::InversePrimary));
        rust.secondary = color(s.argb(Role::Secondary));
        rust.on_secondary = color(s.argb(Role::OnSecondary));
        rust.secondary_container = color(s.argb(Role::SecondaryContainer));
        rust.on_secondary_container = color(s.argb(Role::OnSecondaryContainer));
        rust.tertiary = color(s.argb(Role::Tertiary));
        rust.on_tertiary = color(s.argb(Role::OnTertiary));
        rust.tertiary_container = color(s.argb(Role::TertiaryContainer));
        rust.on_tertiary_container = color(s.argb(Role::OnTertiaryContainer));
        rust.error = color(s.argb(Role::Error));
        rust.on_error = color(s.argb(Role::OnError));
        rust.error_container = color(s.argb(Role::ErrorContainer));
        rust.on_error_container = color(s.argb(Role::OnErrorContainer));
        rust.background = color(s.argb(Role::Background));
        rust.on_background = color(s.argb(Role::OnBackground));
        rust.surface = color(s.argb(Role::Surface));
        rust.on_surface = color(s.argb(Role::OnSurface));
        rust.surface_variant = color(s.argb(Role::SurfaceVariant));
        rust.on_surface_variant = color(s.argb(Role::OnSurfaceVariant));
        rust.surface_dim = color(s.argb(Role::SurfaceDim));
        rust.surface_bright = color(s.argb(Role::SurfaceBright));
        rust.surface_container_lowest = color(s.argb(Role::SurfaceContainerLowest));
        rust.surface_container_low = color(s.argb(Role::SurfaceContainerLow));
        rust.surface_container = color(s.argb(Role::SurfaceContainer));
        rust.surface_container_high = color(s.argb(Role::SurfaceContainerHigh));
        rust.surface_container_highest = color(s.argb(Role::SurfaceContainerHighest));
        rust.surface_tint = color(s.argb(Role::SurfaceTint));
        rust.outline = color(s.argb(Role::Outline));
        rust.outline_variant = color(s.argb(Role::OutlineVariant));
        rust.inverse_surface = color(s.argb(Role::InverseSurface));
        rust.inverse_on_surface = color(s.argb(Role::InverseOnSurface));
        rust.shadow = color(s.argb(Role::Shadow));
        rust.scrim = color(s.argb(Role::Scrim));
        self.scheme_changed();
    }

    /// WRITE accessor of `dark`.
    pub fn set_dark(mut self: Pin<&mut Self>, dark: bool) {
        if self.as_ref().rust().dark != dark {
            self.as_mut().rust_mut().dark = dark;
            self.recompute();
        }
    }

    /// WRITE accessor of `seed`.
    pub fn set_seed(mut self: Pin<&mut Self>, seed: QColor) {
        if argb(&self.as_ref().rust().seed) != argb(&seed) {
            self.as_mut().rust_mut().seed = seed;
            self.recompute();
        }
    }

    /// WRITE accessor of `variant` (kebab or snake case, e.g. `tonal-spot`).
    pub fn set_variant(mut self: Pin<&mut Self>, variant: QString) {
        if self.as_ref().rust().variant != variant {
            self.as_mut().rust_mut().variant = variant;
            self.recompute();
        }
    }

    /// WRITE accessor of `contrast` (`-1.0..=1.0`).
    pub fn set_contrast(mut self: Pin<&mut Self>, contrast: f64) {
        if (self.as_ref().rust().contrast - contrast).abs() > f64::EPSILON {
            self.as_mut().rust_mut().contrast = contrast;
            self.recompute();
        }
    }

    fn sync_system_color_scheme(self: Pin<&mut Self>) {
        self.set_dark(qobject::system_prefers_dark());
    }

    fn apply_to_application_palette(&self) {
        qobject::apply_application_palette(&palette_argb(&self.rust().scheme()));
    }

    fn role_hex(&self, role: &QString) -> QString {
        Role::from_name(&role.to_string())
            .map(|r| QString::from(hex(self.rust().scheme().argb(r)).as_str()))
            .unwrap_or_default()
    }
}

impl cxx_qt::Initialize for qobject::M3Scheme {
    fn initialize(self: Pin<&mut Self>) {
        self.recompute();
    }
}
