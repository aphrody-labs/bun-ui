// SPDX-License-Identifier: Apache-2.0
//! Material 3 skins over the `bevy_ui_widgets` headless widgets.
//!
//! Behaviour (pointer, keyboard, `Activate`/`ValueChange` events, AccessKit roles) stays in the
//! headless widgets; this module only adds the M3 look: container and content colours, shapes,
//! elevation and state layers derived from `Hovered`, `Pressed`, input focus and
//! `InteractionDisabled`.

use accesskit::Role as AccessRole;
use aphrody_m3_tokens::scheme::Role;
use bevy::a11y::AccessibilityNode;
use bevy::input_focus::{InputFocus, InputFocusVisible};
use bevy::picking::hover::Hovered;
use bevy::picking::Pickable;
use bevy::prelude::*;
use bevy::ui::prelude::AccessibleLabel;
use bevy::ui::{
    BorderColor, BoxShadow, Checked, InteractionDisabled, Pressed, UiRect, Val,
};
use bevy::ui_widgets::{
    Button as HeadlessButton, Checkbox, ControlOrientation, RadioButton, RadioGroup, Scrollbar,
    ScrollbarThumb, Slider, SliderRange, SliderThumb, SliderValue, checkbox_self_update,
    radio_self_update, slider_self_update,
};

use crate::theme::{M3Theme, ShapeRole, TypeRole, state_layer};

// ── Markers ──────────────────────────────────────────────────────────────────

/// M3 common-button variants.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Reflect)]
pub enum M3ButtonVariant {
    /// High emphasis: `primary` container.
    #[default]
    Filled,
    /// Medium emphasis: `secondary-container`.
    Tonal,
    /// Medium emphasis: `outline` border, transparent container.
    Outlined,
    /// Low emphasis: no container.
    Text,
    /// `surface-container-low` with elevation 1.
    Elevated,
}

impl M3ButtonVariant {
    fn container(self, t: &M3Theme) -> Color {
        match self {
            Self::Filled => t.primary(),
            Self::Tonal => t.secondary_container(),
            Self::Elevated => t.surface_container_low(),
            Self::Outlined | Self::Text => Color::NONE,
        }
    }

    fn content(self, t: &M3Theme) -> Color {
        match self {
            Self::Filled => t.on_primary(),
            Self::Tonal => t.on_secondary_container(),
            Self::Outlined | Self::Text | Self::Elevated => t.primary(),
        }
    }
}

/// An M3 button over the headless `bevy_ui_widgets::Button` (emits `Activate`).
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
#[require(HeadlessButton, Hovered, M3State, BackgroundColor, BorderColor, BoxShadow)]
pub struct M3Button {
    /// Visual variant.
    pub variant: M3ButtonVariant,
}

/// An M3 checkbox over the headless `Checkbox` (toggles `Checked`, emits `ValueChange<bool>`).
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
#[require(Checkbox, Hovered, M3State, BackgroundColor)]
pub struct M3Checkbox;

/// An M3 switch: a headless `Checkbox` exposed to AccessKit with the `Switch` role.
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
#[require(
    Checkbox,
    AccessibilityNode(accesskit::Node::new(AccessRole::Switch)),
    Hovered,
    M3State,
    BackgroundColor,
    BorderColor
)]
pub struct M3Switch;

/// An M3 radio button over the headless `RadioButton`; place it under an [`M3RadioGroup`].
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
#[require(RadioButton, Hovered, M3State, BackgroundColor)]
pub struct M3Radio;

/// An M3 radio group over the headless `RadioGroup` (emits `ValueChange<Entity>`).
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
#[require(RadioGroup)]
pub struct M3RadioGroup;

/// An M3 slider over the headless `Slider` (emits `ValueChange<f32>`).
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
#[require(Slider, Hovered, M3State)]
pub struct M3Slider;

/// Skins a headless `Scrollbar` and its `ScrollbarThumb` child.
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
#[require(Hovered, BackgroundColor)]
pub struct M3Scrollbar;

/// M3 card variants.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Reflect)]
pub enum M3CardVariant {
    /// `surface-container-low` with elevation 1.
    #[default]
    Elevated,
    /// `surface-container-highest`.
    Filled,
    /// `surface` with an `outline-variant` border.
    Outlined,
}

