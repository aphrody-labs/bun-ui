// SPDX-License-Identifier: Apache-2.0
// M3 radio button: 20 dp ring, 10 dp dot, 40 dp state layer.
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.RadioButton {
    id: control

    readonly property color ringColor: !control.enabled
        ? M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
        : control.checked ? M3Theme.primary : M3Theme.onSurfaceVariant

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding,
                             implicitIndicatorHeight + topPadding + bottomPadding)
    padding: 4
    spacing: 4
    font: M3Style.bodyLarge

    indicator: Item {
        implicitWidth: 40
        implicitHeight: 40
        x: control.text ? (control.mirrored ? control.width - width - control.rightPadding : control.leftPadding)
                        : control.leftPadding + (control.availableWidth - width) / 2
        y: control.topPadding + (control.availableHeight - height) / 2

        StateLayer {
            anchors.fill: parent
            radius: width / 2
            color: control.checked ? M3Theme.primary : M3Theme.onSurface
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
            color: "transparent"
            border.width: 2
            border.color: control.ringColor

            Rectangle {
                id: dot
                anchors.centerIn: parent
                width: control.checked ? 10 : 0
                height: dot.width
                radius: dot.width / 2
                color: control.ringColor
                Behavior on width {
                    NumberAnimation { duration: M3Style.durationShort4; easing.type: Easing.OutCubic }
                }
            }
        }
    }

    contentItem: Text {
        leftPadding: control.indicator && !control.mirrored ? control.indicator.width + control.spacing : 0
        rightPadding: control.indicator && control.mirrored ? control.indicator.width + control.spacing : 0
        text: control.text
        font: control.font
        color: control.enabled ? M3Theme.onSurface
                               : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
        elide: Text.ElideRight
        verticalAlignment: Text.AlignVCenter
    }
}
