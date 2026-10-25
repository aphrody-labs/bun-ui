// SPDX-License-Identifier: Apache-2.0
// M3 menu item: 48 dp, 12 dp horizontal padding, label large, state layer.
import QtQuick
import QtQuick.Templates as T
import QtQuick.Controls.impl
import Aphrody.M3

T.MenuItem {
    id: control

    readonly property color contentColor: control.enabled
        ? M3Theme.onSurface : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding,
                             implicitIndicatorHeight + topPadding + bottomPadding)
    leftPadding: 12
    rightPadding: 12
    spacing: 12
    icon.width: 24
    icon.height: 24
    icon.color: M3Theme.onSurfaceVariant
    font: M3Style.labelLarge

    contentItem: IconLabel {
        readonly property real arrowPadding: control.subMenu && control.arrow ? control.arrow.width + control.spacing : 0
        readonly property real indicatorPadding: control.checkable && control.indicator ? control.indicator.width + control.spacing : 0
        leftPadding: !control.mirrored ? indicatorPadding : arrowPadding
        rightPadding: control.mirrored ? indicatorPadding : arrowPadding
        spacing: control.spacing
        mirrored: control.mirrored
        display: control.display
        alignment: Qt.AlignLeft
        icon: control.icon
        text: control.text
        font: control.font
        color: control.contentColor
    }

    indicator: Text {
        x: control.mirrored ? control.width - width - control.rightPadding : control.leftPadding
        y: control.topPadding + (control.availableHeight - height) / 2
        visible: control.checkable
        text: control.checked ? "✓" : ""
        font: M3Style.labelLarge
        color: M3Theme.onSurfaceVariant
    }

    arrow: Text {
        x: control.mirrored ? control.leftPadding : control.width - width - control.rightPadding
        y: control.topPadding + (control.availableHeight - height) / 2
        visible: control.subMenu
        text: control.mirrored ? "◂" : "▸"
        font: M3Style.labelLarge
        color: M3Theme.onSurfaceVariant
    }

    background: Rectangle {
        implicitWidth: 112
        implicitHeight: 48
        color: control.highlighted ? M3Style.alpha(M3Theme.onSurface, M3Style.focusOpacity) : "transparent"

        StateLayer {
            anchors.fill: parent
            color: M3Theme.onSurface
            active: control.enabled
            hovered: control.hovered
            pressed: control.down
        }
    }
}
