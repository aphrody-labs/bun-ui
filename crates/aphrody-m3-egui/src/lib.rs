// SPDX-License-Identifier: Apache-2.0
//! Material 3 adapter for egui 0.36.
//!
//! `aphrody-m3-tokens` resolves the scheme; this crate maps the resolved roles onto
//! [`egui::Visuals`] and [`egui::Style`] following `catalog/conversion.toml` (`egui` column) and
//! adds the M3 components egui lacks ([`widgets`]).
//!
//! ```no_run
//! # fn demo(ctx: &egui::Context) {
//! use aphrody_m3_egui::{ThemeController, Variant};
//! let mut theme = ThemeController::new(0xFF67_50A4, Variant::TonalSpot, 0.0);
//! theme.update(ctx); // once per frame, follows `ctx.system_theme()`
//! # }
//! ```

use std::collections::BTreeMap;
use std::sync::Arc;

use aphrody_m3_tokens::blend::custom_color;
pub use aphrody_m3_tokens::role::Role;
pub use aphrody_m3_tokens::scheme::{DynamicScheme, Variant};
use aphrody_m3_tokens::{shape, state, typography};
use egui::epaint::Shadow;
use egui::{
    Color32, Context, CornerRadius, FontFamily, FontId, Id, Margin, Stroke, Style, TextStyle,
    Theme, ThemePreference, Vec2, Visuals,
};

pub mod widgets;

/// Seed of the Bun UI default scheme (M3 baseline purple).
pub const DEFAULT_SEED: u32 = 0xFF67_50A4;

/// Seed hue for the harmonised `warning` extended colour (amber).
pub const WARNING_SEED: u32 = 0xFFF5_9E0B;
/// Seed hue for the harmonised `success` extended colour (green).
pub const SUCCESS_SEED: u32 = 0xFF16_A34A;

/// Converts `0xAARRGGBB` into an opaque [`Color32`].
#[must_use]
pub const fn color(argb: u32) -> Color32 {
    Color32::from_rgb((argb >> 16) as u8, (argb >> 8) as u8, argb as u8)
}

/// Composites `layer` over `base` at `opacity` in sRGB, the M3 state-layer formula.
#[must_use]
pub fn state_layer(base: Color32, layer: Color32, opacity: f32) -> Color32 {
    let mix = |a: u8, b: u8| -> u8 {
        (f32::from(a) + (f32::from(b) - f32::from(a)) * opacity)
            .round()
            .clamp(0.0, 255.0) as u8
    };
    Color32::from_rgb(
        mix(base.r(), layer.r()),
        mix(base.g(), layer.g()),
        mix(base.b(), layer.b()),
    )
}

/// `color` at `alpha` (`0..=1`), unmultiplied.
#[must_use]
pub fn with_alpha(color: Color32, alpha: f32) -> Color32 {
    Color32::from_rgba_unmultiplied(
        color.r(),
        color.g(),
        color.b(),
        (alpha.clamp(0.0, 1.0) * 255.0).round() as u8,
    )
}

/// Every resolved M3 role of one scheme plus the harmonised extended colours, as egui colours.
///
/// Stored in the egui context per [`Theme`] by [`apply`] so [`widgets`] can read it.
#[derive(Clone, Debug, PartialEq)]
pub struct Palette {
    colors: [Color32; 49],
    /// Dark mode.
    pub dark: bool,
    /// Harmonised `warning` (`--md-ext-color-warning`).
    pub warning: Color32,
    /// Text/icon colour on [`Palette::warning`].
    pub on_warning: Color32,
    /// Harmonised `success` (`--md-ext-color-success`).
    pub success: Color32,
    /// Text/icon colour on [`Palette::success`].
    pub on_success: Color32,
}