/// An M3 card container.
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
#[require(Node, BackgroundColor, BorderColor, BoxShadow)]
pub struct M3Card {
    /// Visual variant.
    pub variant: M3CardVariant,
}

/// Applies an M3 type role (and optionally a colour role) to a `Text` entity.
#[derive(Component, Clone, Copy, Debug, PartialEq, Reflect)]
#[reflect(opaque)]
pub struct M3Text {
    /// Type-scale role.
    pub role: TypeRole,
    /// Colour role; `None` leaves `TextColor` to the parent widget skin.
    pub color: Option<Role>,
}

impl M3Text {
    /// Text in `role` coloured with `color`.
    #[must_use]
    pub const fn new(role: TypeRole, color: Role) -> Self {
        Self { role, color: Some(color) }
    }

    /// Text in `role` whose colour is driven by the enclosing widget.
    #[must_use]
    pub const fn content(role: TypeRole) -> Self {
        Self { role, color: None }
    }
}

/// Fills a node's background with a colour role (surfaces, panes, dividers).
#[derive(Component, Clone, Copy, Debug, PartialEq, Reflect)]
#[reflect(opaque)]
#[require(BackgroundColor)]
pub struct M3Fill(pub Role);

/// The interaction state of a skinned widget, recomputed every frame.
#[derive(Component, Clone, Copy, Debug, Default, PartialEq, Eq, Reflect)]
pub struct M3State {
    /// Pointer over the widget or a descendant.
    pub hovered: bool,
    /// Pointer or key held down.
    pub pressed: bool,
    /// Keyboard focus with a visible focus ring.
    pub focused: bool,
    /// `InteractionDisabled` present.
    pub disabled: bool,
    /// `Checked` present.
    pub checked: bool,
}

impl M3State {
    /// State-layer opacity: disabled > pressed > focus > hover, as in the M3 spec.
    #[must_use]
    pub fn layer_opacity(self, t: &M3Theme) -> f32 {
        if self.disabled {
            0.0
        } else if self.pressed {
            t.state.pressed
        } else if self.focused {
            t.state.focus
        } else if self.hovered {
            t.state.hover
        } else {
            0.0
        }
    }
}

// Decorative parts of composite widgets.
#[derive(Component, Clone, Copy, Debug, Default)]
pub(crate) struct CheckboxBox;
#[derive(Component, Clone, Copy, Debug, Default)]
pub(crate) struct CheckboxMark;
#[derive(Component, Clone, Copy, Debug, Default)]
pub(crate) struct SwitchHandle;
#[derive(Component, Clone, Copy, Debug, Default)]
pub(crate) struct RadioRing;
#[derive(Component, Clone, Copy, Debug, Default)]
pub(crate) struct RadioDot;
#[derive(Component, Clone, Copy, Debug, Default)]
pub(crate) struct SliderTrack;
#[derive(Component, Clone, Copy, Debug, Default)]
pub(crate) struct SliderActiveTrack;

// ── Systems ──────────────────────────────────────────────────────────────────

pub(crate) fn update_state(
    focus: Option<Res<InputFocus>>,
    focus_visible: Option<Res<InputFocusVisible>>,
    mut q: Query<(
        Entity,
        &mut M3State,
        Option<&Hovered>,
        Has<Pressed>,
        Has<InteractionDisabled>,
        Has<Checked>,
    )>,
) {
    let focused = focus.and_then(|f| f.get());
    let visible = focus_visible.is_some_and(|v| v.0);
    for (entity, mut state, hovered, pressed, disabled, checked) in &mut q {
        state.set_if_neq(M3State {
            hovered: hovered.is_some_and(|h| h.0),
            pressed,
            focused: visible && focused == Some(entity),
            disabled,
            checked,
        });
    }
}

pub(crate) fn skin_text(
    theme: Res<M3Theme>,
    mut commands: Commands,
    q: Query<(Entity, Ref<M3Text>)>,
) {
    for (entity, text) in &q {
        if !(theme.is_changed() || text.is_changed()) {
            continue;
        }
        let style = theme.type_style(text.role);
        let mut e = commands.entity(entity);
        e.insert((style.font.clone(), style.line_height, style.letter_spacing));
        if let Some(role) = text.color {
            e.insert(TextColor(theme.color(role)));
        }
    }
}

