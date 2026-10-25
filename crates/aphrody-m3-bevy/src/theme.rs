// SPDX-License-Identifier: Apache-2.0
//! [`M3Theme`]: every Material 3 system token resolved once for Bevy UI.

use core::time::Duration;

use aphrody_m3_tokens::{
    elevation, motion,
    motion::{CubicBezier, M3Spring, MotionScheme, SpringFamily, SpringSpeed},
    scheme::{DynamicScheme, Role, Variant},
    shape, state, typography,
};
use bevy::prelude::*;
use bevy::text::{FontSize, FontWeight, LetterSpacing, LineHeight};
use bevy::ui::{BorderRadius, BoxShadow, ShadowStyle, Val};

/// Converts a packed `0xAARRGGBB` colour to a Bevy sRGB colour.
#[must_use]
pub fn argb_to_color(argb: u32) -> Color {
    let [a, r, g, b] = argb.to_be_bytes();
    Color::srgba_u8(r, g, b, a)
}

/// Light, dark, or follow the window system theme ([`bevy::window::WindowThemeChanged`]).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Reflect)]
pub enum ThemeMode {
    /// Follow the system theme; light until the window reports one.
    #[default]
    System,
    /// Always light.
    Light,
    /// Always dark.
    Dark,
}

/// The 15 roles of the M3 type scale, in `aphrody_m3_tokens::typography::ALL` order.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Reflect)]
#[allow(missing_docs)]
pub enum TypeRole {
    DisplayLarge,
    DisplayMedium,
    DisplaySmall,
    HeadlineLarge,
    HeadlineMedium,
    HeadlineSmall,
    TitleLarge,
    TitleMedium,
    TitleSmall,
    BodyLarge,
    #[default]
    BodyMedium,
    BodySmall,
    LabelLarge,
    LabelMedium,
    LabelSmall,
}

impl TypeRole {
    /// Every role, in token order.
    pub const ALL: [Self; 15] = [
        Self::DisplayLarge,
        Self::DisplayMedium,
        Self::DisplaySmall,
        Self::HeadlineLarge,
        Self::HeadlineMedium,
        Self::HeadlineSmall,
        Self::TitleLarge,
        Self::TitleMedium,
        Self::TitleSmall,
        Self::BodyLarge,
        Self::BodyMedium,
        Self::BodySmall,
        Self::LabelLarge,
        Self::LabelMedium,
        Self::LabelSmall,
    ];

    /// Kebab-case token name (`--md-sys-typescale-<name>-*`).
    #[must_use]
    pub const fn name(self) -> &'static str {
        typography::NAMES[self as usize]
    }

    /// Canonical token values.
    #[must_use]
    pub const fn style(self) -> typography::TypeStyle {
        typography::ALL[self as usize]
    }
}

/// M3 corner-shape roles, in `aphrody_m3_tokens::shape::ALL` order.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Reflect)]
#[allow(missing_docs)]
pub enum ShapeRole {
    #[default]
    None,
    ExtraSmall,
    Small,
    Medium,
    Large,
    LargeIncreased,
    ExtraLarge,
    ExtraLargeIncreased,
    ExtraExtraLarge,
    Full,
}

impl ShapeRole {
    /// Kebab-case token name (`--md-sys-shape-corner-<name>`).
    #[must_use]
    pub const fn name(self) -> &'static str {
        shape::NAMES[self as usize]
    }
}

/// One resolved type style: the Bevy text components for a [`TypeRole`].
#[derive(Clone, Debug, PartialEq)]
pub struct M3TypeStyle {
    /// Font family, size and weight.
    pub font: TextFont,
    /// Line height in logical px.
    pub line_height: LineHeight,
    /// Tracking in logical px.
    pub letter_spacing: LetterSpacing,
}

/// State-layer opacities (`--md-sys-state-*`).
#[derive(Clone, Copy, Debug, PartialEq, Reflect)]
#[allow(missing_docs)]
pub struct M3StateLayers {
    pub hover: f32,
    pub focus: f32,
    pub pressed: f32,
    pub dragged: f32,
    pub disabled_content: f32,
    pub disabled_container: f32,
}

