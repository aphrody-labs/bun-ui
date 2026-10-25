// SPDX-License-Identifier: Apache-2.0
// M3 common button. `variant` defaults to Filled when highlighted, Text when flat, else Tonal.
import QtQuick
import QtQuick.Templates as T
import QtQuick.Controls.impl
import Aphrody.M3

T.Button {
    id: control

    property int variant: control.highlighted ? M3Style.Filled : control.flat ? M3Style.Text : M3Style.Tonal
    readonly property bool hasIcon: control.icon.name !== "" || control.icon.source.toString() !== ""
    readonly property color containerColor: {
        switch (control.variant) {
        case M3Style.Filled: return M3Theme.primary
        case M3Style.Tonal: return M3Theme.secondaryContainer
        case M3Style.Elevated: return M3Theme.surfaceContainerLow
        default: return "transparent"
        }
    }
    readonly property color contentColor: {
        if (!control.enabled)
            return M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
        switch (control.variant) {
        case M3Style.Filled: return M3Theme.onPrimary
        case M3Style.Tonal: return M3Theme.onSecondaryContainer
        default: return M3Theme.primary
        }
    }
    readonly property int elevationLevel: {
        if (!control.enabled)
            return 0
        const raised = control.hovered && !control.down ? 1 : 0
        switch (control.variant) {
        case M3Style.Elevated: return 1 + raised
        case M3Style.Filled:
        case M3Style.Tonal: return raised
        default: return 0
        }
    }

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding)

    topInset: 4
    bottomInset: 4
    topPadding: 14
    bottomPadding: 14
    leftPadding: control.variant === M3Style.Text ? 12 : control.hasIcon ? 16 : 24
    rightPadding: control.variant === M3Style.Text ? (control.hasIcon ? 16 : 12) : 24
    spacing: 8

    icon.width: 18
    icon.height: 18
    icon.color: control.contentColor
    font: M3Style.labelLarge

    contentItem: IconLabel {
        spacing: control.spacing
        mirrored: control.mirrored
        display: control.display
        icon: control.icon
        text: control.text
        font: control.font
        color: control.contentColor
    }

    background: Rectangle {
        implicitWidth: 48
        implicitHeight: 40
        radius: height / 2
        color: !control.enabled && control.containerColor.a > 0
               ? M3Style.alpha(M3Theme.onSurface, M3Style.disabledContainerOpacity)
               : control.containerColor
        border.width: control.variant === M3Style.Outlined ? 1 : 0
        border.color: control.enabled ? M3Theme.outline
                                      : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContainerOpacity)
        layer.enabled: control.elevationLevel > 0
        layer.effect: Elevation { level: control.elevationLevel }

        StateLayer {
            anchors.fill: parent
            radius: parent.radius
            color: control.contentColor
            active: control.enabled
            hovered: control.hovered
            pressed: control.down
            focused: control.visualFocus
        }
    }
}