pub(crate) fn skin_fill(theme: Res<M3Theme>, mut q: Query<(&M3Fill, &mut BackgroundColor)>) {
    for (fill, mut bg) in &mut q {
        bg.set_if_neq(BackgroundColor(theme.color(fill.0)));
    }
}

fn set_content(
    children: Option<&Children>,
    color: Color,
    texts: &mut Query<&mut TextColor, With<M3Text>>,
) {
    for child in children.into_iter().flatten() {
        if let Ok(mut c) = texts.get_mut(*child) {
            c.set_if_neq(TextColor(color));
        }
    }
}

pub(crate) fn skin_buttons(
    theme: Res<M3Theme>,
    mut q: Query<(
        &M3Button,
        &M3State,
        &mut BackgroundColor,
        &mut BorderColor,
        &mut BoxShadow,
        &mut Node,
        Option<&Children>,
    )>,
    mut texts: Query<&mut TextColor, With<M3Text>>,
) {
    let t = &*theme;
    for (button, state, mut bg, mut border, mut shadow, mut node, children) in &mut q {
        let v = button.variant;
        let content = v.content(t);
        let (container, content) = if state.disabled {
            let c = t.on_surface();
            let container = match v {
                M3ButtonVariant::Outlined | M3ButtonVariant::Text => Color::NONE,
                _ => c.with_alpha(t.state.disabled_container),
            };
            (container, c.with_alpha(t.state.disabled_content))
        } else {
            (state_layer(v.container(t), content, state.layer_opacity(t)), content)
        };
        bg.set_if_neq(BackgroundColor(container));
        let outline = match (v, state.disabled, state.focused) {
            (_, false, true) => t.secondary(),
            (M3ButtonVariant::Outlined, true, _) => t.on_surface().with_alpha(t.state.disabled_container),
            (M3ButtonVariant::Outlined, false, _) => t.outline_variant(),
            _ => Color::NONE,
        };
        border.set_if_neq(BorderColor::all(outline));
        let width = if v == M3ButtonVariant::Outlined || state.focused { 1.0 } else { 0.0 };
        if node.border != UiRect::all(Val::Px(width)) {
            node.border = UiRect::all(Val::Px(width));
        }
        let level = match (v, state.disabled, state.hovered && !state.pressed) {
            (_, true, _) => 0,
            (M3ButtonVariant::Elevated, false, true) => 2,
            (M3ButtonVariant::Elevated, false, false) => 1,
            (M3ButtonVariant::Filled | M3ButtonVariant::Tonal, false, true) => 1,
            _ => 0,
        };
        let s = t.box_shadow(level);
        if *shadow != s {
            *shadow = s;
        }
        set_content(children, content, &mut texts);
    }
}

pub(crate) fn skin_cards(
    theme: Res<M3Theme>,
    mut q: Query<(&M3Card, &mut BackgroundColor, &mut BorderColor, &mut BoxShadow)>,
) {
    let t = &*theme;
    for (card, mut bg, mut border, mut shadow) in &mut q {
        let (container, outline, level) = match card.variant {
            M3CardVariant::Elevated => (t.surface_container_low(), Color::NONE, 1),
            M3CardVariant::Filled => (t.surface_container_highest(), Color::NONE, 0),
            M3CardVariant::Outlined => (t.surface(), t.outline_variant(), 0),
        };
        bg.set_if_neq(BackgroundColor(container));
        border.set_if_neq(BorderColor::all(outline));
        let s = t.box_shadow(level);
        if *shadow != s {
            *shadow = s;
        }
    }
}

/// Selected-control colours shared by checkbox, radio and switch.
fn selection_layer(t: &M3Theme, state: &M3State) -> Color {
    let tint = if state.checked { t.primary() } else { t.on_surface() };
    state_layer(Color::NONE, tint, state.layer_opacity(t))
}

