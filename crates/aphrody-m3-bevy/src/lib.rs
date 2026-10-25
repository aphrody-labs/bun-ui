// SPDX-License-Identifier: Apache-2.0
//! Material 3 for Bevy UI (Bevy 0.20).
//!
//! [`M3Plugin`] resolves one `aphrody_m3_tokens` [`DynamicScheme`] into the [`M3Theme`] resource
//! (all colour roles, type scale as `TextFont`, corner shapes, elevation as `BoxShadow`, state
//! layers and motion), follows the system light/dark theme through `WindowThemeChanged`, and
//! skins the `bevy_ui_widgets` headless widgets through marker components:
//! [`M3Button`], [`M3Checkbox`], [`M3Switch`], [`M3Radio`]/[`M3RadioGroup`], [`M3Slider`],
//! [`M3Scrollbar`], [`M3Card`], [`M3Text`] and [`M3Fill`].
//!
//! Behaviour and AccessKit roles come from the headless widgets; the spawn helpers
//! ([`m3_button`], [`m3_checkbox`], ...) add an `AccessibleLabel` so every control has a name.
//! The token contract is `catalog/conversion.toml` (`bevy = "M3Theme.*"`).

mod theme;
mod widgets;

pub use aphrody_m3_tokens::scheme::{DynamicScheme, Role, Variant};
pub use aphrody_m3_tokens::motion::MotionScheme;
pub use theme::{
    M3Motion, M3StateLayers, M3Theme, M3TypeStyle, ShapeRole, ThemeMode, TypeRole,
    argb_to_color, state_layer,
};
pub use widgets::{
    M3Button, M3ButtonVariant, M3Card, M3CardVariant, M3Checkbox, M3Fill, M3Radio, M3RadioGroup,
    M3Scrollbar, M3SelfUpdate, M3Slider, M3State, M3Switch, M3Text, m3_button, m3_card,
    m3_checkbox, m3_radio, m3_radio_group, m3_scrollbar, m3_slider, m3_switch, m3_text,
};

use bevy::prelude::*;
use bevy::ui_widgets::{ButtonPlugin, UiWidgetsPlugins};
use bevy::window::{WindowTheme, WindowThemeChanged};

/// System sets of the M3 skin, in `Update`.
#[derive(SystemSet, Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum M3Systems {
    /// Theme mode follows the window system theme.
    Theme,
    /// `M3State` from hover, press, focus, disabled and checked.
    State,
    /// Colours, shapes and shadows written to the widget nodes.
    Skin,
}

/// Inserts [`M3Theme`] and the M3 skin systems.
#[derive(Clone, Debug)]
pub struct M3Plugin {
    /// Source colour (`0xAARRGGBB`).
    pub source_argb: u32,
    /// Scheme variant.
    pub variant: Variant,
    /// Contrast level in `-1.0..=1.0`.
    pub contrast: f64,
    /// Light, dark or system.
    pub mode: ThemeMode,
    /// Font family for every type role (`None` keeps Bevy's default font).
    pub font_family: Option<String>,
    /// Spring scheme.
    pub motion: MotionScheme,
    /// Add `bevy_ui_widgets::UiWidgetsPlugins` when the app has not added it.
    pub add_widget_plugins: bool,
}

impl Default for M3Plugin {
    fn default() -> Self {
        Self {
            source_argb: 0xFF67_50A4,
            variant: Variant::TonalSpot,
            contrast: 0.0,
            mode: ThemeMode::System,
            font_family: None,
            motion: MotionScheme::default(),
            add_widget_plugins: true,
        }
    }
}

impl M3Plugin {
    /// A plugin seeded from `source_argb`.
    #[must_use]
    pub fn from_source(source_argb: u32) -> Self {
        Self { source_argb, ..default() }
    }

    /// A plugin over an already resolved scheme; its mode is kept fixed.
    #[must_use]
    pub fn from_scheme(scheme: &DynamicScheme) -> Self {
        Self {
            source_argb: scheme.source.to_argb(),
            variant: scheme.variant,
            contrast: scheme.contrast_level,
            mode: if scheme.is_dark { ThemeMode::Dark } else { ThemeMode::Light },
            ..default()
        }
    }
}

impl Plugin for M3Plugin {
    fn build(&self, app: &mut App) {
        if self.add_widget_plugins && !app.is_plugin_added::<ButtonPlugin>() {
            app.add_plugins(UiWidgetsPlugins);
        }
        let dark = self.mode == ThemeMode::Dark;
        let scheme = DynamicScheme::from_argb(self.source_argb, self.variant, dark, self.contrast);
        app.insert_resource(theme::M3Theme::build(
            scheme,
            self.mode,
            self.font_family.clone(),
            self.motion,
        ))
        .configure_sets(Update, (M3Systems::Theme, M3Systems::State, M3Systems::Skin).chain())
        .add_systems(Update, follow_system_theme.in_set(M3Systems::Theme))
        .add_systems(Update, widgets::update_state.in_set(M3Systems::State))
        .add_systems(
            Update,
            (
                widgets::skin_text,
                widgets::skin_fill,
                widgets::skin_buttons,
                widgets::skin_cards,
                widgets::skin_checkboxes,
                widgets::skin_switches,
                widgets::skin_radios,
                widgets::skin_sliders,
                widgets::skin_scrollbars,
            )
                .chain()
                .in_set(M3Systems::Skin),
        )
        .add_observer(widgets::add_self_update)
        .add_observer(widgets::apply_initial_checked);
    }
}

/// Re-resolves the scheme when the window reports a new system theme (mode `System` only).
fn follow_system_theme(
    mut events: MessageReader<WindowThemeChanged>,
    windows: Query<&Window>,
    mut theme: ResMut<M3Theme>,
    mut seeded: Local<bool>,
) {
    if theme.mode != ThemeMode::System {
        events.clear();
        return;
    }
    let mut wanted = None;
    if !*seeded {
        // A window created with an explicit theme reports it before any change message.
        wanted = windows.iter().find_map(|w| w.window_theme).map(|t| t == WindowTheme::Dark);
        *seeded = true;
    }
    for event in events.read() {
        wanted = Some(event.theme == WindowTheme::Dark);
    }
    if let Some(dark) = wanted
        && dark != theme.is_dark()
    {
        theme.set_dark(dark);
    }
}
