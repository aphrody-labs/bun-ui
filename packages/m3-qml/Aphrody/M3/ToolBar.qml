// SPDX-License-Identifier: Apache-2.0
// M3 top app bar container: 64 dp, surface (surface container when `scrolled`).
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.ToolBar {
    id: control

    property bool scrolled: false

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)
    leftPadding: 4
    rightPadding: 4
    font: M3Style.titleLarge

    background: Rectangle {
        implicitHeight: 64
        color: control.scrolled ? M3Theme.surfaceContainer : M3Theme.surface
        Behavior on color { ColorAnimation { duration: M3Style.durationShort4 } }
    }
}
