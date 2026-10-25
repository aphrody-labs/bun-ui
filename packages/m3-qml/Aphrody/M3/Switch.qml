// SPDX-License-Identifier: Apache-2.0
// M3 switch: 52x32 track, 16/24/28 dp thumb (off/on/pressed).
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.Switch {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding,
                             implicitIndicatorHeight + topPadding + bottomPadding)
    padding: 8
    spacing: 16
    font: M3Style.bodyLarge

    indicator: Rectangle {
        id: track

        readonly property real thumbCenter: 16 + control.visualPosition * (width - 32)

        implicitWidth: 52
        implicitHeight: 32
        x: control.text ? (control.mirrored ? control.width - width - control.rightPadding : control.leftPadding)
                        : control.leftPadding + (control.availableWidth - width) / 2
        y: control.topPadding + (control.availableHeight - height) / 2
        radius: height / 2
        color: control.checked
               ? (control.enabled ? M3Theme.primary
                                  : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContainerOpacity))
               : (control.enabled ? M3Theme.surfaceContainerHighest
                                  : M3Style.alpha(M3Theme.surfaceContainerHighest, M3Style.disabledContainerOpacity))
        border.width: control.checked ? 0 : 2
        border.color: control.enabled ? M3Theme.outline
                                      : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContainerOpacity)

        StateLayer {
            width: 40
            height: 40
            radius: 20
            x: track.thumbCenter - 20
            y: (track.height - height) / 2
            color: control.checked ? M3Theme.primary : M3Theme.onSurface
            active: control.enabled
            hovered: control.hovered
            pressed: control.pressed
            focused: control.visualFocus
        }

        Rectangle {
            id: thumb

            readonly property real size: control.pressed ? 28 : control.checked ? 24 : 16

            width: thumb.size
            height: thumb.size
            radius: thumb.size / 2
            x: track.thumbCenter - thumb.size / 2
            y: (track.height - thumb.size) / 2
            color: control.checked
                   ? (control.enabled ? M3Theme.onPrimary : M3Theme.surface)
                   : (control.enabled ? (control.hovered ? M3Theme.onSurfaceVariant : M3Theme.outline)
                                      : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity))
            Behavior on width {
                NumberAnimation { duration: M3Style.durationShort4; easing.type: Easing.OutCubic }
            }
            Behavior on height {
                NumberAnimation { duration: M3Style.durationShort4; easing.type: Easing.OutCubic }
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
