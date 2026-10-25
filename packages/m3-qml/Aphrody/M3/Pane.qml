// SPDX-License-Identifier: Apache-2.0
// Pane as an M3 card: elevated (default), filled or outlined; medium corners, 16 dp padding.
import QtQuick
import QtQuick.Templates as T
import Aphrody.M3

T.Pane {
    id: control

    property int variant: M3Style.ElevatedCard

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)
    padding: 16
    font: M3Style.bodyMedium

    background: Rectangle {
        radius: M3Style.cornerMedium
        color: {
            switch (control.variant) {
            case M3Style.FilledCard: return M3Theme.surfaceContainerHighest
            case M3Style.OutlinedCard: return M3Theme.surface
            default: return M3Theme.surfaceContainerLow
            }
        }
        border.width: control.variant === M3Style.OutlinedCard ? 1 : 0
        border.color: M3Theme.outlineVariant
        layer.enabled: control.variant === M3Style.ElevatedCard
        layer.effect: Elevation { level: 1 }
    }
}