#[allow(clippy::type_complexity)]
pub(crate) fn skin_checkboxes(
    theme: Res<M3Theme>,
    mut q: Query<(&M3State, &mut BackgroundColor, &Children), With<M3Checkbox>>,
    mut boxes: Query<
        (&mut BackgroundColor, &mut BorderColor, Option<&Children>),
        (With<CheckboxBox>, Without<M3Checkbox>),
    >,
    mut marks: Query<
        (&mut BackgroundColor, &mut Visibility),
        (With<CheckboxMark>, Without<CheckboxBox>, Without<M3Checkbox>),
    >,
) {
    let t = &*theme;
    for (state, mut layer, children) in &mut q {
        layer.set_if_neq(BackgroundColor(selection_layer(t, state)));
        for child in children {
            let Ok((mut bg, mut border, marks_of)) = boxes.get_mut(*child) else {
                continue;
            };
            let (fill, edge, mark) = match (state.checked, state.disabled) {
                (true, false) => (t.primary(), t.primary(), t.on_primary()),
                (true, true) => {
                    let c = t.on_surface().with_alpha(t.state.disabled_content);
                    (c, Color::NONE, t.surface())
                }
                (false, false) => (Color::NONE, t.on_surface_variant(), Color::NONE),
                (false, true) => (
                    Color::NONE,
                    t.on_surface().with_alpha(t.state.disabled_content),
                    Color::NONE,
                ),
            };
            bg.set_if_neq(BackgroundColor(fill));
            border.set_if_neq(BorderColor::all(edge));
            for m in marks_of.into_iter().flatten() {
                if let Ok((mut mbg, mut vis)) = marks.get_mut(*m) {
                    mbg.set_if_neq(BackgroundColor(mark));
                    vis.set_if_neq(if state.checked { Visibility::Inherited } else { Visibility::Hidden });
                }
            }
        }
    }
}

#[allow(clippy::type_complexity)]
pub(crate) fn skin_switches(
    theme: Res<M3Theme>,
    mut q: Query<
        (&M3State, &mut BackgroundColor, &mut BorderColor, &mut Node, &Children),
        With<M3Switch>,
    >,
    mut handles: Query<(&mut BackgroundColor, &mut Node), (With<SwitchHandle>, Without<M3Switch>)>,
) {
    let t = &*theme;
    for (state, mut track, mut border, mut node, children) in &mut q {
        let (track_c, edge, handle_c) = match (state.checked, state.disabled) {
            (true, false) => (t.primary(), t.primary(), t.on_primary()),
            (false, false) => (
                t.surface_container_highest(),
                t.outline(),
                if state.hovered || state.pressed { t.on_surface_variant() } else { t.outline() },
            ),
            (true, true) => (
                t.on_surface().with_alpha(t.state.disabled_container),
                Color::NONE,
                t.surface(),
            ),
            (false, true) => (
                t.surface_container_highest().with_alpha(t.state.disabled_container),
                t.on_surface().with_alpha(t.state.disabled_container),
                t.on_surface().with_alpha(t.state.disabled_content),
            ),
        };
        track.set_if_neq(BackgroundColor(state_layer(
            track_c,
            if state.checked { t.primary() } else { t.on_surface() },
            state.layer_opacity(t),
        )));
        border.set_if_neq(BorderColor::all(edge));
        let justify = if state.checked { JustifyContent::End } else { JustifyContent::Start };
        if node.justify_content != justify {
            node.justify_content = justify;
        }
        let size = match (state.pressed, state.checked) {
            (true, _) => 28.0,
            (false, true) => 24.0,
            (false, false) => 16.0,
        };
        for child in children {
            if let Ok((mut bg, mut hn)) = handles.get_mut(*child) {
                bg.set_if_neq(BackgroundColor(handle_c));
                if hn.width != Val::Px(size) {
                    hn.width = Val::Px(size);
                    hn.height = Val::Px(size);
                }
            }
        }
    }
}

