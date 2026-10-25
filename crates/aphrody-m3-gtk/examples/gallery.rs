// SPDX-License-Identifier: Apache-2.0
//! Material 3 GTK gallery: `cargo run --example gallery`.
//!
//! Set `APHRODY_M3_SYMBOLS_DIR` to a Material Symbols SVG directory to use M3 icons; the
//! gallery falls back to the Adwaita symbolic icons otherwise.

use aphrody_m3_gtk::adw::prelude::*;
use aphrody_m3_gtk::{
    ButtonVariant, CardVariant, M3Gtk, NavigationRail, Theme, Variant, adw, baseline_theme, gtk, icons,
    m3_button, m3_card, m3_chip, m3_fab, m3_icon_button,
};

const SEEDS: &[(&str, u32)] =
    &[("Baseline", 0xff67_50a4), ("Blue", 0xff1b_6ef3), ("Green", 0xff38_6a20), ("Rose", 0xffb3_2649)];

fn icon(display: &gtk::gdk::Display, symbol: &str, fallback: &str) -> String {
    if icons::has_symbol(display, symbol) { icons::icon_name(symbol) } else { fallback.to_owned() }
}

fn page(title: &str) -> (gtk::ScrolledWindow, gtk::Box) {
    let column = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(16)
        .margin_top(24)
        .margin_bottom(24)
        .margin_start(24)
        .margin_end(24)
        .build();
    let heading = gtk::Label::builder().label(title).xalign(0.0).css_classes(["m3-headline-small"]).build();
    column.append(&heading);
    let clamp = adw::Clamp::builder().maximum_size(840).child(&column).build();
    let scroller = gtk::ScrolledWindow::builder().child(&clamp).vexpand(true).build();
    (scroller, column)
}

fn row() -> gtk::FlowBox {
    gtk::FlowBox::builder().selection_mode(gtk::SelectionMode::None).column_spacing(8).row_spacing(8).build()
}

fn buttons_page(display: &gtk::gdk::Display) -> gtk::ScrolledWindow {
    let (scroller, column) = page("Buttons");
    let plain = row();
    let with_icon = row();
    let add = icon(display, "add", "list-add-symbolic");
    for variant in ButtonVariant::ALL {
        plain.append(&m3_button(variant, variant.label()));
        with_icon.append(&m3_icon_button(variant, &add, variant.label()));
    }
    let disabled = row();
    for variant in ButtonVariant::ALL {
        let button = m3_button(variant, variant.label());
        button.set_sensitive(false);
        disabled.append(&button);
    }
    column.append(&plain);
    column.append(&with_icon);
    column.append(&disabled);
    scroller
}

fn cards_page() -> gtk::ScrolledWindow {
    let (scroller, column) = page("Cards");
    for (variant, name) in
        [(CardVariant::Elevated, "Elevated"), (CardVariant::Filled, "Filled"), (CardVariant::Outlined, "Outlined")]
    {
        let body = gtk::Box::new(gtk::Orientation::Vertical, 4);
        body.append(&gtk::Label::builder().label(name).xalign(0.0).css_classes(["m3-title-medium"]).build());
        body.append(
            &gtk::Label::builder()
                .label("Medium corners, M3 surface container roles and elevation.")
                .xalign(0.0)
                .wrap(true)
                .css_classes(["m3-body-medium"])
                .build(),
        );
        column.append(&m3_card(variant, &body));
    }
    scroller
}

