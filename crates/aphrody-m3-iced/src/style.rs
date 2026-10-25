// SPDX-License-Identifier: Apache-2.0
//! M3 style functions for the iced built-in widgets. Each reads the M3 roles from a theme made
//! by [`crate::theme`] (see the slot table in the crate docs).

use iced::theme::palette::Extended;
use iced::{Background, Border, Color, Shadow, Theme, Vector, border};

use crate::{alpha, opacity, shape, state_layer};

/// M3 roles recovered from a theme's extended palette.
#[derive(Clone, Copy, Debug)]
pub struct Roles {
    /// `primary`.
    pub primary: Color,
    /// `on-primary`.
    pub on_primary: Color,
    /// `primary-container`.
    pub primary_container: Color,
    /// `on-primary-container`.
    pub on_primary_container: Color,
    /// `secondary`.
    pub secondary: Color,
    /// `secondary-container`.
    pub secondary_container: Color,
    /// `on-secondary-container`.
    pub on_secondary_container: Color,
    /// `error`.
    pub error: Color,
    /// `on-error`.
    pub on_error: Color,
    /// `surface`.
    pub surface: Color,
    /// `on-surface`.
    pub on_surface: Color,
    /// `on-surface-variant`.
    pub on_surface_variant: Color,
    /// `surface-container-lowest` .. `surface-container-highest`.
    pub containers: [Color; 5],
    /// `outline`.
    pub outline: Color,
    /// `outline-variant`.
    pub outline_variant: Color,
    /// `inverse-surface`.
    pub inverse_surface: Color,
    /// `inverse-on-surface`.
    pub inverse_on_surface: Color,
    /// Dark mode.
    pub dark: bool,
}

impl Roles {
    /// Reads the roles of `theme`.
    #[must_use]
    pub fn of(theme: &Theme) -> Self {
        Self::from_extended(theme.extended_palette())
    }

    /// Reads the roles of an extended palette made by [`crate::Colors::extended`].
    #[must_use]
    pub fn from_extended(e: &Extended) -> Self {
        let b = &e.background;
        Self {
            primary: e.primary.base.color,
            on_primary: e.primary.base.text,
            primary_container: e.primary.weak.color,
            on_primary_container: e.primary.weak.text,
            secondary: e.secondary.strong.color,
            secondary_container: e.secondary.base.color,
            on_secondary_container: e.secondary.base.text,
            error: e.danger.base.color,
            on_error: e.danger.base.text,
            surface: b.base.color,
            on_surface: b.base.text,
            on_surface_variant: b.strongest.text,
            containers: [
                b.weakest.color,
                b.weaker.color,
                b.weak.color,
                b.neutral.color,
                b.strong.color,
            ],
            outline: b.strongest.color,
            outline_variant: b.stronger.color,
            inverse_surface: e.danger.strong.color,
            inverse_on_surface: e.danger.strong.text,
            dark: e.is_dark,
        }
    }

    /// `surface-container-*` by level: 0 lowest, 1 low, 2 container, 3 high, 4 highest.
    #[must_use]
    pub fn container(&self, level: usize) -> Color {
        self.containers[level.min(4)]
    }
}

/// M3 elevation shadow of `level` (0..=5).
#[must_use]
pub fn elevation(level: u8) -> Shadow {
    let (y, blur) = match level {
        0 => return Shadow::default(),
        1 => (1.0, 3.0),
        2 => (2.0, 6.0),
        3 => (4.0, 8.0),
        4 => (6.0, 10.0),
        _ => (8.0, 12.0),
    };
    Shadow {
        color: Color::from_rgba(0.0, 0.0, 0.0, 0.3),
        offset: Vector::new(0.0, y),
        blur_radius: blur,
    }
}

/// Common buttons: filled, tonal, outlined, text, elevated, error (40 dp, full shape).
pub mod button {
    use iced::widget::button::{Status, Style};

    use super::{Background, Border, Color, Roles, Shadow, Theme, alpha, elevation, opacity, shape, state_layer};

