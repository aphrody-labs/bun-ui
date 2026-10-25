// SPDX-License-Identifier: Apache-2.0
// M3 circular progress indicator (indeterminate): 48 dp, 4 dp primary arc.
import QtQuick
import QtQuick.Shapes
import QtQuick.Templates as T
import Aphrody.M3

T.BusyIndicator {
    id: control

    implicitWidth: implicitContentWidth + leftPadding + rightPadding
    implicitHeight: implicitContentHeight + topPadding + bottomPadding
    padding: 4

    contentItem: Item {
        id: spinner
        implicitWidth: 48
        implicitHeight: 48
        opacity: control.running ? 1 : 0
        visible: opacity > 0
        Behavior on opacity { NumberAnimation { duration: M3Style.durationShort4 } }

        property real sweep: 90

        Shape {
            anchors.fill: parent
            preferredRendererType: Shape.CurveRenderer

            ShapePath {
                strokeColor: M3Theme.primary
                strokeWidth: 4
                fillColor: "transparent"
                capStyle: ShapePath.RoundCap

                PathAngleArc {
                    centerX: spinner.width / 2
                    centerY: spinner.height / 2
                    radiusX: spinner.width / 2 - 2
                    radiusY: spinner.height / 2 - 2
                    startAngle: -90
                    sweepAngle: spinner.sweep
                }
            }
        }

        RotationAnimator on rotation {
            running: control.running && control.visible
            loops: Animation.Infinite
            from: 0
            to: 360
            duration: 1568
        }

        SequentialAnimation on sweep {
            running: control.running && control.visible
            loops: Animation.Infinite
            NumberAnimation {
                from: 10; to: 270; duration: 667
                easing.type: Easing.BezierSpline; easing.bezierCurve: M3Style.easingStandard
            }
            NumberAnimation {
                from: 270; to: 10; duration: 667
                easing.type: Easing.BezierSpline; easing.bezierCurve: M3Style.easingStandard
            }
        }
    }
}