impl Palette {
    /// Resolves every role of `scheme`.
    #[must_use]
    pub fn from_scheme(scheme: &DynamicScheme) -> Self {
        let mut colors = [Color32::BLACK; 49];
        for (slot, (_, argb)) in colors.iter_mut().zip(scheme.roles()) {
            *slot = color(argb);
        }
        let source = scheme.source.to_argb();
        let pick = |seed: u32| {
            let custom = custom_color(source, seed, true);
            let group = if scheme.is_dark { custom.dark } else { custom.light };
            (color(group.color), color(group.on_color))
        };
        let (warning, on_warning) = pick(WARNING_SEED);
        let (success, on_success) = pick(SUCCESS_SEED);
        Self {
            colors,
            dark: scheme.is_dark,
            warning,
            on_warning,
            success,
            on_success,
        }
    }

    /// The colour of `role`. Palette key colours, which are not system roles, resolve to their
    /// nearest system role.
    #[must_use]
    pub fn get(&self, role: Role) -> Color32 {
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
            .map_or(Color32::MAGENTA, |i| self.colors[i])
    }

    fn id(theme: Theme) -> Id {
        Id::new(("aphrody-m3-egui::Palette", theme == Theme::Dark))
    }

    /// The palette [`apply`] installed for the context's current theme, or the default scheme.
    #[must_use]
    pub fn of(ctx: &Context) -> Arc<Self> {
        let theme = ctx.theme();
        ctx.data(|d| d.get_temp::<Arc<Self>>(Self::id(theme)))
            .unwrap_or_else(|| {
                Arc::new(Self::from_scheme(&DynamicScheme::from_argb(
                    DEFAULT_SEED,
                    Variant::TonalSpot,
                    theme == Theme::Dark,
                    0.0,
                )))
            })
    }
}

/// M3 shape scale in egui units (1 dp = 1 point).
pub mod shapes {
    use super::{CornerRadius, shape};

    const fn r(c: shape::CornerRadius) -> CornerRadius {
        let dp = if c.dp > 255 { 255 } else { c.dp as u8 };
        CornerRadius::same(dp)
    }

    /// `none` (0).
    pub const NONE: CornerRadius = r(shape::NONE);
    /// `extra-small` (4): menus, snackbars, text field tops.
    pub const EXTRA_SMALL: CornerRadius = r(shape::EXTRA_SMALL);
    /// `small` (8): chips.
    pub const SMALL: CornerRadius = r(shape::SMALL);
    /// `medium` (12): cards, small FAB.
    pub const MEDIUM: CornerRadius = r(shape::MEDIUM);
    /// `large` (16): FAB, navigation drawer.
    pub const LARGE: CornerRadius = r(shape::LARGE);
    /// `extra-large` (28): dialogs, large FAB, bottom sheets.
    pub const EXTRA_LARGE: CornerRadius = r(shape::EXTRA_LARGE);
    /// `full`: buttons, switches, badges (egui clamps to half the rect height).
    pub const FULL: CornerRadius = CornerRadius::same(255);

    /// Top corners only (filled text field).
    #[must_use]
    pub const fn top(radius: u8) -> CornerRadius {
        CornerRadius {
            nw: radius,
            ne: radius,
            sw: 0,
            se: 0,
        }
    }
}

/// The 4 dp spacing grid.
pub mod spacing {
    /// One grid step.
    pub const UNIT: f32 = 4.0;
    /// `n` grid steps.
    #[must_use]
    pub const fn dp(n: u8) -> f32 {
        UNIT * n as f32
    }
}

/// Custom [`TextStyle::Name`]s carrying the full M3 typescale.
pub mod type_scale {
    use super::{FontFamily, FontId, TextStyle, typography};

    /// `(name, style)` for the 15 M3 typescale roles.
    pub const ROLES: [(&str, typography::TypeStyle); 15] = [
        ("display-large", typography::DISPLAY_LARGE),
        ("display-medium", typography::DISPLAY_MEDIUM),
        ("display-small", typography::DISPLAY_SMALL),
        ("headline-large", typography::HEADLINE_LARGE),
        ("headline-medium", typography::HEADLINE_MEDIUM),
        ("headline-small", typography::HEADLINE_SMALL),
        ("title-large", typography::TITLE_LARGE),
        ("title-medium", typography::TITLE_MEDIUM),
        ("title-small", typography::TITLE_SMALL),
        ("body-large", typography::BODY_LARGE),
        ("body-medium", typography::BODY_MEDIUM),
        ("body-small", typography::BODY_SMALL),
        ("label-large", typography::LABEL_LARGE),
        ("label-medium", typography::LABEL_MEDIUM),
        ("label-small", typography::LABEL_SMALL),
    ];

