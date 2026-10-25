// SPDX-License-Identifier: Apache-2.0
// QPalette filler for aphrody-m3-qt. The color order is crate::palette::PALETTE_ROLES.
#pragma once

#include <cstdint>

#include "rust/cxx.h"

namespace aphrody_m3 {

// Builds a QPalette from `argb` (0xAARRGGBB, PALETTE_ROLES order) and calls
// QGuiApplication::setPalette. Disabled text roles get 38 % alpha.
void apply_application_palette(rust::Slice<const std::uint32_t> argb);

// True when the platform color scheme is dark (QStyleHints::colorScheme, Qt 6.5+).
bool system_prefers_dark();

} // namespace aphrody_m3