impl Default for M3StateLayers {
    fn default() -> Self {
        Self {
            hover: state::HOVER.opacity,
            focus: state::FOCUS.opacity,
            pressed: state::PRESSED.opacity,
            dragged: state::DRAGGED.opacity,
            disabled_content: state::DISABLED_CONTENT.opacity,
            disabled_container: state::DISABLED_CONTAINER.opacity,
        }
    }
}

/// Motion tokens: durations, easing curves and the springs of the active motion scheme.
#[derive(Clone, Debug, PartialEq)]
pub struct M3Motion {
    /// Spring scheme (expressive on native, standard on the web).
    pub scheme: MotionScheme,
    /// `short1` .. `extra-long4`, in token order.
    pub durations: [(&'static str, Duration); 16],
    /// Named easing curves, in `motion::ALL_EASINGS` order.
    pub easings: [(&'static str, CubicBezier); 7],
    /// Spatial springs (fast, default, slow).
    pub spatial: [M3Spring; 3],
    /// Effects springs (fast, default, slow).
    pub effects: [M3Spring; 3],
}

impl M3Motion {
    /// Motion tokens for `scheme`.
    #[must_use]
    pub fn new(scheme: MotionScheme) -> Self {
        let speeds = [SpringSpeed::Fast, SpringSpeed::Default, SpringSpeed::Slow];
        Self {
            scheme,
            durations: motion::ALL_DURATIONS
                .map(|d| (d.name, Duration::from_millis(u64::from(d.ms)))),
            easings: motion::ALL_EASINGS.map(|e| (e.name, parse_cubic_bezier(e.cubic_bezier))),
            spatial: speeds.map(|s| M3Spring::token(scheme, s, SpringFamily::Spatial)),
            effects: speeds.map(|s| M3Spring::token(scheme, s, SpringFamily::Effects)),
        }
    }

    /// A duration token by name (`"short4"`, `"medium2"`, ...).
    #[must_use]
    pub fn duration(&self, name: &str) -> Option<Duration> {
        self.durations.iter().find(|(n, _)| *n == name).map(|(_, d)| *d)
    }

    /// An easing curve by token name (`"standard"`, `"emphasized-decelerate"`, ...).
    #[must_use]
    pub fn easing(&self, name: &str) -> Option<CubicBezier> {
        self.easings.iter().find(|(n, _)| *n == name).map(|(_, e)| *e)
    }
}

/// Parses `cubic-bezier(x1, y1, x2, y2)`; anything else is linear.
fn parse_cubic_bezier(css: &str) -> CubicBezier {
    let linear = CubicBezier { x1: 0.0, y1: 0.0, x2: 1.0, y2: 1.0 };
    let Some(inner) = css
        .trim()
        .strip_prefix("cubic-bezier(")
        .and_then(|s| s.strip_suffix(')'))
    else {
        return linear;
    };
    let mut v = inner.split(',').map(|p| p.trim().parse::<f32>());
    match (v.next(), v.next(), v.next(), v.next()) {
        (Some(Ok(x1)), Some(Ok(y1)), Some(Ok(x2)), Some(Ok(y2))) => CubicBezier { x1, y1, x2, y2 },
        _ => linear,
    }
}

/// Every Material 3 system token, resolved from one [`DynamicScheme`].
///
/// Inserted by [`crate::M3Plugin`]; mutate it (or call [`M3Theme::set_dark`]) and every skinned
/// widget follows on the next frame.
#[derive(Resource, Clone, Debug)]
pub struct M3Theme {
    /// The resolved scheme (source colour, variant, mode, contrast).
    pub scheme: DynamicScheme,
    /// Requested mode.
    pub mode: ThemeMode,
    colors: [Color; Role::ALL.len()],
    /// Type scale, indexed by [`TypeRole`].
    pub typescale: [M3TypeStyle; 15],
    /// Corner radii in logical px, indexed by [`ShapeRole`].
    pub shape: [f32; 10],
    /// Elevation levels 0..=5 as Bevy box shadows.
    pub elevation: [BoxShadow; elevation::LEVEL_COUNT],
    /// State-layer opacities.
    pub state: M3StateLayers,
    /// Motion tokens.
    pub motion: M3Motion,
    /// Font family requested for every type role (`None` keeps Bevy's default font).
    pub font_family: Option<String>,
}

macro_rules! role_accessors {
    ($($fn:ident => $role:ident),* $(,)?) => {
        impl M3Theme {
            $(
                #[doc = concat!("`--md-sys-color-", stringify!($fn), "`")]
                #[must_use]
                pub fn $fn(&self) -> Color { self.color(Role::$role) }
            )*
        }
    };
}

role_accessors! {
    primary => Primary, on_primary => OnPrimary,
    primary_container => PrimaryContainer, on_primary_container => OnPrimaryContainer,
    inverse_primary => InversePrimary,
    secondary => Secondary, on_secondary => OnSecondary,
    secondary_container => SecondaryContainer, on_secondary_container => OnSecondaryContainer,
    tertiary => Tertiary, on_tertiary => OnTertiary,
    tertiary_container => TertiaryContainer, on_tertiary_container => OnTertiaryContainer,
    error => Error, on_error => OnError,
    error_container => ErrorContainer, on_error_container => OnErrorContainer,
    background => Background, on_background => OnBackground,
    surface => Surface, on_surface => OnSurface,
    surface_variant => SurfaceVariant, on_surface_variant => OnSurfaceVariant,
    surface_dim => SurfaceDim, surface_bright => SurfaceBright,
    surface_container_lowest => SurfaceContainerLowest,
    surface_container_low => SurfaceContainerLow,
    surface_container => SurfaceContainer,
    surface_container_high => SurfaceContainerHigh,
    surface_container_highest => SurfaceContainerHighest,
    surface_tint => SurfaceTint,
    outline => Outline, outline_variant => OutlineVariant,
    inverse_surface => InverseSurface, inverse_on_surface => InverseOnSurface,
    shadow => Shadow, scrim => Scrim,
}

impl M3Theme {
    /// Resolves every token from `scheme`.
    #[must_use]
    pub fn from_scheme(scheme: DynamicScheme) -> Self {
        Self::build(scheme, ThemeMode::System, None, MotionScheme::default())
    }

    /// Builds a scheme from a source colour and resolves every token.
    #[must_use]
    pub fn from_source(source_argb: u32, variant: Variant, dark: bool, contrast: f64) -> Self {
        Self::from_scheme(DynamicScheme::from_argb(source_argb, variant, dark, contrast))
    }

    pub(crate) fn build(
        scheme: DynamicScheme,
        mode: ThemeMode,
        font_family: Option<String>,
        motion_scheme: MotionScheme,
    ) -> Self {
        let colors = Role::ALL.map(|role| argb_to_color(scheme.argb(role)));
        let typescale = TypeRole::ALL.map(|role| type_style(role.style(), font_family.as_deref()));
        let shape = shape::ALL.map(|r| f32::from(r.dp));
        let shadow = argb_to_color(scheme.argb(Role::Shadow));
        let elevation = core::array::from_fn(|level| elevation_shadow(level, shadow));
        Self {
            scheme,
            mode,
            colors,
            typescale,
            shape,
            elevation,
            state: M3StateLayers::default(),
            motion: M3Motion::new(motion_scheme),
            font_family,
        }
    }

    /// The colour of any role.
    #[must_use]
    pub fn color(&self, role: Role) -> Color {
        Role::ALL
            .iter()
            .position(|r| *r == role)
            .map_or_else(|| argb_to_color(self.scheme.argb(role)), |i| self.colors[i])
    }

    /// Every `(role, colour)` pair.
    pub fn colors(&self) -> impl Iterator<Item = (Role, Color)> + '_ {
        Role::ALL.iter().copied().zip(self.colors.iter().copied())
    }

    /// Whether the scheme is dark.
    #[must_use]
    pub const fn is_dark(&self) -> bool {
        self.scheme.is_dark
    }

    /// Re-resolves the scheme in light or dark mode, keeping source, variant and contrast.
    pub fn set_dark(&mut self, dark: bool) {
        if self.scheme.is_dark == dark {
            return;
        }
        let scheme = DynamicScheme::new(
            self.scheme.source,
            self.scheme.variant,
            dark,
            self.scheme.contrast_level,
        );
        *self = Self::build(scheme, self.mode, self.font_family.clone(), self.motion.scheme);
    }

    /// The resolved type style of `role`.
    #[must_use]
    pub fn type_style(&self, role: TypeRole) -> &M3TypeStyle {
        &self.typescale[role as usize]
    }

    /// `TextFont` for `role`.
    #[must_use]
    pub fn text_font(&self, role: TypeRole) -> TextFont {
        self.typescale[role as usize].font.clone()
    }

    /// Corner radius of `role` in logical px.
    #[must_use]
    pub fn radius(&self, role: ShapeRole) -> f32 {
        self.shape[role as usize]
    }

    /// `BorderRadius` for `role` (`Full` resolves to a pill).
    #[must_use]
    pub fn border_radius(&self, role: ShapeRole) -> BorderRadius {
        match role {
            ShapeRole::Full => BorderRadius::MAX,
            _ => BorderRadius::all(Val::Px(self.radius(role))),
        }
    }

    /// `BoxShadow` of elevation `level` (0..=5, clamped).
    #[must_use]
    pub fn box_shadow(&self, level: usize) -> BoxShadow {
        self.elevation[level.min(elevation::LEVEL_COUNT - 1)].clone()
    }
}

impl Default for M3Theme {
    /// The M3 baseline (`#6750A4`, tonal spot, light, standard contrast).
    fn default() -> Self {
        Self::from_source(0xFF67_50A4, Variant::TonalSpot, false, 0.0)
    }
}

fn type_style(style: typography::TypeStyle, family: Option<&str>) -> M3TypeStyle {
    let mut font = TextFont::default()
        .with_font_size(FontSize::Px(style.size_dp))
        .with_font_weight(FontWeight(style.weight));
    if let Some(family) = family {
        font = font.with_family(family.to_owned());
    }
    M3TypeStyle {
        font,
        line_height: LineHeight::Px(style.line_height_dp),
        letter_spacing: LetterSpacing::Px(style.letter_spacing_dp),
    }
}

fn elevation_shadow(level: usize, shadow: Color) -> BoxShadow {
    if level == 0 {
        return BoxShadow(Vec::new());
    }
    let [key, ambient] = elevation::SHADOWS[level - 1];
    let layer = |l: elevation::ShadowLayer, alpha: f32| ShadowStyle {
        color: shadow.with_alpha(alpha),
        x_offset: Val::Px(0.0),
        y_offset: Val::Px(f32::from(l.y)),
        spread_radius: Val::Px(f32::from(l.spread)),
        blur_radius: Val::Px(f32::from(l.blur)),
    };
    BoxShadow(vec![
        layer(key, elevation::KEY_ALPHA),
        layer(ambient, elevation::AMBIENT_ALPHA),
    ])
}

/// Composites a state layer of `layer` at `opacity` over `base` (M3 state-layer blending).
#[must_use]
pub fn state_layer(base: Color, layer: Color, opacity: f32) -> Color {
    if opacity <= 0.0 {
        return base;
    }
    let b = base.to_srgba();
    let l = layer.to_srgba();
    if b.alpha <= 0.0 {
        return Color::Srgba(l.with_alpha(opacity * l.alpha));
    }
    let t = opacity * l.alpha;
    Color::srgba(
        b.red + (l.red - b.red) * t,
        b.green + (l.green - b.green) * t,
        b.blue + (l.blue - b.blue) * t,
        b.alpha + (1.0 - b.alpha) * t,
    )
}
