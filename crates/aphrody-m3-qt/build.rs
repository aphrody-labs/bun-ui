// SPDX-License-Identifier: Apache-2.0
//! Generates the `Aphrody.M3.Native` QML module (M3Scheme) and compiles the QPalette filler.
//! Requires Qt 6.6+ (Core, Gui, Qml) found through `QMAKE` or `qmake6`/`qmake` on `PATH`.

use cxx_qt_build::{CxxQtBuilder, QmlModule};

fn main() {
    CxxQtBuilder::new_qml_module(QmlModule::new("Aphrody.M3.Native"))
        .qt_module("Gui")
        .files(["src/scheme.rs"])
        .cpp_file("cpp/m3palette.cpp")
        .build();
}
