// SPDX-License-Identifier: Apache-2.0
// M3 primary tab bar: surface container with an outline-variant divider.
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.TabBar {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)
    spacing: 0

    contentItem: ListView {
        model: control.contentModel
        currentIndex: control.currentIndex
        spacing: control.spacing
        orientation: ListView.Horizontal
        boundsBehavior: Flickable.StopAtBounds
        flickableDirection: Flickable.AutoFlickIfNeeded
        snapMode: ListView.SnapToItem
        highlightMoveDuration: M3Style.durationMedium2
        highlightRangeMode: ListView.ApplyRange
        preferredHighlightBegin: 48
        preferredHighlightEnd: width - 48
    }

    background: Rectangle {
        implicitHeight: 48
        color: M3Theme.surface

        Rectangle {
            anchors.left: parent.left
            anchors.right: parent.right
            y: control.position === T.TabBar.Footer ? 0 : parent.height - height
            height: 1
            color: M3Theme.outlineVariant
        }
    }
}
