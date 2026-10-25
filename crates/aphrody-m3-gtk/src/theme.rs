// SPDX-License-Identifier: Apache-2.0
//! Stylesheet generation and the live `GtkCssProvider`.

use std::cell::{Cell, RefCell};
use std::fmt::Write;
use std::rc::{Rc, Weak};

use adw::prelude::*;
use aphrody_m3_emit::{ROLES, Target, Theme, emit, hex};
use aphrody_m3_tokens::{elevation, shape, state, typography};
use gtk::{gdk, glib};

/// Variables of one mode from the emitted GTK stylesheet (`--name: value;` lines).
fn mode_vars(emitted: &str, dark: bool) -> impl Iterator<Item = &str> {
    let mut in_dark = false;
    emitted.lines().filter_map(move |line| {
        if line.contains("@media") {
            in_dark = true;
        }
        let line = line.trim();
        (line.starts_with("--") && in_dark == dark).then_some(line)
    })
}

/// Full stylesheet for one mode.
///
/// It is the [`Target::Gtk`] output, followed by a `:root` block that pins the variables of
/// `dark` (so the result does not depend on `prefers-color-scheme` support), every M3 role
/// as `--m3-<role>`, and the M3 component rules from [`components_css`].
#[must_use]
pub fn stylesheet(theme: &Theme, dark: bool) -> String {
    let emitted = emit(theme, Target::Gtk);
    let scheme = theme.scheme(dark);
    let mut out = emitted.clone();
    let _ = writeln!(out, "/* aphrody-m3-gtk: {} mode */\n:root {{", if dark { "dark" } else { "light" });
    for line in mode_vars(&emitted, dark) {
        let _ = writeln!(out, "  {line}");
    }
    for &role in ROLES {
        let _ = writeln!(out, "  --m3-{}: {};", role.name(), hex(scheme.argb(role)));
    }
    out.push_str("}\n");
    out.push_str(&components_css());
    out
}

fn radius(r: shape::CornerRadius) -> String {
    format!("{}px", r.dp)
}

/// Mode-independent M3 rules: shapes, state layers, elevation and the type scale.
#[must_use]
pub fn components_css() -> String {
    let full = radius(shape::FULL);
    let small = radius(shape::SMALL);
    let medium = radius(shape::MEDIUM);
    let large = radius(shape::LARGE);
    let extra_large = radius(shape::EXTRA_LARGE);
    let hover = state::HOVER.opacity;
    let focus = state::FOCUS.opacity;
    let pressed = state::PRESSED.opacity;
    let disabled = state::DISABLED_CONTENT.opacity;
    let e1 = elevation::shadow(1);
    let e2 = elevation::shadow(2);
    let e3 = elevation::shadow(3);
    let e4 = elevation::shadow(4);
    let label = typography::LABEL_LARGE;

    let mut out = String::from("/* aphrody-m3-gtk components */\n");
    let _ = write!(
        out,
        "\
button.pill, button.suggested-action, button.m3-tonal, button.m3-outlined, button.m3-elevated {{
  border-radius: {full}; min-height: 40px; padding: 0 24px;
  font-size: {ls}px; font-weight: {lw}; letter-spacing: {lt}px;
}}
button.suggested-action {{ background-color: var(--m3-primary); color: var(--m3-on-primary); }}
button.m3-tonal {{ background-color: var(--m3-secondary-container); color: var(--m3-on-secondary-container); }}
button.m3-outlined {{ background: none; color: var(--m3-primary); box-shadow: inset 0 0 0 1px var(--m3-outline); }}
button.m3-elevated {{ background-color: var(--m3-surface-container-low); color: var(--m3-primary); box-shadow: {e1}; }}
button.m3-elevated:hover {{ box-shadow: {e2}; }}
button.flat.pill {{ color: var(--m3-primary); padding: 0 12px; }}
button.pill:hover, button.suggested-action:hover, button.m3-tonal:hover, button.m3-outlined:hover,
button.m3-elevated:hover, button.m3-fab:hover, togglebutton.m3-chip:hover {{
  background-image: image(alpha(currentColor, {hover}));
}}
button.pill:focus-visible, button.m3-fab:focus-visible, togglebutton.m3-chip:focus-visible {{
  background-image: image(alpha(currentColor, {focus}));
  outline: 3px solid var(--m3-secondary); outline-offset: 2px;
}}
button.pill:active, button.suggested-action:active, button.m3-tonal:active, button.m3-outlined:active,
button.m3-elevated:active, button.m3-fab:active, togglebutton.m3-chip:active {{
  background-image: image(alpha(currentColor, {pressed}));
}}
button.pill:disabled, button.suggested-action:disabled, button.m3-tonal:disabled,
button.m3-elevated:disabled, togglebutton.m3-chip:disabled {{
  background-color: alpha(var(--m3-on-surface), 0.12); color: alpha(var(--m3-on-surface), {disabled}); box-shadow: none;
}}
button.m3-outlined:disabled {{ color: alpha(var(--m3-on-surface), {disabled}); box-shadow: inset 0 0 0 1px alpha(var(--m3-on-surface), 0.12); }}