    fn layer(status: Status) -> f32 {
        match status {
            Status::Hovered => opacity::HOVER,
            Status::Pressed => opacity::PRESSED,
            Status::Active | Status::Disabled => 0.0,
        }
    }

    fn build(
        r: &Roles,
        status: Status,
        container: Option<Color>,
        content: Color,
        border: Option<Color>,
        shadow: Shadow,
    ) -> Style {
        let radius = shape::FULL;
        if status == Status::Disabled {
            return Style {
                background: container
                    .map(|_| Background::Color(alpha(r.on_surface, opacity::DISABLED_CONTAINER))),
                text_color: alpha(r.on_surface, opacity::DISABLED_CONTENT),
                border: Border {
                    color: border.map_or(Color::TRANSPARENT, |_| {
                        alpha(r.on_surface, opacity::DISABLED_CONTAINER)
                    }),
                    width: if border.is_some() { 1.0 } else { 0.0 },
                    radius: radius.into(),
                },
                shadow: Shadow::default(),
                snap: true,
            };
        }
        let o = layer(status);
        let background = match container {
            Some(c) => Some(Background::Color(state_layer(c, content, o))),
            None if o > 0.0 => Some(Background::Color(alpha(content, o))),
            None => None,
        };
        Style {
            background,
            text_color: content,
            border: Border {
                color: border.unwrap_or(Color::TRANSPARENT),
                width: if border.is_some() { 1.0 } else { 0.0 },
                radius: radius.into(),
            },
            shadow,
            snap: true,
        }
    }

    /// Filled button: `primary` / `on-primary`.
    pub fn filled(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let shadow = if status == Status::Hovered { elevation(1) } else { Shadow::default() };
        build(&r, status, Some(r.primary), r.on_primary, None, shadow)
    }

    /// Filled tonal button: `secondary-container`.
    pub fn tonal(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let shadow = if status == Status::Hovered { elevation(1) } else { Shadow::default() };
        build(
            &r,
            status,
            Some(r.secondary_container),
            r.on_secondary_container,
            None,
            shadow,
        )
    }

    /// Outlined button: `outline-variant` stroke, `primary` label.
    pub fn outlined(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        build(&r, status, None, r.primary, Some(r.outline_variant), Shadow::default())
    }

    /// Text button: `primary` label only.
    pub fn text(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        build(&r, status, None, r.primary, None, Shadow::default())
    }

    /// Elevated button: `surface-container-low`, elevation 1 (2 on hover).
    pub fn elevated(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let shadow = elevation(if status == Status::Hovered { 2 } else { 1 });
        build(&r, status, Some(r.container(1)), r.primary, None, shadow)
    }

    /// Destructive filled button: `error` / `on-error`.
    pub fn error(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        build(&r, status, Some(r.error), r.on_error, None, Shadow::default())
    }

    /// Standard icon button (transparent, `on-surface-variant`).
    pub fn icon(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        build(&r, status, None, r.on_surface_variant, None, Shadow::default())
    }
}

/// Containers: surfaces by level, cards, dialogs.
pub mod container {
    use iced::widget::container::Style;

    use super::{Background, Border, Color, Roles, Theme, border, elevation, shape};

    fn surface_style(r: &Roles, bg: Color, radius: f32) -> Style {
        Style {
            text_color: Some(r.on_surface),
            background: Some(Background::Color(bg)),
            border: Border {
                radius: radius.into(),
                ..Border::default()
            },
            ..Style::default()
        }
    }

    /// `surface` (window background).
    pub fn surface(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        surface_style(&r, r.surface, shape::NONE)
    }
    /// `surface-container-lowest`.
    pub fn surface_container_lowest(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        surface_style(&r, r.container(0), shape::NONE)
    }
    /// `surface-container-low`.
    pub fn surface_container_low(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        surface_style(&r, r.container(1), shape::NONE)
    }
    /// `surface-container`.
    pub fn surface_container(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        surface_style(&r, r.container(2), shape::NONE)
    }
    /// `surface-container-high`.
    pub fn surface_container_high(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        surface_style(&r, r.container(3), shape::NONE)
    }
    /// `surface-container-highest`.
    pub fn surface_container_highest(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        surface_style(&r, r.container(4), shape::NONE)
    }

