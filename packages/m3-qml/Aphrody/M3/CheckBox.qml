// SPDX-License-Identifier: Apache-2.0
// M3 checkbox: 18 dp box with 2 dp corners inside a 40 dp state layer.
import QtQuick
import QtQuick.Shapes
import QtQuick.Templates as T
import Aphrody.M3

T.CheckBox {
    id: control

    readonly property bool marked: control.checkState !== Qt.Unchecked
    readonly property color accent: control.enabled
        ? M3Theme.primary : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
    readonly property color markColor: control.enabled ? M3Theme.onPrimary : M3Theme.surface

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
            color: control.marked ? M3Theme.primary : M3Theme.onSurface
            active: control.enabled
            hovered: control.hovered
            pressed: control.pressed
            focused: control.visualFocus
        }

        Rectangle {
            anchors.centerIn: parent
            width: 18
            height: 18
            radius: 2
            color: control.marked ? control.accent : "transparent"
            border.width: control.marked ? 0 : 2
            border.color: control.enabled ? M3Theme.onSurfaceVariant
                                          : M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)

            Shape {
                anchors.fill: parent
                visible: control.checkState === Qt.Checked
                preferredRendererType: Shape.CurveRenderer

                ShapePath {
                    strokeColor: control.markColor
                    strokeWidth: 2
                    fillColor: "transparent"
                    capStyle: ShapePath.FlatCap
                    joinStyle: ShapePath.MiterJoin
                    PathPolyline { path: [Qt.point(4, 9), Qt.point(7.5, 12.5), Qt.point(14, 6)] }
                }
            }

            Rectangle {
                visible: control.checkState === Qt.PartiallyChecked
                anchors.centerIn: parent
                width: 10
                height: 2
                color: control.markColor
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