.m3-card {{ border-radius: {medium}; padding: 16px; color: var(--m3-on-surface); }}
.m3-card.m3-card-elevated {{ background-color: var(--m3-surface-container-low); box-shadow: {e1}; }}
.m3-card.m3-card-filled {{ background-color: var(--m3-surface-container-highest); box-shadow: none; }}
.m3-card.m3-card-outlined {{ background-color: var(--m3-surface); box-shadow: inset 0 0 0 1px var(--m3-outline-variant); }}

togglebutton.m3-chip {{
  border-radius: {small}; min-height: 32px; padding: 0 16px; background: none;
  color: var(--m3-on-surface-variant); box-shadow: inset 0 0 0 1px var(--m3-outline-variant);
  font-size: {ls}px; font-weight: {lw};
}}
togglebutton.m3-chip:checked {{ background-color: var(--m3-secondary-container); color: var(--m3-on-secondary-container); box-shadow: none; }}

button.m3-fab {{
  border-radius: {large}; min-width: 56px; min-height: 56px; padding: 0;
  background-color: var(--m3-primary-container); color: var(--m3-on-primary-container); box-shadow: {e3};
}}
button.m3-fab:hover {{ box-shadow: {e4}; }}
button.m3-fab.m3-fab-extended {{ padding: 0 20px; }}

.m3-rail {{ background: none; padding: 12px 0; }}
.m3-rail row {{ border-radius: {large}; margin: 2px 8px; padding: 4px 0 8px; color: var(--m3-on-surface-variant); }}
.m3-rail row image {{ border-radius: {full}; min-width: 56px; min-height: 32px; -gtk-icon-size: 24px; }}
.m3-rail row:selected {{ background: none; color: var(--m3-on-surface); }}
.m3-rail row:selected image {{ background-color: var(--m3-secondary-container); color: var(--m3-on-secondary-container); }}
.m3-rail row label {{ font-size: 12px; font-weight: 500; }}

dialog.m3-dialog, .m3-dialog > .dialog-contents {{ border-radius: {extra_large}; }}
popover.menu > contents {{ border-radius: {small}; background-color: var(--m3-surface-container); box-shadow: {e2}; }}
",
        ls = label.size_dp,
        lw = label.weight,
        lt = label.letter_spacing_dp,
    );
    for level in 0..elevation::LEVEL_COUNT {
        let _ = writeln!(out, ".m3-elevation-{level} {{ box-shadow: {}; }}", elevation::shadow(level));
    }
    for (style, name) in typography::ALL.iter().zip(typography::NAMES) {
        let _ = writeln!(
            out,
            ".m3-{name} {{ font-family: \"{}\", \"Roboto Flex\", \"Roboto\", sans-serif; font-size: {}px; font-weight: {}; line-height: {:.4}; letter-spacing: {}px; }}",
            style.font,
            style.size_dp,
            style.weight,
            style.line_height_dp / style.size_dp,
            style.letter_spacing_dp,
        );
    }
    out
}

struct Inner {
    display: gdk::Display,
    provider: gtk::CssProvider,
    style: adw::StyleManager,
    theme: Cell<Theme>,
    follow_accent: Cell<bool>,
    handlers: RefCell<Vec<glib::SignalHandlerId>>,
}

