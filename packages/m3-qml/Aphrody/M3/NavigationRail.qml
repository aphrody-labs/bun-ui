// SPDX-License-Identifier: Apache-2.0
// M3 navigation rail: 80 dp column of destinations with an optional header (menu button, FAB).
//
//   NavigationRail {
//       model: [{ text: "Home", icon: "qrc:/icons/home.svg" }, { text: "Files", icon: "folder" }]
//       onActivated: index => stack.currentIndex = index
//   }
//
// `icon` is a URL (contains ":" or "/") or an icon theme name.
import QtQuick
import Aphrody.M3

Rectangle {
    id: rail

    property var model: []
    property int currentIndex: 0
    property Component header: null
    signal activated(int index)

    implicitWidth: 80
    color: M3Theme.surface

    Column {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.top: parent.top
        topPadding: 44
        spacing: 12

        Loader {
            anchors.horizontalCenter: parent.horizontalCenter
            active: rail.header !== null
            sourceComponent: rail.header
        }

        Repeater {
            model: rail.model

            NavigationRailItem {
                required property var modelData
                required property int index

                text: modelData.text ?? ""
                icon.source: /[:\/]/.test(modelData.icon ?? "") ? modelData.icon : ""
                icon.name: /[:\/]/.test(modelData.icon ?? "") ? "" : (modelData.icon ?? "")
                checked: rail.currentIndex === index
                onClicked: {
                    rail.currentIndex = index
                    rail.activated(index)
                }
            }
        }
    }
}