    /// Filled card: `surface-container-highest`, `medium` shape.
    pub fn card_filled(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        surface_style(&r, r.container(4), shape::MEDIUM)
    }

    /// Elevated card: `surface-container-low`, elevation 1, `medium` shape.
    pub fn card_elevated(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        Style {
            shadow: elevation(1),
            ..surface_style(&r, r.container(1), shape::MEDIUM)
        }
    }

    /// Outlined card: `surface` with an `outline-variant` stroke, `medium` shape.
    pub fn card_outlined(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        Style {
            border: border::rounded(shape::MEDIUM).width(1).color(r.outline_variant),
            ..surface_style(&r, r.surface, shape::MEDIUM)
        }
    }

    /// Dialog: `surface-container-high`, elevation 3, `extra-large` shape.
    pub fn dialog(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        Style {
            shadow: elevation(3),
            ..surface_style(&r, r.container(3), shape::EXTRA_LARGE)
        }
    }

    /// Snackbar: `inverse-surface`, elevation 3, `extra-small` shape.
    pub fn snackbar(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        Style {
            text_color: Some(r.inverse_on_surface),
            shadow: elevation(3),
            ..surface_style(&r, r.inverse_surface, shape::EXTRA_SMALL)
        }
    }

    /// Selected navigation indicator: `secondary-container`, full shape.
    pub fn indicator(theme: &Theme) -> Style {
        let r = Roles::of(theme);
        Style {
            text_color: Some(r.on_secondary_container),
            ..surface_style(&r, r.secondary_container, shape::FULL)
        }
    }
}

/// Text fields: filled and outlined.
pub mod text_input {
    use iced::widget::text_input::{Status, Style};

    use super::{Background, Border, Color, Roles, Theme, alpha, border, opacity, shape, state_layer};

    /// Filled text field: `surface-container-highest`, `extra-small` top corners; the active
    /// indicator becomes a `primary` outline on focus (iced has no bottom-only border).
    pub fn filled(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let base = r.container(4);
        let (bg, stroke, width) = match status {
            Status::Active => (base, Color::TRANSPARENT, 0.0),
            Status::Hovered => (state_layer(base, r.on_surface, opacity::HOVER), Color::TRANSPARENT, 0.0),
            Status::Focused { .. } => (base, r.primary, 2.0),
            Status::Disabled => (alpha(r.on_surface, 0.04), Color::TRANSPARENT, 0.0),
        };
        Style {
            background: Background::Color(bg),
            border: Border {
                color: stroke,
                width,
                radius: border::top(shape::EXTRA_SMALL),
            },
            icon: r.on_surface_variant,
            placeholder: r.on_surface_variant,
            value: if status == Status::Disabled {
                alpha(r.on_surface, opacity::DISABLED_CONTENT)
            } else {
                r.on_surface
            },
            selection: alpha(r.primary, 0.4),
        }
    }

    /// Outlined text field: `outline` stroke (2 dp `primary` on focus), `extra-small` shape.
    pub fn outlined(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let (stroke, width) = match status {
            Status::Active => (r.outline, 1.0),
            Status::Hovered => (r.on_surface, 1.0),
            Status::Focused { .. } => (r.primary, 2.0),
            Status::Disabled => (alpha(r.on_surface, opacity::DISABLED_CONTAINER), 1.0),
        };
        Style {
            background: Background::Color(Color::TRANSPARENT),
            border: Border {
                color: stroke,
                width,
                radius: shape::EXTRA_SMALL.into(),
            },
            icon: r.on_surface_variant,
            placeholder: r.on_surface_variant,
            value: if status == Status::Disabled {
                alpha(r.on_surface, opacity::DISABLED_CONTENT)
            } else {
                r.on_surface
            },
            selection: alpha(r.primary, 0.4),
        }
    }
}

