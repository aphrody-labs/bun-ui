// SPDX-License-Identifier: Apache-2.0
// M3 elevation as a layer effect: `layer.enabled: true; layer.effect: Elevation { level: 1 }`.
import QtQuick
import QtQuick.Effects
import Aphrody.M3

MultiEffect {
    property int level: 1
    readonly property real dp: M3Style.elevationDp[Math.max(0, Math.min(5, level))]

    autoPaddingEnabled: true
    shadowEnabled: dp > 0
    shadowColor: M3Theme.shadow
    shadowOpacity: 0.3 + dp / 80
    shadowBlur: Math.min(1, dp / 12)
    blurMax: 32
    shadowVerticalOffset: dp > 0 ? Math.max(1, dp / 2) : 0
    shadowHorizontalOffset: 0
}