    /// `TextStyle::Name(name)`, e.g. `style("headline-small")`.
    #[must_use]
    pub fn style(name: &str) -> TextStyle {
        TextStyle::Name(name.into())
    }

    /// Proportional font of an M3 type style.
    #[must_use]
    pub fn font(style: typography::TypeStyle) -> FontId {
        FontId::new(style.size_dp, FontFamily::Proportional)
    }
}

/// M3 elevation shadow of `level` (0..=5) in `shadow_color`.
#[must_use]
pub fn elevation_shadow(level: u8, shadow_color: Color32) -> Shadow {
    // Key shadow of the M3 elevation levels (offset y, blur, spread, alpha).
    let (y, blur, spread, alpha) = match level {
        0 => return Shadow::NONE,
        1 => (1, 3, 1, 0.15),
        2 => (2, 6, 2, 0.15),
        3 => (4, 8, 3, 0.15),
        4 => (6, 10, 4, 0.15),
        _ => (8, 12, 6, 0.15),
    };
    Shadow {
        offset: [0, y],
        blur,
        spread,
        color: with_alpha(shadow_color, alpha * 2.0),
    }
}

fn widget(
    bg: Color32,
    weak_bg: Color32,
    stroke: Stroke,
    fg: Color32,
    radius: CornerRadius,
) -> egui::style::WidgetVisuals {
    egui::style::WidgetVisuals {
        bg_fill: bg,
        weak_bg_fill: weak_bg,
        bg_stroke: stroke,
        corner_radius: radius,
        fg_stroke: Stroke::new(1.0, fg),
        expansion: 0.0,
    }
}

/// Maps `scheme` to [`egui::Visuals`] (catalog `egui` column).
#[must_use]
pub fn visuals(scheme: &DynamicScheme) -> Visuals {
    visuals_from(&Palette::from_scheme(scheme))
}

/// [`visuals`] from an already resolved [`Palette`].
#[must_use]
pub fn visuals_from(p: &Palette) -> Visuals {
    use Role as R;
    let on_surface = p.get(R::OnSurface);
    let on_sc = p.get(R::OnSecondaryContainer);
    let sc = p.get(R::SecondaryContainer);
    let highest = p.get(R::SurfaceContainerHighest);
    let hover = state::HOVER.opacity;
    let pressed = state::PRESSED.opacity;
    let radius = shapes::SMALL;

    let mut v = if p.dark { Visuals::dark() } else { Visuals::light() };
    v.dark_mode = p.dark;
    v.override_text_color = None;
    v.weak_text_color = Some(p.get(R::OnSurfaceVariant));
    v.widgets = egui::style::Widgets {
        noninteractive: widget(
            p.get(R::SurfaceContainer),
            p.get(R::SurfaceContainerLow),
            Stroke::new(1.0, p.get(R::OutlineVariant)),
            on_surface,
            shapes::MEDIUM,
        ),
        inactive: widget(
            highest,
            sc,
            Stroke::new(1.0, p.get(R::Outline)),
            on_sc,
            radius,
        ),
        hovered: widget(
            state_layer(highest, on_surface, hover),
            state_layer(sc, on_sc, hover),
            Stroke::new(1.0, p.get(R::Outline)),
            on_sc,
            radius,
        ),
        active: widget(
            p.get(R::Primary),
            state_layer(sc, on_sc, pressed),
            Stroke::new(1.0, p.get(R::Primary)),
            on_sc,
            radius,
        ),
        open: widget(
            p.get(R::SurfaceContainerHigh),
            sc,
            Stroke::new(1.0, p.get(R::Primary)),
            on_sc,
            radius,
        ),
    };
    v.selection = egui::style::Selection {
        bg_fill: p.get(R::Primary),
        stroke: Stroke::new(1.0, p.get(R::OnPrimary)),
    };
    v.ime_composition.active_underline_stroke = Stroke::new(2.0, p.get(R::Primary));
    v.ime_composition.inactive_underline_stroke = Stroke::new(1.0, p.get(R::OnSurfaceVariant));
    v.hyperlink_color = p.get(R::Primary);
    v.faint_bg_color = p.get(R::SurfaceContainerHigh);
    v.extreme_bg_color = p.get(R::SurfaceContainerLowest);
    v.text_edit_bg_color = Some(highest);
    v.code_bg_color = highest;
    v.warn_fg_color = p.warning;
    v.error_fg_color = p.get(R::Error);
    v.window_corner_radius = shapes::EXTRA_LARGE;
    v.window_shadow = elevation_shadow(3, p.get(R::Shadow));
    v.window_fill = p.get(R::SurfaceContainer);
    v.window_stroke = Stroke::NONE;
    v.menu_corner_radius = shapes::EXTRA_SMALL;
    v.panel_fill = p.get(R::Surface);
    v.popup_shadow = elevation_shadow(2, p.get(R::Shadow));
    v.text_cursor.stroke = Stroke::new(2.0, p.get(R::Primary));
    v.button_frame = true;
    v.collapsing_header_frame = false;
    v.indent_has_left_vline = true;
    v.striped = false;
    v.slider_trailing_fill = true;
    v.handle_shape = egui::style::HandleShape::Circle;
    v.disabled_alpha = state::DISABLED_CONTENT.opacity;
    v
}

