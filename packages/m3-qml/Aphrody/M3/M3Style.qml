// SPDX-License-Identifier: Apache-2.0
// Material 3 shape, state-layer, elevation, type-scale and motion tokens for Qt Quick.
// Values mirror crates/aphrody-m3-tokens (shape.rs, state.rs, elevation.rs, typography.rs,
// motion.rs); colors live only in the generated M3Theme singleton.
pragma Singleton
import QtQuick

QtObject {
    id: style

    enum ButtonVariant { Filled, Tonal, Outlined, Text, Elevated }
    enum FieldVariant { FilledField, OutlinedField }
    enum CardVariant { ElevatedCard, FilledCard, OutlinedCard }

    // Shape (dp).
    readonly property real cornerNone: 0
    readonly property real cornerExtraSmall: 4
    readonly property real cornerSmall: 8
    readonly property real cornerMedium: 12
    readonly property real cornerLarge: 16
    readonly property real cornerLargeIncreased: 20
    readonly property real cornerExtraLarge: 28

    // State layers.
    readonly property real hoverOpacity: 0.08
    readonly property real focusOpacity: 0.10
    readonly property real pressedOpacity: 0.10
    readonly property real draggedOpacity: 0.16
    readonly property real disabledContentOpacity: 0.38
    readonly property real disabledContainerOpacity: 0.12

    // Elevation levels 0-5 in dp.
    readonly property var elevationDp: [0, 1, 3, 6, 8, 12]

    // Type scale. Set fontFamily before the first window to change every style.
    property string fontFamily: "Google Sans Flex"
    function typeStyle(size: real, weight: int, tracking: real): font {
        return Qt.font({ family: style.fontFamily, pixelSize: size, weight: weight, letterSpacing: tracking })
    }
    readonly property font displayLarge: typeStyle(57, 400, -0.25)
    readonly property font displayMedium: typeStyle(45, 400, 0)
    readonly property font displaySmall: typeStyle(36, 400, 0)
    readonly property font headlineLarge: typeStyle(32, 400, 0)
    readonly property font headlineMedium: typeStyle(28, 400, 0)
    readonly property font headlineSmall: typeStyle(24, 400, 0)
    readonly property font titleLarge: typeStyle(22, 400, 0)
    readonly property font titleMedium: typeStyle(16, 500, 0.15)
    readonly property font titleSmall: typeStyle(14, 500, 0.1)
    readonly property font bodyLarge: typeStyle(16, 400, 0.5)
    readonly property font bodyMedium: typeStyle(14, 400, 0.25)
    readonly property font bodySmall: typeStyle(12, 400, 0.4)
    readonly property font labelLarge: typeStyle(14, 500, 0.1)
    readonly property font labelMedium: typeStyle(12, 500, 0.5)
    readonly property font labelSmall: typeStyle(11, 500, 0.5)

    // Motion (ms and cubic Bezier control points for Easing.BezierSpline).
    readonly property int durationShort2: 100
    readonly property int durationShort4: 200
    readonly property int durationMedium2: 300
    readonly property int durationMedium4: 400
    readonly property int durationLong2: 500
    readonly property var easingStandard: [0.2, 0.0, 0.0, 1.0, 1.0, 1.0]
    readonly property var easingEmphasizedDecelerate: [0.05, 0.7, 0.1, 1.0, 1.0, 1.0]
    readonly property var easingEmphasizedAccelerate: [0.3, 0.0, 0.8, 0.15, 1.0, 1.0]

    // `c` with alpha `a`.
    function alpha(c: color, a: real): color {
        return Qt.rgba(c.r, c.g, c.b, a)
    }

    // State-layer opacity for an interactive control.
    function stateOpacity(enabled: bool, pressed: bool, focused: bool, hovered: bool): real {
        if (!enabled)
            return 0
        if (pressed)
            return style.pressedOpacity
        if (focused)
            return style.focusOpacity
        return hovered ? style.hoverOpacity : 0
    }
}
