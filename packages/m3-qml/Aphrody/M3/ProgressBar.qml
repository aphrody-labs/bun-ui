// SPDX-License-Identifier: Apache-2.0
// M3 linear progress indicator: 4 dp primary indicator on a secondary-container track.
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.ProgressBar {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding)

    contentItem: Item {
        implicitWidth: 240
        implicitHeight: 4
        clip: true

        Rectangle {
            visible: !control.indeterminate
            x: control.mirrored ? parent.width - width : 0
            width: control.position * parent.width
            height: parent.height
            radius: height / 2
            color: M3Theme.primary
        }

        Rectangle {
            id: bar
            visible: control.indeterminate
            width: parent.width * 0.4
            height: parent.height
            radius: height / 2
            color: M3Theme.primary

            XAnimator on x {
                running: control.indeterminate && control.visible
                loops: Animation.Infinite
                from: -bar.width
                to: bar.parent ? bar.parent.width : 0
                duration: 1500
                easing.type: Easing.BezierSpline
                easing.bezierCurve: M3Style.easingStandard
            }
        }
    }

    background: Rectangle {
        implicitWidth: 240
        implicitHeight: 4
        y: (control.height - height) / 2
        height: 4
        radius: height / 2
        color: M3Theme.secondaryContainer
    }
}
