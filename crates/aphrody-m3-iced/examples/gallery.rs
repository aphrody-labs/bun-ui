// SPDX-License-Identifier: Apache-2.0
//! M3 gallery for iced: `cargo run --example gallery`.

use aphrody_m3_iced::{Themes, Variant, spacing::dp, style, typescale};
use iced::theme::Mode;
use iced::widget::{
    button, checkbox, column, container, pick_list, row, scrollable, slider, text, text_input,
    toggler,
};
use iced::{Element, Fill, Subscription, Task, Theme};

#[derive(Debug, Clone)]
enum Message {
    Mode(Mode),
    ForceDark(bool),
    Seed(Seed),
    Text(String),
    Slider(f32),
    Toggle(bool),
    Check(bool),
    Pressed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Seed {
    Baseline,
    Blue,
    Green,
    Red,
}

impl Seed {
    const ALL: [Self; 4] = [Self::Baseline, Self::Blue, Self::Green, Self::Red];

    const fn argb(self) -> u32 {
        match self {
            Self::Baseline => 0xFF67_50A4,
            Self::Blue => 0xFF00_61A4,
            Self::Green => 0xFF38_6A20,
            Self::Red => 0xFFB3_261E,
        }
    }
}

impl std::fmt::Display for Seed {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}

struct Gallery {
    themes: Themes,
    system: Mode,
    force_dark: bool,
    seed: Seed,
    value: String,
    slider: f32,
    toggle: bool,
    check: bool,
    presses: u32,
}

impl Gallery {
    fn boot() -> (Self, Task<Message>) {
        (
            Self {
                themes: Themes::default(),
                system: Mode::None,
                force_dark: false,
                seed: Seed::Baseline,
                value: String::new(),
                slider: 0.4,
                toggle: true,
                check: true,
                presses: 0,
            },
            iced::system::theme().map(Message::Mode),
        )
    }

    fn update(&mut self, message: Message) {
        match message {
            Message::Mode(mode) => self.system = mode,
            Message::ForceDark(on) => self.force_dark = on,
            Message::Seed(seed) => {
                self.seed = seed;
                self.themes = Themes::new(seed.argb(), Variant::TonalSpot, 0.0);
            }
            Message::Text(v) => self.value = v,
            Message::Slider(v) => self.slider = v,
            Message::Toggle(v) => self.toggle = v,
            Message::Check(v) => self.check = v,
            Message::Pressed => self.presses += 1,
        }
    }

    fn theme(&self) -> Theme {
        let mode = if self.force_dark { Mode::Dark } else { self.system };
        self.themes.for_mode(mode)
    }

    fn subscription(&self) -> Subscription<Message> {
        iced::system::theme_changes().map(Message::Mode)
    }

    fn view(&self) -> Element<'_, Message> {
        let title = text("Bun UI M3 gallery (iced)")
            .size(typescale::size(typescale::HEADLINE_SMALL))
            .line_height(typescale::line_height(typescale::HEADLINE_SMALL));
        let label = |s: &'static str| text(s).size(typescale::size(typescale::LABEL_LARGE));
        let buttons = row![
            button(label("Filled")).padding([10, 24]).style(style::button::filled).on_press(Message::Pressed),
            button(label("Tonal")).padding([10, 24]).style(style::button::tonal).on_press(Message::Pressed),
            button(label("Outlined")).padding([10, 24]).style(style::button::outlined).on_press(Message::Pressed),
            button(label("Text")).padding([10, 12]).style(style::button::text).on_press(Message::Pressed),
            button(label("Elevated")).padding([10, 24]).style(style::button::elevated).on_press(Message::Pressed),
            button(label("Delete")).padding([10, 24]).style(style::button::error).on_press(Message::Pressed),
            button(label("Disabled")).padding([10, 24]).style(style::button::filled),
        ]
        .spacing(dp(2));

        let controls = column![
            toggler(self.toggle).label("Switch").on_toggle(Message::Toggle).style(style::toggler::m3),
            toggler(self.force_dark).label("Force dark").on_toggle(Message::ForceDark).style(style::toggler::m3),
            checkbox(self.check).label("Checkbox").on_toggle(Message::Check).style(style::checkbox::m3),
            slider(0.0..=1.0_f32, self.slider, Message::Slider).step(0.01_f32).style(style::slider::m3),
            text_input("Filled text field", &self.value).on_input(Message::Text).padding(dp(4)).style(style::text_input::filled),
            text_input("Outlined text field", &self.value).on_input(Message::Text).padding(dp(4)).style(style::text_input::outlined),
            pick_list(Seed::ALL, Some(self.seed), Message::Seed)
                .style(style::pick_list::m3)
                .menu_style(style::pick_list::menu),
        ]
        .spacing(dp(4));

        let card = |name: &'static str, f: fn(&Theme) -> iced::widget::container::Style| {
            container(text(name)).padding(dp(4)).width(160).height(96).style(f)
        };
        let cards = row![
            card("Filled card", style::container::card_filled),
            card("Elevated card", style::container::card_elevated),
            card("Outlined card", style::container::card_outlined),
            card("Dialog", style::container::dialog),
        ]
        .spacing(dp(4));

        let levels = row![
            card("lowest", style::container::surface_container_lowest),
            card("low", style::container::surface_container_low),
            card("container", style::container::surface_container),
            card("high", style::container::surface_container_high),
            card("highest", style::container::surface_container_highest),
        ]
        .spacing(dp(2));

        let snackbar = container(text(format!("Pressed {} times", self.presses)))
            .padding([dp(3), dp(4)])
            .style(style::container::snackbar);

        let content = column![title, buttons, controls, cards, levels, snackbar]
            .spacing(dp(6))
            .padding(dp(6));
        container(scrollable(content).style(style::scrollable::m3).width(Fill).height(Fill))
            .style(style::container::surface)
            .into()
    }
}

fn main() -> iced::Result {
    iced::application(Gallery::boot, Gallery::update, Gallery::view)
        .title("Bun UI M3 gallery (iced)")
        .theme(|g: &Gallery| Some(g.theme()))
        .subscription(Gallery::subscription)
        .run()
}