/// Switch.
pub mod toggler {
    use iced::widget::toggler::{Status, Style};

    use super::{Background, Roles, Theme, alpha, opacity, state_layer};

    /// M3 switch: `primary` track with `on-primary` handle when on, outlined
    /// `surface-container-highest` track with a smaller `outline` handle when off.
    pub fn m3(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let (on, hovered, disabled) = match status {
            Status::Active { is_toggled } => (is_toggled, false, false),
            Status::Hovered { is_toggled } => (is_toggled, true, false),
            Status::Disabled { is_toggled } => (is_toggled, false, true),
        };
        let (track, track_border, handle, ratio) = if on {
            let handle = if hovered { r.primary_container } else { r.on_primary };
            (r.primary, 0.0, handle, 0.125)
        } else {
            let handle = if hovered { r.on_surface_variant } else { r.outline };
            (r.container(4), 2.0, handle, 0.25)
        };
        let track = if hovered && !on {
            state_layer(track, r.on_surface, opacity::HOVER)
        } else {
            track
        };
        let fade = |c| if disabled { alpha(c, opacity::DISABLED_CONTAINER) } else { c };
        Style {
            background: Background::Color(fade(track)),
            background_border_width: track_border,
            background_border_color: fade(r.outline),
            foreground: Background::Color(if disabled {
                alpha(handle, opacity::DISABLED_CONTENT)
            } else {
                handle
            }),
            foreground_border_width: 0.0,
            foreground_border_color: iced::Color::TRANSPARENT,
            text_color: Some(r.on_surface),
            border_radius: None,
            padding_ratio: ratio,
        }
    }
}

/// Slider.
pub mod slider {
    use iced::widget::slider::{Handle, HandleShape, Rail, Status, Style};

    use super::{Background, Border, Color, Roles, Theme, opacity, state_layer};

    /// M3 slider: `primary` active track, `secondary-container` inactive track, 20 dp handle.
    pub fn m3(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let handle = match status {
            Status::Active => r.primary,
            Status::Hovered => state_layer(r.primary, r.on_primary, opacity::HOVER),
            Status::Dragged => state_layer(r.primary, r.on_primary, opacity::DRAGGED),
        };
        Style {
            rail: Rail {
                backgrounds: (
                    Background::Color(r.primary),
                    Background::Color(r.secondary_container),
                ),
                width: 4.0,
                border: Border {
                    radius: 2.0.into(),
                    ..Border::default()
                },
            },
            handle: Handle {
                shape: HandleShape::Circle { radius: 10.0 },
                background: Background::Color(handle),
                border_width: 0.0,
                border_color: Color::TRANSPARENT,
            },
        }
    }
}

/// Checkbox.
pub mod checkbox {
    use iced::widget::checkbox::{Status, Style};

    use super::{Background, Border, Color, Roles, Theme, alpha, opacity, state_layer};

    fn build(r: &Roles, status: Status, accent: Color, on_accent: Color) -> Style {
        let (checked, hovered, disabled) = match status {
            Status::Active { is_checked } => (is_checked, false, false),
            Status::Hovered { is_checked } => (is_checked, true, false),
            Status::Disabled { is_checked } => (is_checked, false, true),
        };
        let fade = |c: Color, a: f32| if disabled { alpha(c, a) } else { c };
        let (bg, stroke) = if checked {
            let bg = if hovered { state_layer(accent, on_accent, opacity::HOVER) } else { accent };
            (fade(bg, opacity::DISABLED_CONTENT), Color::TRANSPARENT)
        } else {
            let stroke = if hovered { r.on_surface } else { r.on_surface_variant };
            let bg = if hovered { alpha(r.on_surface, opacity::HOVER) } else { Color::TRANSPARENT };
            (bg, fade(stroke, opacity::DISABLED_CONTENT))
        };
        Style {
            background: Background::Color(bg),
            icon_color: fade(on_accent, 1.0),
            border: Border {
                color: stroke,
                width: if checked { 0.0 } else { 2.0 },
                radius: 2.0.into(),
            },
            text_color: Some(fade(r.on_surface, opacity::DISABLED_CONTENT)),
        }
    }

