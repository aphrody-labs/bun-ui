// SPDX-License-Identifier: Apache-2.0
//! Material 3 theme emitters for every Bun UI host.
//!
//! `aphrody-m3-tokens` resolves the scheme (HCT, dynamic color, contrast); this crate only maps
//! the resolved roles to each host's theme format, following `catalog/conversion.toml`. Hosts
//! that draw M3 themselves (egui, bevy_ui, wgpu) read the scheme in process through their
//! adapter crates instead of a file.

use aphrody_m3_tokens::role::Role;
use aphrody_m3_tokens::scheme::{DynamicScheme, Variant};
use std::fmt::Write;

/// Every role written by the CSS and DTCG emitters.
pub const ROLES: &[Role] = &[
    Role::Primary,
    Role::OnPrimary,
    Role::PrimaryContainer,
    Role::OnPrimaryContainer,
    Role::InversePrimary,
    Role::Secondary,
    Role::OnSecondary,
    Role::SecondaryContainer,
    Role::OnSecondaryContainer,
    Role::Tertiary,
    Role::OnTertiary,
    Role::TertiaryContainer,
    Role::OnTertiaryContainer,
    Role::Error,
    Role::OnError,
    Role::ErrorContainer,
    Role::OnErrorContainer,
    Role::Background,
    Role::OnBackground,
    Role::Surface,
    Role::OnSurface,
    Role::SurfaceVariant,
    Role::OnSurfaceVariant,
    Role::SurfaceDim,
    Role::SurfaceBright,
    Role::SurfaceContainerLowest,
    Role::SurfaceContainerLow,
    Role::SurfaceContainer,
    Role::SurfaceContainerHigh,
    Role::SurfaceContainerHighest,
    Role::SurfaceTint,
    Role::Outline,
    Role::OutlineVariant,
    Role::InverseSurface,
    Role::InverseOnSurface,
    Role::Shadow,
    Role::Scrim,
];

/// Theme request: seed, variant and contrast; both modes are resolved.
#[derive(Clone, Copy, Debug)]
pub struct Theme {
    /// Source color as `0xAARRGGBB`.
    pub seed: u32,
    /// Scheme variant.
    pub variant: Variant,
    /// Contrast level in `-1.0..=1.0` (0 standard, 0.5 medium, 1 high).
    pub contrast: f64,
}

impl Theme {
    /// Resolves the scheme for one mode.
    #[must_use]
    pub fn scheme(&self, dark: bool) -> DynamicScheme {
        DynamicScheme::from_argb(self.seed, self.variant, dark, self.contrast)
    }
}

/// Output formats.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Target {
    /// `--md-sys-color-*` custom properties with `prefers-color-scheme`.
    Css,
    /// GTK 4 / libadwaita 1.6+ stylesheet (`gtk.css`).
    Gtk,
    /// KDE Plasma color scheme (`.colors`).
    Kde,
    /// cosmic-config builder keys, one `key=value` RON line per field.
    Cosmic,
    /// QML singleton for Qt Quick (`M3Theme.qml`).
    Qml,
    /// WinUI 3 `ResourceDictionary` with Light and Dark theme dictionaries.
    Winui,
    /// Hyprland `source`-able config fragment.
    Hyprland,
    /// W3C Design Tokens (DTCG 2025.10) interchange JSON.
    Dtcg,
}

impl Target {
    /// Every target.
    pub const ALL: &'static [Target] = &[
        Target::Css,
        Target::Gtk,
        Target::Kde,
        Target::Cosmic,
        Target::Qml,
        Target::Winui,
        Target::Hyprland,
        Target::Dtcg,
    ];

    /// CLI name.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Target::Css => "css",
            Target::Gtk => "gtk",
            Target::Kde => "kde",
            Target::Cosmic => "cosmic",
            Target::Qml => "qml",
            Target::Winui => "winui",
            Target::Hyprland => "hyprland",
            Target::Dtcg => "dtcg",
        }
    }

    /// Conventional file name of the output.
    #[must_use]
    pub const fn file_name(self) -> &'static str {
        match self {
            Target::Css => "m3-colors.css",
            Target::Gtk => "gtk.css",
            Target::Kde => "BunUiM3.colors",
            Target::Cosmic => "cosmic-theme.ron",
            Target::Qml => "M3Theme.qml",
            Target::Winui => "M3Theme.xaml",
            Target::Hyprland => "m3-hyprland.conf",
            Target::Dtcg => "m3.tokens.json",
        }
    }

    /// Parses a CLI name.
    #[must_use]
    pub fn from_name(name: &str) -> Option<Self> {
        Self::ALL.iter().copied().find(|t| t.name() == name)
    }
}

