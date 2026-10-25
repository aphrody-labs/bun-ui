// SPDX-License-Identifier: Apache-2.0
// M3 state layer: the content color over the container at the hover/focus/pressed opacity.
import QtQuick
import Aphrody.M3

Rectangle {
    id: layer

    property bool active: true
    property bool hovered: false
    property bool pressed: false
    property bool focused: false

    opacity: M3Style.stateOpacity(layer.active, layer.pressed, layer.focused, layer.hovered)
    Behavior on opacity {
        NumberAnimation { duration: M3Style.durationShort2 }
    }
}
