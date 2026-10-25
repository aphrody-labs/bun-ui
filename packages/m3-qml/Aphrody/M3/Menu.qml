// SPDX-License-Identifier: Apache-2.0
// M3 menu: extra-small corners, surface container, level 2, 8 dp vertical padding.
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.Menu {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)
    topPadding: 8
    bottomPadding: 8
    margins: 0
    overlap: 1
    font: M3Style.labelLarge

    delegate: MenuItem {}

    enter: Transition {
        NumberAnimation { property: "opacity"; from: 0; to: 1; duration: M3Style.durationShort4 }
    }
    exit: Transition {
        NumberAnimation { property: "opacity"; from: 1; to: 0; duration: M3Style.durationShort2 }
    }

    contentItem: ListView {
        implicitHeight: contentHeight
        model: control.contentModel
        interactive: Window.window ? contentHeight + control.topPadding + control.bottomPadding > Window.window.height : false
        clip: true
        currentIndex: control.currentIndex
    }

    background: Rectangle {
        implicitWidth: 112
        implicitHeight: 48
        radius: M3Style.cornerExtraSmall
        color: M3Theme.surfaceContainer
        layer.enabled: true
        layer.effect: Elevation { level: 2 }
    }
}