/// Writes `theme` in the `target` format.
#[must_use]
pub fn emit(theme: &Theme, target: Target) -> String {
    let light = theme.scheme(false);
    let dark = theme.scheme(true);
    match target {
        Target::Css => css(&light, &dark),
        Target::Gtk => gtk(&light, &dark),
        Target::Kde => kde(&dark),
        Target::Cosmic => cosmic(&light, &dark),
        Target::Qml => qml(&light, &dark),
        Target::Winui => winui(&light, &dark),
        Target::Hyprland => hyprland(&dark),
        Target::Dtcg => dtcg(&light, &dark),
    }
}

fn rgb(argb: u32) -> (u8, u8, u8) {
    ((argb >> 16) as u8, (argb >> 8) as u8, argb as u8)
}

/// `#rrggbb`.
#[must_use]
pub fn hex(argb: u32) -> String {
    let (r, g, b) = rgb(argb);
    format!("#{r:02x}{g:02x}{b:02x}")
}

fn c(s: &DynamicScheme, role: Role) -> String {
    hex(s.argb(role))
}

fn css_block(out: &mut String, s: &DynamicScheme, indent: &str) {
    for &role in ROLES {
        let _ = writeln!(out, "{indent}--md-sys-color-{}: {};", role.name(), c(s, role));
    }
}

fn css(light: &DynamicScheme, dark: &DynamicScheme) -> String {
    let mut out = String::from("/* Generated by aphrody-m3-emit. Do not hand-edit. */\n:root {\n  color-scheme: light dark;\n");
    css_block(&mut out, light, "  ");
    out.push_str("}\n@media (prefers-color-scheme: dark) {\n  :root {\n");
    css_block(&mut out, dark, "    ");
    out.push_str("  }\n}\n");
    out
}

fn gtk_vars(out: &mut String, s: &DynamicScheme, indent: &str) {
    // libadwaita 1.6+ CSS variables; the legacy @define-color names alias them.
    let pairs: &[(&str, Role)] = &[
        ("accent-bg-color", Role::Primary),
        ("accent-fg-color", Role::OnPrimary),
        ("accent-color", Role::Primary),
        ("destructive-bg-color", Role::Error),
        ("destructive-fg-color", Role::OnError),
        ("destructive-color", Role::Error),
        ("error-bg-color", Role::Error),
        ("error-fg-color", Role::OnError),
        ("error-color", Role::Error),
        ("window-bg-color", Role::Surface),
        ("window-fg-color", Role::OnSurface),
        ("view-bg-color", Role::SurfaceContainerLowest),
        ("view-fg-color", Role::OnSurface),
        ("headerbar-bg-color", Role::SurfaceContainer),
        ("headerbar-fg-color", Role::OnSurface),
        ("headerbar-backdrop-color", Role::Surface),
        ("sidebar-bg-color", Role::SurfaceContainerLow),
        ("sidebar-fg-color", Role::OnSurface),
        ("sidebar-backdrop-color", Role::Surface),
        ("secondary-sidebar-bg-color", Role::SurfaceContainer),
        ("secondary-sidebar-fg-color", Role::OnSurface),
        ("card-bg-color", Role::SurfaceContainer),
        ("card-fg-color", Role::OnSurface),
        ("dialog-bg-color", Role::SurfaceContainerHigh),
        ("dialog-fg-color", Role::OnSurface),
        ("popover-bg-color", Role::SurfaceContainerHigh),
        ("popover-fg-color", Role::OnSurface),
        ("thumbnail-bg-color", Role::SurfaceContainerHighest),
        ("thumbnail-fg-color", Role::OnSurface),
        ("border-color", Role::OutlineVariant),
        ("m3-primary-container", Role::PrimaryContainer),
        ("m3-on-primary-container", Role::OnPrimaryContainer),
        ("m3-secondary-container", Role::SecondaryContainer),
        ("m3-on-secondary-container", Role::OnSecondaryContainer),
        ("m3-tertiary", Role::Tertiary),
        ("m3-tertiary-container", Role::TertiaryContainer),
        ("m3-outline", Role::Outline),
        ("m3-inverse-surface", Role::InverseSurface),
        ("m3-inverse-on-surface", Role::InverseOnSurface),
    ];
    for (name, role) in pairs {
        let _ = writeln!(out, "{indent}--{name}: {};", c(s, *role));
    }
}

