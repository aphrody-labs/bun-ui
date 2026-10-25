// SPDX-License-Identifier: Apache-2.0
//! One lifecycle API for every Aphrody native app.
//!
//! The crate owns the concerns every desktop app repeats: application identity
//! and about box ([`AppInfo`]), window state persistence ([`window_state`]),
//! single instance with argv forwarding ([`single_instance`]), deep link
//! registration ([`deep_link`]), a declarative menu model ([`menu`]) rendered
//! natively with muda or by a toolkit backend, the tray, file dialogs,
//! notifications, clipboard, light/dark and accent detection ([`theme`]) and a
//! signed update feed client ([`updater`]).
//!
//! Toolkit backends live in [`backends`] behind the `eframe`, `winit`, `bevy`
//! and `tauri` features. Platform services are gated by the `menu`, `tray`,
//! `dialogs`, `notifications`, `clipboard` and `updater` features.

pub mod app;
pub mod backends;
pub mod deep_link;
pub mod error;
pub mod menu;
pub mod single_instance;
pub mod theme;
pub mod window_state;

#[cfg(feature = "clipboard")]
pub mod clipboard;
#[cfg(feature = "dialogs")]
pub mod dialogs;
#[cfg(feature = "menu")]
pub mod native_menu;
#[cfg(feature = "notifications")]
pub mod notifications;
#[cfg(feature = "tray")]
pub mod tray;
#[cfg(feature = "updater")]
pub mod updater;

pub use app::AppInfo;
pub use error::{Error, Result};
pub use menu::{Menu, MenuEvent, MenuItem, Role};
pub use single_instance::{Instance, PrimaryInstance};
pub use theme::{ColorScheme, Rgb, SystemTheme};
pub use window_state::{WindowState, WindowStateStore};