/// M3 typescale mapped onto the built-in [`TextStyle`]s plus a `Name` per typescale role.
#[must_use]
pub fn text_styles() -> BTreeMap<TextStyle, FontId> {
    let mut map: BTreeMap<TextStyle, FontId> = BTreeMap::new();
    map.insert(TextStyle::Small, type_scale::font(typography::BODY_SMALL));
    map.insert(TextStyle::Body, type_scale::font(typography::BODY_MEDIUM));
    map.insert(TextStyle::Button, type_scale::font(typography::LABEL_LARGE));
    map.insert(TextStyle::Heading, type_scale::font(typography::TITLE_LARGE));
    map.insert(
        TextStyle::Monospace,
        FontId::new(typography::BODY_MEDIUM.size_dp, FontFamily::Monospace),
    );
    for (name, ts) in type_scale::ROLES {
        map.insert(type_scale::style(name), type_scale::font(ts));
    }
    map
}

/// M3 spacing on the 4 dp grid.
pub fn apply_spacing(s: &mut egui::style::Spacing) {
    use spacing::dp;
    s.item_spacing = Vec2::new(dp(2), dp(2));
    s.window_margin = Margin::same(24);
    s.button_padding = Vec2::new(dp(4), dp(2));
    s.menu_margin = Margin::same(8);
    s.indent = dp(4);
    s.interact_size = Vec2::new(dp(10), dp(7));
    s.slider_width = dp(50);
    s.slider_rail_height = dp(1);
    s.combo_width = dp(40);
    s.text_edit_width = dp(70);
    s.icon_width = dp(4) + 2.0;
    s.icon_width_inner = dp(2) + 2.0;
    s.icon_spacing = dp(2);
    s.tooltip_width = 312.0;
    s.menu_width = dp(50);
    s.menu_spacing = dp(1);
    s.combo_height = 280.0;
}

/// Maps `scheme` to a full [`egui::Style`]: visuals, M3 typescale, 4 dp spacing, motion.
#[must_use]
pub fn style(scheme: &DynamicScheme) -> Style {
    style_from(&Palette::from_scheme(scheme))
}

fn style_from(p: &Palette) -> Style {
    let mut s = Style {
        visuals: visuals_from(p),
        text_styles: text_styles(),
        ..Style::default()
    };
    apply_spacing(&mut s.spacing);
    // `short4` (200 ms) for small component transitions.
    s.animation_time = 0.2;
    s
}

/// Installs `scheme` as the style of its mode (light or dark) and switches the context to it.
pub fn apply(ctx: &Context, scheme: &DynamicScheme) {
    install(ctx, scheme);
    ctx.set_theme(Theme::from_dark_mode(scheme.is_dark));
}

