// SPDX-License-Identifier: Apache-2.0
//! M3 components built from stock GTK widgets and the classes styled by [`crate::M3Gtk`].

use adw::prelude::*;

/// M3 common button variants.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum ButtonVariant {
    /// Filled (primary): libadwaita `suggested-action`.
    #[default]
    Filled,
    /// Filled tonal (secondary container).
    Tonal,
    /// Outlined.
    Outlined,
    /// Text: libadwaita `flat`.
    Text,
    /// Elevated (surface container low, level 1).
    Elevated,
}

impl ButtonVariant {
    /// Every variant.
    pub const ALL: [Self; 5] = [Self::Filled, Self::Tonal, Self::Outlined, Self::Text, Self::Elevated];

    /// CSS classes applied to the button.
    #[must_use]
    pub const fn css_classes(self) -> &'static [&'static str] {
        match self {
            Self::Filled => &["suggested-action", "pill"],
            Self::Tonal => &["m3-tonal", "pill"],
            Self::Outlined => &["m3-outlined", "pill"],
            Self::Text => &["flat", "pill"],
            Self::Elevated => &["m3-elevated", "pill"],
        }
    }

    /// Display name.
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Filled => "Filled",
            Self::Tonal => "Tonal",
            Self::Outlined => "Outlined",
            Self::Text => "Text",
            Self::Elevated => "Elevated",
        }
    }
}

fn add_classes(widget: &impl IsA<gtk::Widget>, classes: &[&str]) {
    for class in classes {
        widget.add_css_class(class);
    }
}

/// An M3 button with a text label.
#[must_use]
pub fn m3_button(variant: ButtonVariant, label: &str) -> gtk::Button {
    let button = gtk::Button::with_label(label);
    add_classes(&button, variant.css_classes());
    button
}

/// An M3 button with a leading icon (`AdwButtonContent`).
#[must_use]
pub fn m3_icon_button(variant: ButtonVariant, icon_name: &str, label: &str) -> gtk::Button {
    let content = adw::ButtonContent::builder().icon_name(icon_name).label(label).build();
    let button = gtk::Button::builder().child(&content).build();
    add_classes(&button, variant.css_classes());
    button
}

/// M3 card variants.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum CardVariant {
    /// Surface container low, elevation level 1.
    #[default]
    Elevated,
    /// Surface container highest, flat.
    Filled,
    /// Surface with an outline-variant stroke.
    Outlined,
}

impl CardVariant {
    const fn class(self) -> &'static str {
        match self {
            Self::Elevated => "m3-card-elevated",
            Self::Filled => "m3-card-filled",
            Self::Outlined => "m3-card-outlined",
        }
    }
}

/// An M3 card (medium corners, 16 px padding) holding `child`.
#[must_use]
pub fn m3_card(variant: CardVariant, child: &impl IsA<gtk::Widget>) -> gtk::Box {
    let card = gtk::Box::new(gtk::Orientation::Vertical, 8);
    add_classes(&card, &["card", "m3-card", variant.class()]);
    card.append(child);
    card
}

/// An M3 filter chip: a pill `GtkToggleButton` (checked = selected).
#[must_use]
pub fn m3_chip(label: &str) -> gtk::ToggleButton {
    let chip = gtk::ToggleButton::with_label(label);
    add_classes(&chip, &["pill", "m3-chip"]);
    chip
}

/// Wraps `content` in a `GtkOverlay` with an M3 FAB at the bottom end.
///
/// Returns the overlay (to place in the layout) and the FAB (to connect `clicked`).
/// A non-empty `label` gives an extended FAB.
#[must_use]
pub fn m3_fab(content: &impl IsA<gtk::Widget>, icon_name: &str, label: Option<&str>) -> (gtk::Overlay, gtk::Button) {
    let fab = match label {
        Some(label) if !label.is_empty() => {
            let button = m3_icon_button(ButtonVariant::Filled, icon_name, label);
            button.set_css_classes(&["m3-fab", "m3-fab-extended"]);
            button
        }
        _ => {
            let button = gtk::Button::from_icon_name(icon_name);
            button.add_css_class("m3-fab");
            button
        }
    };
    fab.set_halign(gtk::Align::End);
    fab.set_valign(gtk::Align::End);
    fab.set_margin_end(16);
    fab.set_margin_bottom(16);
    let overlay = gtk::Overlay::builder().child(content).build();
    overlay.add_overlay(&fab);
    (overlay, fab)
}
