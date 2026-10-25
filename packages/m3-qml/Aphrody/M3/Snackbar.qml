// SPDX-License-Identifier: Apache-2.0
// M3 snackbar: inverse surface, extra-small corners, level 3, optional action, auto-dismiss.
//
//   Snackbar { id: snackbar }
//   snackbar.show("Message archived", "Undo")
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.Popup {
    id: control

    property string text
    property string actionText
    property int timeout: 4000
    signal actionTriggered()

    function show(message, action) {
        control.text = message
        control.actionText = action ?? ""
        control.open()
        timer.restart()
    }

    parent: T.Overlay.overlay
    x: parent ? (parent.width - width) / 2 : 0
    y: parent ? parent.height - height - 16 : 0
    width: parent ? Math.min(parent.width - 32, Math.max(344, implicitWidth)) : implicitWidth
    leftPadding: 16
    rightPadding: control.actionText.length > 0 ? 8 : 16
    topPadding: 4
    bottomPadding: 4
    closePolicy: T.Popup.CloseOnEscape
    font: M3Style.bodyMedium

    enter: Transition {
        NumberAnimation { property: "opacity"; from: 0; to: 1; duration: M3Style.durationShort4 }
    }
    exit: Transition {
        NumberAnimation { property: "opacity"; from: 1; to: 0; duration: M3Style.durationShort2 }
    }

    Timer {
        id: timer
        interval: control.timeout
        onTriggered: control.close()
    }

    contentItem: Item {
        implicitWidth: message.implicitWidth + (action.visible ? action.implicitWidth + 8 : 0)
        implicitHeight: Math.max(40, message.implicitHeight, action.visible ? action.implicitHeight : 0)

        Text {
            id: message
            anchors.left: parent.left
            anchors.right: action.visible ? action.left : parent.right
            anchors.rightMargin: action.visible ? 8 : 0
            anchors.verticalCenter: parent.verticalCenter
            text: control.text
            font: control.font
            color: M3Theme.inverseOnSurface
            wrapMode: Text.Wrap
            maximumLineCount: 2
            elide: Text.ElideRight
        }

        T.AbstractButton {
            id: action
            visible: control.actionText.length > 0
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            implicitWidth: label.implicitWidth + 24
            implicitHeight: 40
            onClicked: {
                control.actionTriggered()
                control.close()
            }

            contentItem: Text {
                id: label
                text: control.actionText
                font: M3Style.labelLarge
                color: M3Theme.inversePrimary
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }

            background: StateLayer {
                radius: height / 2
                color: M3Theme.inversePrimary
                active: action.enabled
                hovered: action.hovered
                pressed: action.down
                focused: action.visualFocus
            }
        }
    }

    background: Rectangle {
        implicitHeight: 48
        radius: M3Style.cornerExtraSmall
        color: M3Theme.inverseSurface
        layer.enabled: true
        layer.effect: Elevation { level: 3 }
    }
}