    /// M3 checkbox: `primary` box with `on-primary` check, `on-surface-variant` outline when off.
    pub fn m3(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        build(&r, status, r.primary, r.on_primary)
    }

    /// Error checkbox: `error` / `on-error`.
    pub fn error(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        build(&r, status, r.error, r.on_error)
    }
}

/// Pick list (exposed dropdown menu).
pub mod pick_list {
    use iced::overlay::menu;
    use iced::widget::pick_list::{Status, Style};

    use super::{Background, Border, Roles, Theme, elevation, shape, state_layer, opacity};

    /// Outlined exposed dropdown: `outline` stroke, `primary` 2 dp when open.
    pub fn m3(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let (stroke, width, bg) = match status {
            Status::Active => (r.outline, 1.0, r.surface),
            Status::Hovered => (r.on_surface, 1.0, state_layer(r.surface, r.on_surface, opacity::HOVER)),
            Status::Opened { .. } => (r.primary, 2.0, r.surface),
        };
        Style {
            text_color: r.on_surface,
            placeholder_color: r.on_surface_variant,
            handle_color: r.on_surface_variant,
            background: Background::Color(bg),
            border: Border {
                color: stroke,
                width,
                radius: shape::EXTRA_SMALL.into(),
            },
        }
    }

    /// M3 menu: `surface-container`, elevation 2, `extra-small` shape,
    /// `secondary-container` selection.
    pub fn menu(theme: &Theme) -> menu::Style {
        let r = Roles::of(theme);
        menu::Style {
            background: Background::Color(r.container(2)),
            border: Border {
                radius: shape::EXTRA_SMALL.into(),
                ..Border::default()
            },
            text_color: r.on_surface,
            selected_text_color: r.on_secondary_container,
            selected_background: Background::Color(r.secondary_container),
            shadow: elevation(2),
        }
    }
}

/// Scrollable.
pub mod scrollable {
    use iced::widget::container;
    use iced::widget::scrollable::{AutoScroll, Rail, Scroller, Status, Style};

    use super::{Background, Border, Roles, Theme, alpha, elevation, shape};

    /// Thin M3 scrollbars: `on-surface-variant` thumb at 38 % (60 % hovered or dragged).
    pub fn m3(theme: &Theme, status: Status) -> Style {
        let r = Roles::of(theme);
        let (v_active, h_active) = match status {
            Status::Active { .. } => (false, false),
            Status::Hovered {
                is_horizontal_scrollbar_hovered,
                is_vertical_scrollbar_hovered,
                ..
            } => (is_vertical_scrollbar_hovered, is_horizontal_scrollbar_hovered),
            Status::Dragged {
                is_horizontal_scrollbar_dragged,
                is_vertical_scrollbar_dragged,
                ..
            } => (is_vertical_scrollbar_dragged, is_horizontal_scrollbar_dragged),
        };
        let rail = |active: bool| Rail {
            background: None,
            border: Border::default(),
            scroller: Scroller {
                background: Background::Color(alpha(
                    r.on_surface_variant,
                    if active { 0.6 } else { 0.38 },
                )),
                border: Border {
                    radius: shape::FULL.into(),
                    ..Border::default()
                },
            },
        };
        Style {
            container: container::Style::default(),
            vertical_rail: rail(v_active),
            horizontal_rail: rail(h_active),
            gap: None,
            auto_scroll: AutoScroll {
                background: Background::Color(r.container(3)),
                border: Border {
                    radius: shape::FULL.into(),
                    width: 1.0,
                    color: r.outline_variant,
                },
                shadow: elevation(2),
                icon: r.on_surface,
            },
        }
    }
}
