// SPDX-License-Identifier: Apache-2.0
// M3 navigation rail destination: 56x32 active indicator, 24 dp icon, label medium.
import QtQuick
import QtQuick.Templates as T
import QtQuick.Controls.impl
import Aphrody.M3

T.AbstractButton {
    id: control

    readonly property color iconColor: control.checked ? M3Theme.onSecondaryContainer : M3Theme.onSurfaceVariant

    checkable: true
    implicitWidth: 80
    implicitHeight: 56
    icon.width: 24
    icon.height: 24
    icon.color: control.iconColor
    font: M3Style.labelMedium
    Accessible.role: Accessible.PageTab

    contentItem: Column {
        spacing: 4

        Rectangle {
            id: indicator
            anchors.horizontalCenter: parent.horizontalCenter
            width: 56
            height: 32
            radius: height / 2
            color: control.checked ? M3Theme.secondaryContainer : "transparent"

            StateLayer {
                anchors.fill: parent
                radius: parent.radius
                color: M3Theme.onSurface
                active: control.enabled
                hovered: control.hovered
                pressed: control.down
                focused: control.visualFocus
            }

            IconImage {
                anchors.centerIn: parent
                name: control.icon.name
                source: control.icon.source
                sourceSize.width: control.icon.width
                sourceSize.height: control.icon.height
                color: control.iconColor
            }
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: control.text
            font: control.font
            color: control.checked ? M3Theme.onSurface : M3Theme.onSurfaceVariant
        }
    }
}
