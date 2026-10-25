// SPDX-License-Identifier: Apache-2.0
#include "aphrody-m3-qt/cpp/m3palette.h"

#include <QtCore/QtGlobal>
#include <QtGui/QColor>
#include <QtGui/QGuiApplication>
#include <QtGui/QPalette>
#include <QtGui/QStyleHints>

namespace aphrody_m3 {

namespace {

// Must match crate::palette::PALETTE_ROLES.
constexpr QPalette::ColorRole kRoles[] = {
    QPalette::Window,      QPalette::WindowText,    QPalette::Base,
    QPalette::AlternateBase, QPalette::ToolTipBase, QPalette::ToolTipText,
    QPalette::PlaceholderText, QPalette::Text,      QPalette::Button,
    QPalette::ButtonText,  QPalette::BrightText,    QPalette::Light,
    QPalette::Midlight,    QPalette::Mid,           QPalette::Dark,
    QPalette::Shadow,      QPalette::Highlight,     QPalette::HighlightedText,
    QPalette::Link,        QPalette::LinkVisited,   QPalette::Accent,
};

constexpr std::size_t kRoleCount = sizeof(kRoles) / sizeof(kRoles[0]);

} // namespace

void apply_application_palette(rust::Slice<const std::uint32_t> argb)
{
    if (argb.size() < kRoleCount)
        return;
    QPalette palette;
    for (std::size_t i = 0; i < kRoleCount; ++i)
        palette.setColor(QPalette::All, kRoles[i], QColor::fromRgba(argb[i]));

    for (const auto role : {QPalette::WindowText, QPalette::Text, QPalette::ButtonText,
                            QPalette::PlaceholderText, QPalette::HighlightedText}) {
        QColor disabled = palette.color(QPalette::Active, role);
        disabled.setAlphaF(0.38f);
        palette.setColor(QPalette::Disabled, role, disabled);
    }
    QColor disabledButton = palette.color(QPalette::Active, QPalette::WindowText);
    disabledButton.setAlphaF(0.12f);
    palette.setColor(QPalette::Disabled, QPalette::Button, disabledButton);
    palette.setColor(QPalette::Disabled, QPalette::Highlight, disabledButton);

    QGuiApplication::setPalette(palette);
}

bool system_prefers_dark()
{
    return QGuiApplication::styleHints()->colorScheme() == Qt::ColorScheme::Dark;
}

} // namespace aphrody_m3
