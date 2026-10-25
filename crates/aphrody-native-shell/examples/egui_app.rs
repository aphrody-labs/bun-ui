// SPDX-License-Identifier: Apache-2.0
//! eframe app wired to the Aphrody native shell:
//! single instance, persisted window state, model-driven menu bar, about box,
//! theme detection, deep link parsing, dialogs, clipboard and notifications.
//!
//! `cargo run --example egui_app --features eframe`

use aphrody_native_shell::backends::eframe as shell_egui;
use aphrody_native_shell::menu::{Menu, MenuItem};
use aphrody_native_shell::single_instance::{self, Instance};
use aphrody_native_shell::{AppInfo, WindowState, WindowStateStore, app_info, deep_link, theme};
use eframe::egui;

const WINDOW_ID: &str = "main";
const SCHEME: &str = "aphrody-demo";

struct ShellApp {
    info: AppInfo,
    instance: single_instance::PrimaryInstance,
    tracker: shell_egui::WindowStateTracker,
    menu: Menu,
    about_open: bool,
    log: Vec<String>,
}

fn build_menu(app_name: &str) -> Menu {
    let mut menu = Menu::standard(app_name);
    let file = MenuItem::submenu(
        "File",
        vec![
            MenuItem::action("open", "Open…").with_accelerator("CmdOrCtrl+O"),
            MenuItem::action("notify", "Send notification"),
            MenuItem::action("copy-log", "Copy log").with_accelerator("CmdOrCtrl+Shift+C"),
            MenuItem::Separator,
            MenuItem::role(aphrody_native_shell::Role::Quit),
        ],
    );
    let view = MenuItem::submenu(
        "View",
        vec![
            MenuItem::check("show-log", "Show log", true),
            MenuItem::Separator,
            MenuItem::radio("density-comfortable", "Comfortable", "density", true),
            MenuItem::radio("density-compact", "Compact", "density", false),
        ],
    );
    // Replace the standard File menu and insert View after Edit.
    if let Some(pos) = menu.items.iter().position(|i| matches!(i, MenuItem::Submenu { label, .. } if label == "File")) {
        menu.items[pos] = file;
        menu.items.insert(pos + 2, view);
    }
    menu
}

impl ShellApp {
    fn handle_args(&mut self, args: &[String]) {
        if let Some(url) = deep_link::find_url(args, SCHEME) {
            self.log.push(format!("deep link: {url}"));
        } else {
            self.log.push(format!("forwarded argv: {args:?}"));
        }
    }

    fn on_menu(&mut self, event: aphrody_native_shell::MenuEvent) {
        match event.id.as_str() {
            "role:about" => self.about_open = true,
            "open" => {
                #[cfg(feature = "dialogs")]
                if let Some(path) = aphrody_native_shell::dialogs::FileDialog::new().title("Open").open_file() {
                    self.log.push(format!("opened {}", path.display()));
                }
            }
            "notify" => {
                #[cfg(feature = "notifications")]
                if let Err(error) = aphrody_native_shell::notifications::notify_text(&self.info, &self.info.name, "Hello from the shell") {
                    self.log.push(format!("notification failed: {error}"));
                }
            }
            "copy-log" => {
                #[cfg(feature = "clipboard")]
                match aphrody_native_shell::clipboard::Clipboard::new().and_then(|mut c| c.set_text(self.log.join("\n"))) {
                    Ok(()) => self.log.push("log copied".into()),
                    Err(error) => self.log.push(format!("clipboard failed: {error}")),
                }
            }
            _ => self.log.push(format!("menu: {} checked={:?}", event.id, event.checked)),
        }
    }
}

impl eframe::App for ShellApp {
    fn logic(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        for args in self.instance.drain() {
            self.handle_args(&args);
        }
        self.tracker.update(ctx);
    }

    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let mut events = Vec::new();
        egui::Panel::top("menu").show(ui, |ui| {
            events = shell_egui::menu_bar(ui, &mut self.menu);
        });
        for event in events {
            self.on_menu(event);
        }
        let show_log = self.menu.is_checked("show-log").unwrap_or(true);
        egui::CentralPanel::default().show(ui, |ui| {
            ui.heading(format!("{} {}", self.info.name, self.info.version));
            let detected = theme::detect();
            ui.label(format!(
                "System scheme: {:?}, accent: {}",
                detected.scheme,
                detected.accent.map(|a| a.hex()).unwrap_or_else(|| "none".into())
            ));
            if show_log {
                ui.separator();
                egui::ScrollArea::vertical().show(ui, |ui| {
                    for line in &self.log {
                        ui.monospace(line);
                    }
                });
            }
        });
        shell_egui::about_window(ui.ctx(), &self.info, &mut self.about_open);
    }

    fn on_exit(&mut self, _gl: Option<&eframe::glow::Context>) {
        self.tracker.flush();
    }
}

fn main() -> eframe::Result {
    let info = app_info!("com.aphrody.shell-demo", "Aphrody Shell Demo").with_copyright("© Aphrody");

    let instance = match single_instance::acquire(&info) {
        Ok(Instance::Primary(instance)) => instance,
        Ok(Instance::Forwarded) => return Ok(()),
        Err(error) => {
            eprintln!("single instance unavailable: {error}");
            return Ok(());
        }
    };

    let store = WindowStateStore::open(&info).unwrap_or_else(|_| WindowStateStore::at(std::env::temp_dir().join("window-state.json")));
    let tracker = shell_egui::WindowStateTracker::new(WINDOW_ID, store);
    let state = tracker.initial(WindowState::with_size(960.0, 640.0));

    let options = eframe::NativeOptions {
        viewport: shell_egui::viewport_with_state(egui::ViewportBuilder::default().with_title(&info.name).with_app_id(&info.id), &state),
        ..Default::default()
    };

    let name = info.name.clone();
    eframe::run_native(
        &name,
        options,
        Box::new(move |cc| {
            shell_egui::apply_theme(&cc.egui_ctx, &theme::detect());
            let ctx = cc.egui_ctx.clone();
            instance.set_waker(move || ctx.request_repaint());
            let menu = build_menu(&info.name);
            let mut app = ShellApp { info, instance, tracker, menu, about_open: false, log: Vec::new() };
            let args: Vec<String> = std::env::args().collect();
            app.handle_args(&args);
            Ok(Box::new(app))
        }),
    )
}
