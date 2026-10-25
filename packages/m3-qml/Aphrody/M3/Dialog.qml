// SPDX-License-Identifier: Apache-2.0
// M3 basic dialog: extra-large corners, surface container high, level 3, scrim at 32 %.
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.Dialog {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding,
                            implicitHeaderWidth,
                            implicitFooterWidth)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding
                             + (implicitHeaderHeight > 0 ? implicitHeaderHeight + spacing : 0)
                             + (implicitFooterHeight > 0 ? implicitFooterHeight + spacing : 0))

    padding: 24
    topPadding: 16
    font: M3Style.bodyMedium
    anchors.centerIn: parent
    modal: true

    enter: Transition {
        NumberAnimation { property: "opacity"; from: 0; to: 1; duration: M3Style.durationShort4 }
        NumberAnimation {
            property: "scale"; from: 0.9; to: 1; duration: M3Style.durationMedium2
            easing.type: Easing.BezierSpline; easing.bezierCurve: M3Style.easingEmphasizedDecelerate
        }
    }
    exit: Transition {
        NumberAnimation { property: "opacity"; from: 1; to: 0; duration: M3Style.durationShort4 }
    }

    background: Rectangle {
        implicitWidth: 280
        radius: M3Style.cornerExtraLarge
        color: M3Theme.surfaceContainerHigh
        layer.enabled: true
        layer.effect: Elevation { level: 3 }
    }

    header: Text {
        visible: control.title.length > 0
        text: control.title
        font: M3Style.headlineSmall
        color: M3Theme.onSurface
        elide: Text.ElideRight
        wrapMode: Text.Wrap
        leftPadding: 24
        rightPadding: 24
        topPadding: 24
    }

    T.Overlay.modal: Rectangle {
        color: M3Style.alpha(M3Theme.scrim, 0.32)
        Behavior on opacity { NumberAnimation { duration: M3Style.durationShort4 } }
    }

    T.Overlay.modeless: Rectangle {
        color: "transparent"
    }
}
