// SPDX-License-Identifier: Apache-2.0
// M3 primary tab: title small, primary label and 3 dp indicator when checked.
import QtQuick
import QtQuick.Templates as T
import QtQuick.Controls.impl
import Aphrody.M3

T.TabButton {
    id: control

    readonly property color contentColor: !control.enabled
        ? M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
        : control.checked ? M3Theme.primary : M3Theme.onSurfaceVariant

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding)
    padding: 12
    leftPadding: 16
    rightPadding: 16
    spacing: 8
    icon.width: 24
    icon.height: 24
    icon.color: control.contentColor
    font: M3Style.titleSmall

    contentItem: IconLabel {
        id: label
        spacing: control.spacing
        mirrored: control.mirrored
        display: control.display
        icon: control.icon
        text: control.text
        font: control.font
        color: control.contentColor
    }

    background: Item {
        implicitHeight: 48

        StateLayer {
            anchors.fill: parent
            color: control.checked ? M3Theme.primary : M3Theme.onSurface
            active: control.enabled
            hovered: control.hovered
            pressed: control.down
            focused: control.visualFocus
        }

        Rectangle {
            visible: control.checked
            width: Math.max(24, label.implicitWidth)
            height: 3
            x: (parent.width - width) / 2
            y: parent.height - height
            topLeftRadius: 3
            topRightRadius: 3
            color: M3Theme.primary
        }
    }
}
