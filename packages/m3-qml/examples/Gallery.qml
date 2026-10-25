// SPDX-License-Identifier: Apache-2.0
// QT_QUICK_CONTROLS_STYLE=Aphrody.M3 QML_IMPORT_PATH=packages/m3-qml qml6 packages/m3-qml/examples/Gallery.qml
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Aphrody.M3 as M3

ApplicationWindow {
    id: window
    width: 960
    height: 640
    visible: true
    title: "Bun UI M3 for Qt Quick"
    color: M3.M3Theme.surface

    RowLayout {
        anchors.fill: parent
        spacing: 0

        M3.NavigationRail {
            id: rail
            Layout.fillHeight: true
            model: [
                { text: "Buttons", icon: "input-mouse" },
                { text: "Inputs", icon: "edit" },
                { text: "Surfaces", icon: "view-grid" }
            ]
        }

        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            ToolBar {
                Layout.fillWidth: true
                RowLayout {
                    anchors.fill: parent
                    ToolButton { icon.name: "open-menu"; onClicked: menu.open() }
                    Label {
                        text: window.title
                        font: M3.M3Style.titleLarge
                        color: M3.M3Theme.onSurface
                        Layout.fillWidth: true
                    }
                    ToolButton {
                        icon.name: "weather-clear-night"
                        checkable: true
                        checked: M3.M3Theme.dark
                        onToggled: M3.M3Theme.dark = checked
                    }
                }
                Menu {
                    id: menu
                    MenuItem { text: "Open dialog"; onTriggered: dialog.open() }
                    MenuItem { text: "Show snackbar"; onTriggered: snackbar.show("Message archived", "Undo") }
                    MenuItem { text: "Checkable"; checkable: true }
                }
            }

            TabBar {
                id: tabs
                Layout.fillWidth: true
                currentIndex: rail.currentIndex
                onCurrentIndexChanged: rail.currentIndex = currentIndex
                TabButton { text: "Buttons" }
                TabButton { text: "Inputs" }
                TabButton { text: "Surfaces" }
            }

            StackLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.margins: 24
                currentIndex: rail.currentIndex

                Flow {
                    spacing: 8
                    Button { text: "Filled"; highlighted: true }
                    Button { text: "Tonal" }
                    Button { text: "Outlined"; Component.onCompleted: variant = M3.M3Style.Outlined }
                    Button { text: "Elevated"; Component.onCompleted: variant = M3.M3Style.Elevated }
                    Button { text: "Text"; flat: true }
                    Button { text: "Disabled"; highlighted: true; enabled: false }
                    M3.Chip { text: "Filter chip" }
                    M3.Chip { text: "Assist chip"; checkable: false }
                }

                ColumnLayout {
                    spacing: 8
                    Switch { text: "Wi-Fi"; checked: true }
                    CheckBox { text: "Remember me"; checked: true }
                    CheckBox { text: "Partial"; tristate: true; checkState: Qt.PartiallyChecked }
                    RadioButton { text: "Option A"; checked: true }
                    RadioButton { text: "Option B" }
                    Slider { from: 0; to: 100; value: 40; Layout.preferredWidth: 280 }
                    TextField { placeholderText: "Filled field"; Layout.preferredWidth: 280 }
                    TextField {
                        placeholderText: "Outlined field"
                        Layout.preferredWidth: 280
                        Component.onCompleted: variant = M3.M3Style.OutlinedField
                    }
                    ProgressBar { value: 0.6; Layout.preferredWidth: 280 }
                    ProgressBar { indeterminate: true; Layout.preferredWidth: 280 }
                    BusyIndicator { running: true }
                }

                Flow {
                    spacing: 16
                    Pane {
                        width: 240
                        Label { text: "Elevated card"; font: M3.M3Style.titleMedium; color: M3.M3Theme.onSurface }
                    }
                    Pane {
                        width: 240
                        Component.onCompleted: variant = M3.M3Style.FilledCard
                        Label { text: "Filled card"; font: M3.M3Style.titleMedium; color: M3.M3Theme.onSurface }
                    }
                    Pane {
                        width: 240
                        Component.onCompleted: variant = M3.M3Style.OutlinedCard
                        Label { text: "Outlined card"; font: M3.M3Style.titleMedium; color: M3.M3Theme.onSurface }
                    }
                }
            }
        }
    }

    Dialog {
        id: dialog
        title: "Discard draft?"
        standardButtons: Dialog.Cancel | Dialog.Discard
        Label { text: "The draft will be deleted."; color: M3.M3Theme.onSurfaceVariant }
    }

    M3.Snackbar { id: snackbar }
}
