// SPDX-License-Identifier: Apache-2.0
//! M3 gallery for egui: `cargo run --example gallery`.

use aphrody_m3_egui::widgets::{Button, Chip, Fab, FabSize, SnackbarEvent, Snackbars, Switch};
use aphrody_m3_egui::{Mode, ThemeController, Variant, type_scale};
use eframe::egui;

struct Gallery {
    theme: ThemeController,
    snackbars: Snackbars,
    switch_on: bool,
    wifi: bool,
    filter_a: bool,
    filter_b: bool,
    text: String,
    slider: f32,
    check: bool,
}

impl Gallery {
    fn new() -> Self {
        Self {
            theme: ThemeController::default(),
            snackbars: Snackbars::new(),
            switch_on: true,
            wifi: false,
            filter_a: true,
            filter_b: false,
            text: String::from("Material 3"),
            slider: 0.4,
            check: true,
        }
    }
}

const SEEDS: [(&str, u32); 5] = [
    ("Baseline", 0xFF67_50A4),
    ("Blue", 0xFF00_61A4),
    ("Green", 0xFF38_6A20),
    ("Red", 0xFFB3_261E),
    ("Amber", 0xFF7D_5700),
];

impl eframe::App for Gallery {
    fn logic(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.theme.update(ctx);
    }

    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        egui::Panel::top("m3-top").show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.label(egui::RichText::new("Bun UI M3 gallery").text_style(type_scale::style("title-large")));
                ui.separator();
                let mut mode = self.theme.mode();
                ui.selectable_value(&mut mode, Mode::System, "System");
                ui.selectable_value(&mut mode, Mode::Light, "Light");
                ui.selectable_value(&mut mode, Mode::Dark, "Dark");
                self.theme.set_mode(mode);
                ui.separator();
                for (name, seed) in SEEDS {
                    if ui.selectable_label(self.theme.seed() == seed, name).clicked() {
                        self.theme.set_seed(seed);
                    }
                }
                ui.separator();
                let mut variant = self.theme.variant();
                egui::ComboBox::from_id_salt("variant")
                    .selected_text(variant.name())
                    .show_ui(ui, |ui| {
                        for v in Variant::ALL {
                            ui.selectable_value(&mut variant, v, v.name());
                        }
                    });
                self.theme.set_variant(variant);
                let mut contrast = self.theme.contrast() as f32;
                ui.add(egui::Slider::new(&mut contrast, -1.0..=1.0).text("contrast"));
                self.theme.set_contrast(f64::from(contrast));
            });
        });

        egui::CentralPanel::default().show(ui, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| {
                ui.label(egui::RichText::new("Buttons").text_style(type_scale::style("headline-small")));
                ui.horizontal(|ui| {
                    if ui.add(Button::filled("Filled")).clicked() {
                        self.snackbars.show("Filled button clicked");
                    }
                    ui.add(Button::tonal("Tonal").icon("+"));
                    ui.add(Button::outlined("Outlined"));
                    ui.add(Button::text("Text"));
                    ui.add(Button::elevated("Elevated"));
                    ui.add_enabled(false, Button::filled("Disabled"));
                });
                ui.add_space(16.0);
                ui.label(egui::RichText::new("Selection").text_style(type_scale::style("headline-small")));
                ui.horizontal(|ui| {
                    ui.add(Switch::new(&mut self.switch_on).label("Notifications"));
                    ui.add(Switch::new(&mut self.wifi).label("Wi-Fi"));
                    ui.checkbox(&mut self.check, "Checkbox");
                });
                ui.horizontal(|ui| {
                    ui.add(Chip::filter("Starred", &mut self.filter_a));
                    ui.add(Chip::filter("Unread", &mut self.filter_b));
                    ui.add(Chip::assist("Add to calendar"));
                    ui.add(Chip::suggestion("Suggestion"));
                    ui.add(Chip::input("Input chip"));
                });
                ui.add_space(16.0);
                ui.label(egui::RichText::new("Inputs").text_style(type_scale::style("headline-small")));
                ui.text_edit_singleline(&mut self.text);
                ui.add(egui::Slider::new(&mut self.slider, 0.0..=1.0));
                ui.hyperlink_to("material.io", "https://m3.material.io");
                ui.add_space(16.0);
                ui.label(egui::RichText::new("FAB").text_style(type_scale::style("headline-small")));
                ui.horizontal(|ui| {
                    ui.add(Fab::new("+", "Create").size(FabSize::Small));
                    ui.add(Fab::new("+", "Create"));
                    ui.add(Fab::new("+", "Create").size(FabSize::Large));
                    if ui.add(Fab::new("+", "Compose").extended("Compose")).clicked() {
                        self.snackbars.show_with_action("Draft saved", "Undo");
                    }
                });
                ui.add_space(16.0);
                ui.label(egui::RichText::new("Typescale").text_style(type_scale::style("headline-small")));
                for (name, _) in type_scale::ROLES {
                    ui.label(egui::RichText::new(name).text_style(type_scale::style(name)));
                }
            });
        });

        if let Some(SnackbarEvent::Action(_)) = self.snackbars.ui(ui.ctx()) {
            self.snackbars.show("Undone");
        }
    }
}

fn main() -> eframe::Result {
    eframe::run_native(
        "Bun UI M3 gallery (egui)",
        eframe::NativeOptions::default(),
        Box::new(|_cc| Ok(Box::new(Gallery::new()))),
    )
}