fn gtk(light: &DynamicScheme, dark: &DynamicScheme) -> String {
    let mut out = String::from(
        "/* Generated by aphrody-m3-emit for GTK 4 / libadwaita 1.6+. Do not hand-edit. */\n:root {\n",
    );
    gtk_vars(&mut out, light, "  ");
    out.push_str("}\n@media (prefers-color-scheme: dark) {\n  :root {\n");
    gtk_vars(&mut out, dark, "    ");
    out.push_str("  }\n}\n");
    out.push_str(concat!(
        "button.m3-tonal { background-color: var(--m3-secondary-container); color: var(--m3-on-secondary-container); }\n",
        "button.m3-outlined { background: none; box-shadow: inset 0 0 0 1px var(--m3-outline); }\n",
        "button.m3-filled, button.suggested-action { border-radius: 9999px; }\n",
        ".toast { background-color: var(--m3-inverse-surface); color: var(--m3-inverse-on-surface); }\n",
    ));
    out
}

fn kde_rgb(argb: u32) -> String {
    let (r, g, b) = rgb(argb);
    format!("{r},{g},{b}")
}

fn kde(s: &DynamicScheme) -> String {
    let k = |role| kde_rgb(s.argb(role));
    let mut out = String::from("# Generated by aphrody-m3-emit. Do not hand-edit.\n");
    let groups: &[(&str, Role, Role)] = &[
        ("Window", Role::Surface, Role::OnSurface),
        ("View", Role::SurfaceContainerLowest, Role::OnSurface),
        ("Button", Role::SurfaceContainer, Role::OnSurface),
        ("Header", Role::SurfaceContainerHighest, Role::OnSurface),
        ("Tooltip", Role::InverseSurface, Role::InverseOnSurface),
        ("Complementary", Role::SurfaceContainerHigh, Role::OnSurface),
        ("Selection", Role::Primary, Role::OnPrimary),
    ];
    for (group, bg, fg) in groups {
        let _ = write!(
            out,
            "\n[Colors:{group}]\nBackgroundNormal={}\nBackgroundAlternate={}\nForegroundNormal={}\nForegroundInactive={}\nForegroundActive={}\nForegroundLink={}\nForegroundVisited={}\nForegroundNegative={}\nForegroundNeutral={}\nForegroundPositive={}\nDecorationFocus={}\nDecorationHover={}\n",
            k(*bg),
            k(Role::SurfaceContainerLow),
            k(*fg),
            k(Role::OnSurfaceVariant),
            k(Role::Primary),
            k(Role::Primary),
            k(Role::Tertiary),
            k(Role::Error),
            k(Role::Tertiary),
            k(Role::Secondary),
            k(Role::Primary),
            k(Role::Outline),
        );
    }
    let _ = write!(
        out,
        "\n[General]\nColorScheme=BunUiM3\nName=Bun UI M3\nAccentColor={}\n\n[KDE]\ncontrast=4\n",
        k(Role::Primary)
    );
    out
}