/// Installs `scheme` as the style of its mode without changing the active theme.
pub fn install(ctx: &Context, scheme: &DynamicScheme) {
    let palette = Palette::from_scheme(scheme);
    let theme = Theme::from_dark_mode(scheme.is_dark);
    ctx.set_style_of(theme, style_from(&palette));
    ctx.data_mut(|d| d.insert_temp(Palette::id(theme), Arc::new(palette)));
}

/// User preference for the active mode.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Mode {
    /// Follow `ctx.system_theme()` (falls back to dark when the platform reports nothing).
    #[default]
    System,
    /// Always light.
    Light,
    /// Always dark.
    Dark,
}

/// Keeps an egui context on one M3 seed, re-resolving both modes on change and following the
/// system light/dark setting.
#[derive(Clone, Debug)]
pub struct ThemeController {
    seed: u32,
    variant: Variant,
    contrast: f64,
    mode: Mode,
    installed: Option<(u32, Variant, u64)>,
    active: Option<Theme>,
}

impl ThemeController {
    /// A controller for `seed` (`0xAARRGGBB`), `variant` and `contrast` (`-1.0..=1.0`).
    #[must_use]
    pub const fn new(seed: u32, variant: Variant, contrast: f64) -> Self {
        Self {
            seed,
            variant,
            contrast,
            mode: Mode::System,
            installed: None,
            active: None,
        }
    }

    /// Seed colour.
    #[must_use]
    pub const fn seed(&self) -> u32 {
        self.seed
    }
    /// Sets the seed colour.
    pub fn set_seed(&mut self, seed: u32) {
        self.seed = seed;
    }
    /// Scheme variant.
    #[must_use]
    pub const fn variant(&self) -> Variant {
        self.variant
    }
    /// Sets the scheme variant.
    pub fn set_variant(&mut self, variant: Variant) {
        self.variant = variant;
    }
    /// Contrast level.
    #[must_use]
    pub const fn contrast(&self) -> f64 {
        self.contrast
    }
    /// Sets the contrast level, clamped to `-1.0..=1.0`.
    pub fn set_contrast(&mut self, contrast: f64) {
        self.contrast = contrast.clamp(-1.0, 1.0);
    }
    /// Mode preference.
    #[must_use]
    pub const fn mode(&self) -> Mode {
        self.mode
    }
    /// Sets the mode preference.
    pub fn set_mode(&mut self, mode: Mode) {
        self.mode = mode;
    }

    /// The mode in effect for `ctx`.
    #[must_use]
    pub fn effective_theme(&self, ctx: &Context) -> Theme {
        match self.mode {
            Mode::Light => Theme::Light,
            Mode::Dark => Theme::Dark,
            Mode::System => ctx.system_theme().unwrap_or(Theme::Dark),
        }
    }

    /// The scheme of the mode in effect.
    #[must_use]
    pub fn scheme(&self, ctx: &Context) -> DynamicScheme {
        self.scheme_for(self.effective_theme(ctx))
    }

    /// The scheme of `theme`.
    #[must_use]
    pub fn scheme_for(&self, theme: Theme) -> DynamicScheme {
        DynamicScheme::from_argb(self.seed, self.variant, theme == Theme::Dark, self.contrast)
    }

    /// Call once per frame (from `App::logic`): re-installs both modes when the seed, variant or
    /// contrast changed and switches to the mode in effect when it changed.
    pub fn update(&mut self, ctx: &Context) {
        let key = (self.seed, self.variant, self.contrast.to_bits());
        if self.installed != Some(key) {
            install(ctx, &self.scheme_for(Theme::Light));
            install(ctx, &self.scheme_for(Theme::Dark));
            self.installed = Some(key);
        }
        let theme = self.effective_theme(ctx);
        if self.active != Some(theme) {
            ctx.set_theme(match self.mode {
                Mode::System if ctx.system_theme().is_some() => ThemePreference::System,
                _ => ThemePreference::from(theme),
            });
            self.active = Some(theme);
        }
    }
}

impl Default for ThemeController {
    fn default() -> Self {
        Self::new(DEFAULT_SEED, Variant::TonalSpot, 0.0)
    }
}