#[allow(clippy::type_complexity)]
pub(crate) fn skin_radios(
    theme: Res<M3Theme>,
    mut q: Query<(&M3State, &mut BackgroundColor, &Children), With<M3Radio>>,
    mut rings: Query<(&mut BorderColor, Option<&Children>), (With<RadioRing>, Without<M3Radio>)>,
    mut dots: Query<
        (&mut BackgroundColor, &mut Visibility),
        (With<RadioDot>, Without<RadioRing>, Without<M3Radio>),
    >,
) {
    let t = &*theme;
    for (state, mut layer, children) in &mut q {
        layer.set_if_neq(BackgroundColor(selection_layer(t, state)));
        let c = match (state.checked, state.disabled) {
            (_, true) => t.on_surface().with_alpha(t.state.disabled_content),
            (true, false) => t.primary(),
            (false, false) => t.on_surface_variant(),
        };
        for child in children {
            let Ok((mut ring, dots_of)) = rings.get_mut(*child) else {
                continue;
            };
            ring.set_if_neq(BorderColor::all(c));
            for d in dots_of.into_iter().flatten() {
                if let Ok((mut bg, mut vis)) = dots.get_mut(*d) {
                    bg.set_if_neq(BackgroundColor(c));
                    vis.set_if_neq(if state.checked { Visibility::Inherited } else { Visibility::Hidden });
                }
            }
        }
    }
}

#[allow(clippy::type_complexity)]
pub(crate) fn skin_sliders(
    theme: Res<M3Theme>,
    q: Query<(&M3State, &SliderValue, &SliderRange, &Children), With<M3Slider>>,
    mut tracks: Query<
        (&mut BackgroundColor, Option<&Children>),
        (With<SliderTrack>, Without<SliderThumb>, Without<SliderActiveTrack>),
    >,
    mut active: Query<
        (&mut BackgroundColor, &mut Node),
        (With<SliderActiveTrack>, Without<SliderThumb>, Without<SliderTrack>),
    >,
    mut thumbs: Query<
        (&mut BackgroundColor, &mut Node, &mut BoxShadow),
        (With<SliderThumb>, Without<SliderTrack>, Without<SliderActiveTrack>),
    >,
) {
    let t = &*theme;
    for (state, value, range, children) in &q {
        let pos = range.thumb_position(value.0).clamp(0.0, 1.0) * 100.0;
        let (on, off) = if state.disabled {
            let c = t.on_surface();
            (c.with_alpha(t.state.disabled_content), c.with_alpha(t.state.disabled_container))
        } else {
            (t.primary(), t.secondary_container())
        };
        for child in children {
            if let Ok((mut bg, kids)) = tracks.get_mut(*child) {
                bg.set_if_neq(BackgroundColor(off));
                for k in kids.into_iter().flatten() {
                    if let Ok((mut abg, mut an)) = active.get_mut(*k) {
                        abg.set_if_neq(BackgroundColor(on));
                        if an.width != Val::Percent(pos) {
                            an.width = Val::Percent(pos);
                        }
                    }
                }
            }
            if let Ok((mut bg, mut tn, mut shadow)) = thumbs.get_mut(*child) {
                let c = state_layer(on, t.on_primary(), state.layer_opacity(t) * 0.5);
                bg.set_if_neq(BackgroundColor(c));
                let left = Val::Percent(pos);
                if tn.left != left {
                    tn.left = left;
                }
                let s = t.box_shadow(usize::from(!state.disabled));
                if *shadow != s {
                    *shadow = s;
                }
            }
        }
    }
}

#[allow(clippy::type_complexity)]
pub(crate) fn skin_scrollbars(
    theme: Res<M3Theme>,
    mut q: Query<(&Hovered, &mut BackgroundColor, &Children), With<M3Scrollbar>>,
    mut thumbs: Query<(&mut BackgroundColor, Has<Pressed>), (With<ScrollbarThumb>, Without<M3Scrollbar>)>,
) {
    let t = &*theme;
    for (hovered, mut bg, children) in &mut q {
        bg.set_if_neq(BackgroundColor(Color::NONE));
        for child in children {
            if let Ok((mut tbg, pressed)) = thumbs.get_mut(*child) {
                let alpha = if pressed { 0.6 } else if hovered.0 { 0.45 } else { 0.3 };
                tbg.set_if_neq(BackgroundColor(t.on_surface_variant().with_alpha(alpha)));
            }
        }
    }
}

// ── Self-updating observers ──────────────────────────────────────────────────

pub(crate) fn add_self_update(
    add: On<Add<M3SelfUpdate>>,
    q: Query<(Has<M3Checkbox>, Has<M3Switch>, Has<M3RadioGroup>, Has<M3Slider>)>,
    mut commands: Commands,
) {
    let Ok((checkbox, switch, group, slider)) = q.get(add.event_target()) else {
        return;
    };
    let mut e = commands.entity(add.event_target());
    if checkbox || switch {
        e.observe(checkbox_self_update);
    }
    if group {
        e.observe(radio_self_update);
    }
    if slider {
        e.observe(slider_self_update);
    }
}