fn chips_page(m3: &M3Gtk) -> gtk::ScrolledWindow {
    let (scroller, column) = page("Theme");
    column.append(&gtk::Label::builder().label("Seed").xalign(0.0).css_classes(["m3-title-small"]).build());
    let seeds = row();
    let mut group: Option<gtk::ToggleButton> = None;
    for &(name, seed) in SEEDS {
        let chip = m3_chip(name);
        chip.set_active(seed == m3.theme().seed);
        if let Some(first) = &group {
            chip.set_group(Some(first));
        } else {
            group = Some(chip.clone());
        }
        let m3 = m3.clone();
        chip.connect_toggled(move |chip| {
            if chip.is_active() {
                m3.set_seed(seed);
            }
        });
        seeds.append(&chip);
    }
    column.append(&seeds);

    column.append(&gtk::Label::builder().label("Variant").xalign(0.0).css_classes(["m3-title-small"]).build());
    let variants = row();
    let mut group: Option<gtk::ToggleButton> = None;
    for variant in [Variant::TonalSpot, Variant::Vibrant, Variant::Expressive, Variant::Neutral, Variant::Fidelity] {
        let chip = m3_chip(variant.name());
        chip.set_active(variant == m3.theme().variant);
        if let Some(first) = &group {
            chip.set_group(Some(first));
        } else {
            group = Some(chip.clone());
        }
        let m3 = m3.clone();
        chip.connect_toggled(move |chip| {
            if chip.is_active() {
                m3.set_theme(Theme { variant, ..m3.theme() });
            }
        });
        variants.append(&chip);
    }
    column.append(&variants);

    let prefs = gtk::ListBox::builder().css_classes(["boxed-list"]).selection_mode(gtk::SelectionMode::None).build();
    let accent = adw::SwitchRow::builder().title("Follow system accent").build();
    let m3c = m3.clone();
    accent.connect_active_notify(move |row| m3c.follow_system_accent(row.is_active()));
    let dark = adw::SwitchRow::builder().title("Dark").active(m3.is_dark()).build();
    let style = m3.style_manager().clone();
    dark.connect_active_notify(move |row| {
        style.set_color_scheme(if row.is_active() { adw::ColorScheme::ForceDark } else { adw::ColorScheme::ForceLight });
    });
    let contrast = adw::SpinRow::with_range(-1.0, 1.0, 0.5);
    contrast.set_title("Contrast");
    contrast.set_value(m3.theme().contrast);
    let m3c = m3.clone();
    contrast.connect_value_notify(move |row| m3c.set_theme(Theme { contrast: row.value(), ..m3c.theme() }));
    prefs.append(&accent);
    prefs.append(&dark);
    prefs.append(&contrast);
    column.append(&prefs);
    scroller
}

fn type_page() -> gtk::ScrolledWindow {
    let (scroller, column) = page("Typography");
    for name in ["display-small", "headline-medium", "title-large", "title-medium", "body-large", "body-medium", "label-large", "label-small"] {
        let class = format!("m3-{name}");
        column.append(&gtk::Label::builder().label(name).xalign(0.0).css_classes([class.as_str()]).build());
    }
    scroller
}

fn activate(app: &adw::Application) {
    let display = gtk::gdk::Display::default().expect("display");
    let m3 = M3Gtk::install(&display, baseline_theme());
    if let Some(dir) = icons::default_symbols_dir() {
        if let Err(e) = icons::install_material_symbols(&display, &dir) {
            eprintln!("gallery: Material Symbols in {}: {e}", dir.display());
        }
    }

    let rail = NavigationRail::new("M3 Gallery");
    rail.add_destination("buttons", &icon(&display, "smart_button", "input-mouse-symbolic"), "Buttons", &buttons_page(&display));
    rail.add_destination("cards", &icon(&display, "cards", "view-grid-symbolic"), "Cards", &cards_page());
    rail.add_destination("theme", &icon(&display, "palette", "applications-graphics-symbolic"), "Theme", &chips_page(&m3));
    rail.add_destination("type", &icon(&display, "text_fields", "format-text-plain-symbolic"), "Type", &type_page());

    let toasts = adw::ToastOverlay::new();
    let (overlay, fab) = m3_fab(rail.widget(), &icon(&display, "edit", "document-edit-symbolic"), None);
    toasts.set_child(Some(&overlay));
    fab.connect_clicked(glib_clone_toasts(&toasts));

    let window = adw::ApplicationWindow::builder()
        .application(app)
        .title("Bun UI M3 for GTK")
        .default_width(960)
        .default_height(640)
        .content(&toasts)
        .build();
    window.add_breakpoint(rail.collapse_breakpoint());
    // Keep the provider installed for the lifetime of the window.
    window.connect_destroy(move |_| drop(m3.clone()));
    window.present();
}

fn glib_clone_toasts(toasts: &adw::ToastOverlay) -> impl Fn(&gtk::Button) + 'static {
    let toasts = toasts.downgrade();
    move |_| {
        if let Some(toasts) = toasts.upgrade() {
            toasts.add_toast(adw::Toast::builder().title("Snackbar from the FAB").timeout(3).build());
        }
    }
}

fn main() -> gtk::glib::ExitCode {
    let app = adw::Application::builder().application_id("com.aphrody.BunUi.M3Gallery").build();
    app.connect_activate(activate);
    app.run()
}
