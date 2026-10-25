// SPDX-License-Identifier: Apache-2.0
//! Material 3 widget gallery for Bevy UI.
//!
//! `cargo run --example gallery` — `D` toggles dark mode, `C` cycles the source colour.

use aphrody_m3_bevy::{
    M3ButtonVariant, M3CardVariant, M3Fill, M3Plugin, M3Theme, Role, ThemeMode, TypeRole,
    m3_button, m3_card, m3_checkbox, m3_radio, m3_radio_group, m3_scrollbar, m3_slider,
    m3_switch, m3_text,
};
use bevy::prelude::*;
use bevy::ui_widgets::{Activate, ControlOrientation, ValueChange};

const SEEDS: [u32; 4] = [0xFF67_50A4, 0xFF00_6A60, 0xFFB3_261E, 0xFF35_5CA8];

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Bun UI - Material 3 for Bevy".into(),
                ..default()
            }),
            ..default()
        }))
        .add_plugins(M3Plugin { mode: ThemeMode::System, ..default() })
        .add_systems(Startup, setup)
        .add_systems(Update, keyboard)
        .add_observer(|activate: On<Activate>, names: Query<&Name>| {
            let name = names.get(activate.entity).map_or("button", |n| n.as_str());
            info!("activated {name}");
        })
        .add_observer(|change: On<ValueChange<f32>>| {
            info!("slider {:?} = {:.1}", change.source, change.value);
        })
        .run();
}

fn row() -> Node {
    Node {
        flex_direction: FlexDirection::Row,
        flex_wrap: FlexWrap::Wrap,
        align_items: AlignItems::Center,
        column_gap: Val::Px(12.0),
        row_gap: Val::Px(12.0),
        ..default()
    }
}

fn setup(mut commands: Commands, theme: Res<M3Theme>) {
    commands.spawn(Camera2d);

    let root = commands
        .spawn((
            M3Fill(Role::Surface),
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                flex_direction: FlexDirection::Row,
                ..default()
            },
        ))
        .id();

    let page = commands
        .spawn((
            Node {
                flex_grow: 1.0,
                flex_direction: FlexDirection::Column,
                padding: UiRect::all(Val::Px(24.0)),
                row_gap: Val::Px(24.0),
                overflow: Overflow::scroll_y(),
                ..default()
            },
            ChildOf(root),
        ))
        .id();
    commands.spawn(m3_scrollbar(page, ControlOrientation::Vertical)).insert(ChildOf(root));

    commands.spawn((
        m3_text("Material 3 gallery", TypeRole::HeadlineMedium, Role::OnSurface),
        ChildOf(page),
    ));

    let buttons = commands.spawn((row(), ChildOf(page))).id();
    for (variant, label) in [
        (M3ButtonVariant::Filled, "Filled"),
        (M3ButtonVariant::Tonal, "Tonal"),
        (M3ButtonVariant::Elevated, "Elevated"),
        (M3ButtonVariant::Outlined, "Outlined"),
        (M3ButtonVariant::Text, "Text"),
    ] {
        commands.spawn((m3_button(variant, label), Name::new(label), ChildOf(buttons)));
    }
    commands.spawn((
        m3_button(M3ButtonVariant::Filled, "Disabled"),
        bevy::ui::InteractionDisabled,
        ChildOf(buttons),
    ));

    let toggles = commands.spawn((row(), ChildOf(page))).id();
    commands.spawn((m3_checkbox("Accept terms", true), ChildOf(toggles)));
    commands.spawn((m3_checkbox("Subscribe", false), ChildOf(toggles)));
    commands.spawn((m3_switch("Wi-Fi", true), ChildOf(toggles)));
    commands.spawn((m3_switch("Bluetooth", false), ChildOf(toggles)));

    let group = commands.spawn((m3_radio_group("Density"), ChildOf(page))).id();
    for (label, checked) in [("Compact", false), ("Default", true), ("Comfortable", false)] {
        commands.spawn((m3_radio(label, checked), ChildOf(group)));
    }

    commands.spawn((m3_slider("Volume", 0.0..=100.0, 40.0), ChildOf(page)));

    let cards = commands.spawn((row(), ChildOf(page))).id();
    for (variant, title) in [
        (M3CardVariant::Elevated, "Elevated card"),
        (M3CardVariant::Filled, "Filled card"),
        (M3CardVariant::Outlined, "Outlined card"),
    ] {
        let card = commands.spawn((m3_card(variant, &theme), ChildOf(cards))).id();
        commands.spawn((m3_text(title, TypeRole::TitleMedium, Role::OnSurface), ChildOf(card)));
        commands.spawn((
            m3_text("Supporting text", TypeRole::BodyMedium, Role::OnSurfaceVariant),
            ChildOf(card),
        ));
    }

    for role in TypeRole::ALL {
        commands.spawn((m3_text(role.name(), role, Role::OnSurface), ChildOf(page)));
    }
}

fn keyboard(keys: Res<ButtonInput<KeyCode>>, mut theme: ResMut<M3Theme>, mut seed: Local<usize>) {
    if keys.just_pressed(KeyCode::KeyD) {
        let dark = !theme.is_dark();
        theme.mode = if dark { ThemeMode::Dark } else { ThemeMode::Light };
        theme.set_dark(dark);
    }
    if keys.just_pressed(KeyCode::KeyC) {
        *seed = (*seed + 1) % SEEDS.len();
        let mut next = M3Theme::from_source(
            SEEDS[*seed],
            theme.scheme.variant,
            theme.is_dark(),
            theme.scheme.contrast_level,
        );
        next.mode = theme.mode;
        *theme = next;
    }
}