// ── Spawn helpers ────────────────────────────────────────────────────────────

/// Whether the widget manages its own state (`Checked`, `SliderValue`) from its `ValueChange`
/// events. Add [`M3SelfUpdate`] to opt in; without it the app owns the state.
#[derive(Component, Clone, Copy, Debug, Default, Reflect)]
pub struct M3SelfUpdate;

fn label_text(label: &str) -> impl Bundle {
    (
        Text::new(label.to_owned()),
        M3Text::content(TypeRole::LabelLarge),
        Pickable::IGNORE,
    )
}

/// An M3 button with a text label and an AccessKit name.
#[must_use]
pub fn m3_button(variant: M3ButtonVariant, label: &str) -> impl Bundle {
    (
        M3Button { variant },
        AccessibleLabel::new(label),
        Node {
            height: Val::Px(40.0),
            padding: UiRect::horizontal(Val::Px(24.0)),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            border_radius: BorderRadius::MAX,
            ..default()
        },
        children![label_text(label)],
    )
}

/// An M3 checkbox (40 px touch target, 18 px box) named for AccessKit.
#[must_use]
pub fn m3_checkbox(label: &str, checked: bool) -> impl Bundle {
    (
        M3Checkbox,
        M3SelfUpdate,
        AccessibleLabel::new(label),
        CheckedState(checked),
        Node {
            width: Val::Px(40.0),
            height: Val::Px(40.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            border_radius: BorderRadius::MAX,
            ..default()
        },
        children![(
            CheckboxBox,
            Pickable::IGNORE,
            BackgroundColor::default(),
            BorderColor::default(),
            Node {
                width: Val::Px(18.0),
                height: Val::Px(18.0),
                border: UiRect::all(Val::Px(2.0)),
                border_radius: BorderRadius::all(Val::Px(2.0)),
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                ..default()
            },
            children![(
                CheckboxMark,
                Pickable::IGNORE,
                BackgroundColor::default(),
                Visibility::Hidden,
                Node {
                    width: Val::Px(8.0),
                    height: Val::Px(8.0),
                    border_radius: BorderRadius::all(Val::Px(1.0)),
                    ..default()
                },
            )],
        )],
    )
}

/// An M3 switch (52 x 32 track) named for AccessKit.
#[must_use]
pub fn m3_switch(label: &str, on: bool) -> impl Bundle {
    (
        M3Switch,
        M3SelfUpdate,
        AccessibleLabel::new(label),
        CheckedState(on),
        Node {
            width: Val::Px(52.0),
            height: Val::Px(32.0),
            border: UiRect::all(Val::Px(2.0)),
            padding: UiRect::horizontal(Val::Px(4.0)),
            align_items: AlignItems::Center,
            border_radius: BorderRadius::MAX,
            ..default()
        },
        children![(
            SwitchHandle,
            Pickable::IGNORE,
            BackgroundColor::default(),
            Node {
                width: Val::Px(16.0),
                height: Val::Px(16.0),
                border_radius: BorderRadius::MAX,
                ..default()
            },
        )],
    )
}

/// An M3 radio button named for AccessKit; spawn it as a child of [`m3_radio_group`].
#[must_use]
pub fn m3_radio(label: &str, checked: bool) -> impl Bundle {
    (
        M3Radio,
        AccessibleLabel::new(label),
        CheckedState(checked),
        Node {
            width: Val::Px(40.0),
            height: Val::Px(40.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            border_radius: BorderRadius::MAX,
            ..default()
        },
        children![(
            RadioRing,
            Pickable::IGNORE,
            BorderColor::default(),
            Node {
                width: Val::Px(20.0),
                height: Val::Px(20.0),
                border: UiRect::all(Val::Px(2.0)),
                border_radius: BorderRadius::MAX,
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                ..default()
            },
            children![(
                RadioDot,
                Pickable::IGNORE,
                BackgroundColor::default(),
                Visibility::Hidden,
                Node {
                    width: Val::Px(10.0),
                    height: Val::Px(10.0),
                    border_radius: BorderRadius::MAX,
                    ..default()
                },
            )],
        )],
    )
}

/// An M3 radio group container named for AccessKit; children are [`m3_radio`] bundles.
#[must_use]
pub fn m3_radio_group(label: &str) -> impl Bundle {
    (
        M3RadioGroup,
        M3SelfUpdate,
        AccessibleLabel::new(label),
        Node {
            flex_direction: FlexDirection::Row,
            align_items: AlignItems::Center,
            column_gap: Val::Px(8.0),
            ..default()
        },
    )
}

/// An M3 slider over `range` with an initial `value`, named for AccessKit.
#[must_use]
pub fn m3_slider(label: &str, range: core::ops::RangeInclusive<f32>, value: f32) -> impl Bundle {
    (
        M3Slider,
        M3SelfUpdate,
        AccessibleLabel::new(label),
        SliderRange::from_range(range),
        SliderValue(value),
        Node {
            width: Val::Px(240.0),
            height: Val::Px(44.0),
            align_items: AlignItems::Center,
            ..default()
        },
        children![
            (
                SliderTrack,
                Pickable::IGNORE,
                BackgroundColor::default(),
                Node {
                    position_type: PositionType::Absolute,
                    left: Val::Px(0.0),
                    right: Val::Px(0.0),
                    height: Val::Px(16.0),
                    border_radius: BorderRadius::all(Val::Px(8.0)),
                    overflow: Overflow::clip(),
                    ..default()
                },
                children![(
                    SliderActiveTrack,
                    Pickable::IGNORE,
                    BackgroundColor::default(),
                    Node { height: Val::Percent(100.0), ..default() },
                )],
            ),
            (
                SliderThumb,
                Pickable::IGNORE,
                BackgroundColor::default(),
                BoxShadow::default(),
                Node {
                    position_type: PositionType::Absolute,
                    width: Val::Px(4.0),
                    height: Val::Px(44.0),
                    margin: UiRect::left(Val::Px(-2.0)),
                    border_radius: BorderRadius::MAX,
                    ..default()
                },
            ),
        ],
    )
}

/// An M3 vertical or horizontal scrollbar controlling the scrollable `target`.
#[must_use]
pub fn m3_scrollbar(target: Entity, orientation: ControlOrientation) -> impl Bundle {
    let node = match orientation {
        ControlOrientation::Vertical => Node { width: Val::Px(8.0), height: Val::Percent(100.0), ..default() },
        ControlOrientation::Horizontal => Node { height: Val::Px(8.0), width: Val::Percent(100.0), ..default() },
    };
    (
        M3Scrollbar,
        Scrollbar::new(target, orientation, 24.0),
        node,
        children![(
            ScrollbarThumb { border_radius: BorderRadius::MAX, ..default() },
            BackgroundColor::default(),
        )],
    )
}

/// An M3 card with padding and the medium corner shape.
#[must_use]
pub fn m3_card(variant: M3CardVariant, theme: &M3Theme) -> impl Bundle {
    (
        M3Card { variant },
        Node {
            flex_direction: FlexDirection::Column,
            padding: UiRect::all(Val::Px(16.0)),
            row_gap: Val::Px(8.0),
            border: UiRect::all(Val::Px(if variant == M3CardVariant::Outlined { 1.0 } else { 0.0 })),
            border_radius: theme.border_radius(ShapeRole::Medium),
            ..default()
        },
    )
}

/// A text run in an M3 type role and colour role.
#[must_use]
pub fn m3_text(text: &str, role: TypeRole, color: Role) -> impl Bundle {
    (Text::new(text.to_owned()), M3Text::new(role, color))
}

/// Initial `Checked` state for a spawn helper, applied once and removed.
#[derive(Component, Clone, Copy, Debug)]
pub(crate) struct CheckedState(pub bool);

pub(crate) fn apply_initial_checked(
    add: On<Add<CheckedState>>,
    q: Query<&CheckedState>,
    mut commands: Commands,
) {
    let Ok(state) = q.get(add.event_target()) else {
        return;
    };
    let mut e = commands.entity(add.event_target());
    if state.0 {
        e.insert(Checked);
    }
    e.remove::<CheckedState>();
}
