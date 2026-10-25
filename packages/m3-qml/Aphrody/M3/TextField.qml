// SPDX-License-Identifier: Apache-2.0
// M3 text field, filled (default) or outlined, with a floating label taken from placeholderText.
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.TextField {
    id: control

    property int variant: M3Style.FilledField
    readonly property bool filled: control.variant === M3Style.FilledField
    readonly property bool floating: control.activeFocus || control.length > 0 || control.preeditText.length > 0
    readonly property color accent: !control.enabled
        ? M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
        : control.activeFocus ? M3Theme.primary : M3Theme.onSurfaceVariant

    implicitWidth: implicitBackgroundWidth + leftInset + rightInset
                   || Math.max(contentWidth, label.implicitWidth) + leftPadding + rightPadding
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)

    leftPadding: 16
    rightPadding: 16
    topPadding: control.filled ? 24 : 16
    bottomPadding: control.filled ? 8 : 16

    font: M3Style.bodyLarge
    color: control.enabled ? M3Theme.onSurface : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
    selectionColor: M3Style.alpha(M3Theme.primary, 0.4)
    selectedTextColor: M3Theme.onSurface
    placeholderTextColor: M3Theme.onSurfaceVariant
    verticalAlignment: TextInput.AlignVCenter
    cursorDelegate: Rectangle {
        width: 2
        color: M3Theme.primary
        visible: control.activeFocus && control.cursorVisible
    }

    Text {
        id: label
        x: control.leftPadding
        y: control.floating ? (control.filled ? 8 : -height / 2) : (control.height - height) / 2
        text: control.placeholderText
        font: control.floating ? M3Style.bodySmall : M3Style.bodyLarge
        color: control.accent
        leftPadding: control.filled ? 0 : 4
        rightPadding: control.filled ? 0 : 4

        Rectangle {
            visible: !control.filled && control.floating
            anchors.fill: parent
            z: -1
            color: M3Theme.surface
        }

        Behavior on y {
            NumberAnimation { duration: M3Style.durationShort4; easing.type: Easing.OutCubic }
        }
    }

    background: Rectangle {
        implicitWidth: 210
        implicitHeight: 56
        color: control.filled ? (control.enabled ? M3Theme.surfaceContainerHighest
                                                 : M3Style.alpha(M3Theme.onSurface, 0.04))
                              : "transparent"
        topLeftRadius: M3Style.cornerExtraSmall
        topRightRadius: M3Style.cornerExtraSmall
        bottomLeftRadius: control.filled ? 0 : M3Style.cornerExtraSmall
        bottomRightRadius: control.filled ? 0 : M3Style.cornerExtraSmall
        border.width: control.filled ? 0 : control.activeFocus ? 2 : 1
        border.color: !control.enabled ? M3Style.alpha(M3Theme.onSurface, M3Style.disabledContainerOpacity)
                                       : control.activeFocus ? M3Theme.primary : M3Theme.outline

        StateLayer {
            anchors.fill: parent
            visible: control.filled
            topLeftRadius: parent.topLeftRadius
            topRightRadius: parent.topRightRadius
            color: M3Theme.onSurface
            active: control.enabled
            hovered: control.hovered
        }

        Rectangle {
            visible: control.filled
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            height: control.activeFocus ? 2 : 1
            color: control.accent
        }
    }
}