fn ron_srgb(argb: u32) -> String {
    let (r, g, b) = rgb(argb);
    format!(
        "(red: {:.6}, green: {:.6}, blue: {:.6})",
        f32::from(r) / 255.0,
        f32::from(g) / 255.0,
        f32::from(b) / 255.0
    )
}

fn ron_srgba(argb: u32) -> String {
    let (r, g, b) = rgb(argb);
    format!(
        "(red: {:.6}, green: {:.6}, blue: {:.6}, alpha: 1.0)",
        f32::from(r) / 255.0,
        f32::from(g) / 255.0,
        f32::from(b) / 255.0
    )
}

fn cosmic(light: &DynamicScheme, dark: &DynamicScheme) -> String {
    // cosmic-config stores each builder field as its own file under
    // ~/.config/cosmic/com.system76.CosmicTheme.{Light,Dark}.Builder/v2/<field> (schema version 2).
    let mut out = String::from("// Generated by aphrody-m3-emit. One `<mode>/<field> = <RON>` per cosmic-config key.\n");
    for (mode, s) in [("Light", light), ("Dark", dark)] {
        let fields: &[(&str, String)] = &[
            ("accent", format!("Some({})", ron_srgb(s.argb(Role::Primary)))),
            ("bg_color", format!("Some({})", ron_srgba(s.argb(Role::Surface)))),
            ("primary_container_bg", format!("Some({})", ron_srgba(s.argb(Role::SurfaceContainer)))),
            ("secondary_container_bg", format!("Some({})", ron_srgba(s.argb(Role::SurfaceContainerHigh)))),
            ("text_tint", format!("Some({})", ron_srgb(s.argb(Role::OnSurface)))),
            ("neutral_tint", format!("Some({})", ron_srgb(s.argb(Role::SurfaceTint)))),
            ("destructive", format!("Some({})", ron_srgb(s.argb(Role::Error)))),
            ("success", format!("Some({})", ron_srgb(s.argb(Role::Secondary)))),
            ("warning", format!("Some({})", ron_srgb(s.argb(Role::Tertiary)))),
        ];
        for (field, value) in fields {
            let _ = writeln!(out, "com.system76.CosmicTheme.{mode}.Builder/v2/{field} = {value}");
        }
    }
    out
}

fn qml(light: &DynamicScheme, dark: &DynamicScheme) -> String {
    let mut out = String::from(
        "// Generated by aphrody-m3-emit. Do not hand-edit.\npragma Singleton\nimport QtQuick\n\nQtObject {\n    property bool dark: Application.styleHints.colorScheme === Qt.ColorScheme.Dark\n",
    );
    for &role in ROLES {
        let _ = writeln!(
            out,
            "    readonly property color {}: dark ? \"{}\" : \"{}\"",
            role.camel_name(),
            c(dark, role),
            c(light, role)
        );
    }
    out.push_str("}\n");
    out
}

