// SPDX-License-Identifier: Apache-2.0
// M3 slider: 4 dp active (primary) and inactive (secondary container) tracks, 20 dp handle.
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.Slider {
    id: control

    readonly property bool horizontal: control.orientation === Qt.Horizontal
    readonly property color activeColor: control.enabled
        ? M3Theme.primary : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitHandleWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitHandleHeight + topPadding + bottomPadding)
    padding: 10

    handle: Item {
        implicitWidth: 40
        implicitHeight: 40
        x: control.leftPadding + (control.horizontal ? control.visualPosition * (control.availableWidth - 20) - 10
                                                     : (control.availableWidth - width) / 2)
        y: control.topPadding + (control.horizontal ? (control.availableHeight - height) / 2
                                                    : control.visualPosition * (control.availableHeight - 20) - 10)

        StateLayer {
            anchors.fill: parent
            radius: width / 2
            color: M3Theme.primary
            active: control.enabled
            hovered: control.hovered
            pressed: control.pressed
            focused: control.visualFocus
        }

        Rectangle {
            anchors.centerIn: parent
            width: 20
            height: 20
            radius: 10
            color: control.activeColor
            layer.enabled: control.enabled
            layer.effect: Elevation { level: 1 }
        }
    }

    background: Item {
        implicitWidth: control.horizontal ? 200 : 40
        implicitHeight: control.horizontal ? 40 : 200
        x: control.leftPadding + (control.horizontal ? 0 : (control.availableWidth - width) / 2)
        y: control.topPadding + (control.horizontal ? (control.availableHeight - height) / 2 : 0)
        width: control.horizontal ? control.availableWidth : implicitWidth
        height: control.horizontal ? implicitHeight : control.availableHeight

        Rectangle {
            x: control.horizontal ? 0 : (parent.width - width) / 2
            y: control.horizontal ? (parent.height - height) / 2 : 0
            width: control.horizontal ? parent.width : 4
            height: control.horizontal ? 4 : parent.height
            radius: 2
            color: control.enabled ? M3Theme.secondaryContainer
                                   : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContainerOpacity)

            Rectangle {
                x: control.horizontal ? (control.mirrored ? parent.width - width : 0) : 0
                y: control.horizontal ? 0 : control.visualPosition * parent.height
                width: control.horizontal ? control.position * parent.width : parent.width
                height: control.horizontal ? parent.height : control.position * parent.height
                radius: 2
                color: control.activeColor
            }
        }
    }
}
