// SPDX-License-Identifier: Apache-2.0
// M3 filter chip (checkable, default) or assist chip (checkable: false): 32 dp, small corners.
import QtQuick
import QtQuick.Templates as T
import QtQuick.Controls.impl
import Aphrody.M3

T.AbstractButton {
    id: control

    readonly property color contentColor: !control.enabled
        ? M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
        : control.checked ? M3Theme.onSecondaryContainer : M3Theme.onSurfaceVariant

    checkable: true
    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding)
    topInset: 8
    bottomInset: 8
    topPadding: 14
    bottomPadding: 14
    leftPadding: control.checked || control.icon.name !== "" || control.icon.source.toString() !== "" ? 8 : 16
    rightPadding: 16
    spacing: 8
    icon.width: 18
    icon.height: 18
    icon.color: control.checked ? M3Theme.onSecondaryContainer : M3Theme.primary
    font: M3Style.labelLarge
    Accessible.role: control.checkable ? Accessible.CheckBox : Accessible.Button

    contentItem: Row {
        spacing: control.spacing

        Text {
            visible: control.checkable && control.checked
            anchors.verticalCenter: parent.verticalCenter
            text: "✓"
            font: control.font
            color: control.contentColor
        }

        IconLabel {
            anchors.verticalCenter: parent.verticalCenter
            spacing: control.spacing
            mirrored: control.mirrored
            display: control.checked ? T.AbstractButton.TextOnly : control.display
            icon: control.icon
            text: control.text
            font: control.font
            color: control.contentColor
        }
    }

    background: Rectangle {
        implicitHeight: 32
        radius: M3Style.cornerSmall
        color: control.checked ? M3Theme.secondaryContainer : "transparent"
        border.width: control.checked ? 0 : 1
        border.color: control.enabled ? M3Theme.outlineVariant
                                      : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContainerOpacity)

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