fn winui(light: &DynamicScheme, dark: &DynamicScheme) -> String {
    let pairs: &[(&str, Role)] = &[
        ("SystemAccentColor", Role::Primary),
        ("M3OnPrimary", Role::OnPrimary),
        ("M3PrimaryContainer", Role::PrimaryContainer),
        ("M3SecondaryContainer", Role::SecondaryContainer),
        ("M3Surface", Role::Surface),
        ("M3OnSurface", Role::OnSurface),
        ("M3OnSurfaceVariant", Role::OnSurfaceVariant),
        ("M3SurfaceContainer", Role::SurfaceContainer),
        ("M3SurfaceContainerHigh", Role::SurfaceContainerHigh),
        ("M3Outline", Role::Outline),
        ("M3OutlineVariant", Role::OutlineVariant),
        ("M3Error", Role::Error),
    ];
    let mut out = String::from(
        "<!-- Generated by aphrody-m3-emit. Do not hand-edit. -->\n<ResourceDictionary xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\" xmlns:x=\"http://schemas.microsoft.com/winfx/2006/xaml\">\n  <ResourceDictionary.ThemeDictionaries>\n",
    );
    for (key, s) in [("Light", light), ("Dark", dark)] {
        let _ = writeln!(out, "    <ResourceDictionary x:Key=\"{key}\">");
        for (name, role) in pairs {
            let (r, g, b) = rgb(s.argb(*role));
            let _ = writeln!(out, "      <Color x:Key=\"{name}\">#FF{r:02X}{g:02X}{b:02X}</Color>");
        }
        out.push_str(concat!(
            "      <SolidColorBrush x:Key=\"AccentFillColorDefaultBrush\" Color=\"{StaticResource SystemAccentColor}\" />\n",
            "      <SolidColorBrush x:Key=\"TextFillColorPrimaryBrush\" Color=\"{StaticResource M3OnSurface}\" />\n",
            "      <SolidColorBrush x:Key=\"TextFillColorSecondaryBrush\" Color=\"{StaticResource M3OnSurfaceVariant}\" />\n",
            "      <SolidColorBrush x:Key=\"SolidBackgroundFillColorBaseBrush\" Color=\"{StaticResource M3Surface}\" />\n",
            "      <SolidColorBrush x:Key=\"CardBackgroundFillColorDefaultBrush\" Color=\"{StaticResource M3SurfaceContainer}\" />\n",
            "      <SolidColorBrush x:Key=\"ControlStrokeColorDefaultBrush\" Color=\"{StaticResource M3OutlineVariant}\" />\n",
            "      <SolidColorBrush x:Key=\"SystemFillColorCriticalBrush\" Color=\"{StaticResource M3Error}\" />\n",
            "    </ResourceDictionary>\n",
        ));
    }
    out.push_str("  </ResourceDictionary.ThemeDictionaries>\n</ResourceDictionary>\n");
    out
}

fn hypr_rgb(argb: u32) -> String {
    let (r, g, b) = rgb(argb);
    format!("rgb({r:02x}{g:02x}{b:02x})")
}

fn hyprland(s: &DynamicScheme) -> String {
    format!(
        "# Generated by aphrody-m3-emit. `source = m3-hyprland.conf` from hyprland.conf.\n\
         $m3_primary = {p}\n$m3_on_surface = {on}\n$m3_surface = {sf}\n$m3_outline = {ol}\n\
         general {{\n    col.active_border = {p} {t} 45deg\n    col.inactive_border = {ol}\n}}\n\
         decoration {{\n    rounding = 12\n    shadow {{\n        color = rgba({sh}55)\n    }}\n}}\n",
        p = hypr_rgb(s.argb(Role::Primary)),
        t = hypr_rgb(s.argb(Role::Tertiary)),
        on = hypr_rgb(s.argb(Role::OnSurface)),
        sf = hypr_rgb(s.argb(Role::Surface)),
        ol = hypr_rgb(s.argb(Role::OutlineVariant)),
        sh = &hex(s.argb(Role::Shadow))[1..],
    )
}

fn dtcg(light: &DynamicScheme, dark: &DynamicScheme) -> String {
    let mut out = String::from("{\n  \"$description\": \"Generated by aphrody-m3-emit (DTCG 2025.10)\",\n  \"color\": {\n");
    for (mi, (mode, s)) in [("light", light), ("dark", dark)].into_iter().enumerate() {
        let _ = writeln!(out, "    \"{mode}\": {{");
        for (i, &role) in ROLES.iter().enumerate() {
            let (r, g, b) = rgb(s.argb(role));
            let comma = if i + 1 == ROLES.len() { "" } else { "," };
            let _ = writeln!(
                out,
                "      \"{}\": {{ \"$type\": \"color\", \"$value\": {{ \"colorSpace\": \"srgb\", \"components\": [{:.4}, {:.4}, {:.4}], \"hex\": \"{}\" }} }}{comma}",
                role.name(),
                f32::from(r) / 255.0,
                f32::from(g) / 255.0,
                f32::from(b) / 255.0,
                hex(s.argb(role)),
            );
        }
        let _ = writeln!(out, "    }}{}", if mi == 0 { "," } else { "" });
    }
    out.push_str("  }\n}\n");
    out
}
