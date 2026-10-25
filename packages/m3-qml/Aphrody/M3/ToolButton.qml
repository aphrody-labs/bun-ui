// SPDX-License-Identifier: Apache-2.0
// M3 standard icon button (40 dp, full corners); checked toggles use the primary color.
import QtQuick
import QtQuick.Templates as T
import QtQuick.Controls.impl
import Aphrody.M3

T.ToolButton {
    id: control

    readonly property color contentColor: !control.enabled
        ? M3Style.alpha(M3Theme.onSurface, M3Style.disabledContentOpacity)
        : control.checked ? M3Theme.primary : M3Theme.onSurfaceVariant

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding)
    padding: 12
    inset: 4
    spacing: 8
    icon.width: 24
    icon.height: 24
    icon.color: control.contentColor
    font: M3Style.labelLarge

    contentItem: IconLabel {
        spacing: control.spacing
        mirrored: control.mirrored
        display: control.display
        icon: control.icon
        text: control.text
        font: control.font
        color: control.contentColor
    }

    background: StateLayer {
        implicitWidth: 40
        implicitHeight: 40
        radius: height / 2
        color: control.contentColor
        active: control.enabled
        hovered: control.hovered
        pressed: control.down
        focused: control.visualFocus
    }
}