impl Inner {
    fn reload(&self) {
        let css = stylesheet(&self.theme.get(), self.style.is_dark());
        self.provider.load_from_string(&css);
    }

    fn sync_accent(&self) {
        if !self.follow_accent.get() || !self.style.is_system_supports_accent_colors() {
            return;
        }
        let mut theme = self.theme.get();
        theme.seed = rgba_to_argb(&self.style.accent_color_rgba());
        self.theme.set(theme);
        self.reload();
    }
}

impl Drop for Inner {
    fn drop(&mut self) {
        for id in self.handlers.take() {
            self.style.disconnect(id);
        }
        gtk::style_context_remove_provider_for_display(&self.display, &self.provider);
    }
}

fn rgba_to_argb(c: &gdk::RGBA) -> u32 {
    let ch = |v: f32| u32::from((v.clamp(0.0, 1.0) * 255.0).round() as u8);
    0xff00_0000 | ch(c.red()) << 16 | ch(c.green()) << 8 | ch(c.blue())
}

/// The installed M3 theme of one display. The provider stays installed while a clone lives.
#[derive(Clone)]
pub struct M3Gtk {
    inner: Rc<Inner>,
}

impl M3Gtk {
    /// Installs `theme` on `display` at `GTK_STYLE_PROVIDER_PRIORITY_APPLICATION` and
    /// regenerates it on every `AdwStyleManager` `notify::dark`.
    #[must_use]
    pub fn install(display: &gdk::Display, theme: Theme) -> Self {
        let provider = gtk::CssProvider::new();
        gtk::style_context_add_provider_for_display(
            display,
            &provider,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
        let inner = Rc::new(Inner {
            display: display.clone(),
            provider,
            style: adw::StyleManager::for_display(display),
            theme: Cell::new(theme),
            follow_accent: Cell::new(false),
            handlers: RefCell::new(Vec::new()),
        });
        let weak: Weak<Inner> = Rc::downgrade(&inner);
        let dark = inner.style.connect_dark_notify(move |_| {
            if let Some(inner) = weak.upgrade() {
                inner.reload();
            }
        });
        let weak: Weak<Inner> = Rc::downgrade(&inner);
        let accent = inner.style.connect_accent_color_rgba_notify(move |_| {
            if let Some(inner) = weak.upgrade() {
                inner.sync_accent();
            }
        });
        inner.handlers.borrow_mut().extend([dark, accent]);
        inner.reload();
        Self { inner }
    }

    /// Installs `theme` on the default display.
    ///
    /// # Panics
    ///
    /// Panics when GTK has no default display (call after `gtk::init` or in `activate`).
    #[must_use]
    pub fn install_default(theme: Theme) -> Self {
        let display = gdk::Display::default().expect("aphrody-m3-gtk: no default GdkDisplay");
        Self::install(&display, theme)
    }

    /// Current theme request.
    #[must_use]
    pub fn theme(&self) -> Theme {
        self.inner.theme.get()
    }

    /// Replaces the theme and regenerates the stylesheet.
    pub fn set_theme(&self, theme: Theme) {
        self.inner.theme.set(theme);
        self.inner.reload();
    }

    /// Changes only the seed (`0xAARRGGBB`).
    pub fn set_seed(&self, seed: u32) {
        let mut theme = self.theme();
        theme.seed = seed;
        self.set_theme(theme);
    }

    /// Uses the system accent (`AdwStyleManager:accent-color-rgba`) as the seed while
    /// `follow` is true and the platform reports accent colors.
    pub fn follow_system_accent(&self, follow: bool) {
        self.inner.follow_accent.set(follow);
        self.inner.sync_accent();
    }

    /// Whether the style manager currently resolves to dark.
    #[must_use]
    pub fn is_dark(&self) -> bool {
        self.inner.style.is_dark()
    }

    /// Stylesheet currently loaded in the provider.
    #[must_use]
    pub fn css(&self) -> String {
        stylesheet(&self.theme(), self.is_dark())
    }

    /// The underlying provider.
    #[must_use]
    pub fn provider(&self) -> &gtk::CssProvider {
        &self.inner.provider
    }

    /// The style manager of the display.
    #[must_use]
    pub fn style_manager(&self) -> &adw::StyleManager {
        &self.inner.style
    }
}
