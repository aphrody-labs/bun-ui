// SPDX-License-Identifier: Apache-2.0
//! M3 navigation rail on `AdwNavigationSplitView`.

use adw::prelude::*;
use gtk::glib;

fn show(split: &adw::NavigationSplitView, stack: &gtk::Stack, content: &adw::NavigationPage, name: &str) {
    if let Some(child) = stack.child_by_name(name) {
        stack.set_visible_child(&child);
        if let Some(title) = stack.page(&child).title() {
            content.set_title(&title);
        }
        split.set_show_content(true);
    }
}

/// Width at and below which the rail collapses into a navigation stack.
pub const COLLAPSE_CONDITION: &str = "max-width: 600sp";

/// M3 navigation rail: a narrow sidebar of icon + label destinations beside a content stack.
///
/// The sidebar is a `navigation-sidebar` `GtkListBox` styled `.m3-rail`; selecting a row shows
/// the matching `GtkStack` page in the content pane.
#[derive(Clone)]
pub struct NavigationRail {
    split: adw::NavigationSplitView,
    list: gtk::ListBox,
    stack: gtk::Stack,
    content: adw::NavigationPage,
}

impl NavigationRail {
    /// Empty rail; `title` names the sidebar page.
    #[must_use]
    pub fn new(title: &str) -> Self {
        let list = gtk::ListBox::builder()
            .selection_mode(gtk::SelectionMode::Single)
            .css_classes(["navigation-sidebar", "m3-rail"])
            .build();
        let scroller = gtk::ScrolledWindow::builder()
            .hscrollbar_policy(gtk::PolicyType::Never)
            .child(&list)
            .vexpand(true)
            .build();
        let sidebar_view = adw::ToolbarView::new();
        sidebar_view.add_top_bar(&adw::HeaderBar::new());
        sidebar_view.set_content(Some(&scroller));
        let sidebar = adw::NavigationPage::new(&sidebar_view, title);

        let stack = gtk::Stack::builder()
            .transition_type(gtk::StackTransitionType::Crossfade)
            .vexpand(true)
            .hexpand(true)
            .build();
        let content_view = adw::ToolbarView::new();
        content_view.add_top_bar(&adw::HeaderBar::new());
        content_view.set_content(Some(&stack));
        let content = adw::NavigationPage::new(&content_view, title);

        let split = adw::NavigationSplitView::builder()
            .sidebar(&sidebar)
            .content(&content)
            .min_sidebar_width(96.0)
            .max_sidebar_width(128.0)
            .sidebar_width_fraction(0.12)
            .build();

        list.connect_row_selected(glib::clone!(
            #[weak]
            split,
            #[weak]
            stack,
            #[weak]
            content,
            move |_, row| {
                if let Some(row) = row {
                    show(&split, &stack, &content, &row.widget_name());
                }
            }
        ));
        Self { split, list, stack, content }
    }

    /// Adds a destination. The first destination is selected.
    pub fn add_destination(&self, name: &str, icon_name: &str, label: &str, page: &impl IsA<gtk::Widget>) {
        let icon = gtk::Image::from_icon_name(icon_name);
        let text = gtk::Label::new(Some(label));
        let column = gtk::Box::new(gtk::Orientation::Vertical, 4);
        column.set_halign(gtk::Align::Center);
        column.append(&icon);
        column.append(&text);
        let row = gtk::ListBoxRow::builder().child(&column).name(name).tooltip_text(label).build();
        self.stack.add_titled(page, Some(name), label);
        let first = self.list.row_at_index(0).is_none();
        self.list.append(&row);
        if first {
            self.list.select_row(Some(&row));
        }
    }

    /// Selects the destination `name`.
    pub fn select(&self, name: &str) {
        let mut index = 0;
        while let Some(row) = self.list.row_at_index(index) {
            if row.widget_name() == name {
                self.list.select_row(Some(&row));
                return;
            }
            index += 1;
        }
    }

    /// Breakpoint that collapses the split view at [`COLLAPSE_CONDITION`]; add it to the
    /// `AdwApplicationWindow` or `AdwBreakpointBin`.
    #[must_use]
    pub fn collapse_breakpoint(&self) -> adw::Breakpoint {
        let condition = adw::BreakpointCondition::parse(COLLAPSE_CONDITION)
            .expect("aphrody-m3-gtk: valid breakpoint condition");
        let breakpoint = adw::Breakpoint::new(condition);
        breakpoint.add_setter(&self.split, "collapsed", Some(&true.to_value()));
        breakpoint
    }

    /// The split view to place in a window.
    #[must_use]
    pub fn widget(&self) -> &adw::NavigationSplitView {
        &self.split
    }

    /// The content page (its title follows the selected destination).
    #[must_use]
    pub fn content_page(&self) -> &adw::NavigationPage {
        &self.content
    }

    /// The destination stack.
    #[must_use]
    pub fn stack(&self) -> &gtk::Stack {
        &self.stack
    }
}
