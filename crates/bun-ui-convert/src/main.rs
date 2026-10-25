// SPDX-License-Identifier: Apache-2.0
//! `m3-convert`: constrained Material 3 TSX/JSX + CSS to GtkBuilder XML, QML and egui code.
//! Fails closed: any construct outside the subset is a positioned error and nothing is written.

mod css;
mod diag;
mod egui;
mod gtk;
mod ir;
mod qml;
mod tsx;

use std::path::{Path, PathBuf};
use std::process::ExitCode;

const USAGE: &str = "usage: m3-convert [--target gtk,qml,egui|all] [--out-dir DIR] [--check] [--json] <input.tsx>...

Converts one stateless Material 3 component per file (JSX elements from @aphrody/m3-baseui or
material-web, plus div/span/p/h1-h6/img with className or style) into:
  gtk   <stem>.ui (GtkBuilder, GTK 4.16 + libadwaita 1.6) and <stem>.gtk.css when needed
  qml   <Component>.qml (Qt Quick Controls Material + Kirigami)
  egui  <stem>_egui.rs (egui 0.32+ function, state struct and actions trait)

  --check     validate only, write nothing
  --json      print diagnostics as JSON lines
Exit status: 0 success, 1 unsupported input (diagnostics on stderr), 2 usage or I/O error.";

struct Opts {
    gtk: bool,
    qml: bool,
    egui: bool,
    out_dir: Option<PathBuf>,
    check: bool,
    json: bool,
    inputs: Vec<PathBuf>,
}

fn parse_args() -> Result<Opts, String> {
    let mut o = Opts { gtk: true, qml: true, egui: true, out_dir: None, check: false, json: false, inputs: Vec::new() };
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match a.as_str() {
            "-h" | "--help" => return Err(String::new()),
            "-t" | "--target" => {
                let v = args.next().ok_or("--target needs a value")?;
                o.gtk = false;
                o.qml = false;
                o.egui = false;
                for t in v.split(',') {
                    match t.trim() {
                        "gtk" => o.gtk = true,
                        "qml" | "qt" => o.qml = true,
                        "egui" => o.egui = true,
                        "all" => {
                            o.gtk = true;
                            o.qml = true;
                            o.egui = true;
                        }
                        other => return Err(format!("unknown target `{other}`")),
                    }
                }
            }
            "-o" | "--out-dir" => o.out_dir = Some(args.next().ok_or("--out-dir needs a value")?.into()),
            "--check" => o.check = true,
            "--json" => o.json = true,
            s if s.starts_with('-') => return Err(format!("unknown option `{s}`")),
            s => o.inputs.push(s.into()),
        }
    }
    if o.inputs.is_empty() {
        return Err("no input files".into());
    }
    Ok(o)
}

fn write(path: &Path, text: &str) -> Result<(), String> {
    std::fs::write(path, text).map_err(|e| format!("cannot write {}: {e}", path.display()))?;
    eprintln!("wrote {}", path.display());
    Ok(())
}

fn main() -> ExitCode {
    let opts = match parse_args() {
        Ok(o) => o,
        Err(e) => {
            if !e.is_empty() {
                eprintln!("m3-convert: {e}");
            }
            eprintln!("{USAGE}");
            return ExitCode::from(2);
        }
    };
    let mut failed = false;
    for input in &opts.inputs {
        let src = match std::fs::read_to_string(input) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("m3-convert: cannot read {}: {e}", input.display());
                return ExitCode::from(2);
            }
        };
        let doc = match tsx::lower(input, &src) {
            Ok(d) => d,
            Err(diags) => {
                for d in &diags {
                    if opts.json {
                        eprintln!("{}", d.to_json());
                    } else {
                        eprintln!("{d}");
                    }
                }
                eprintln!("m3-convert: {}: {} error(s); no output written", input.display(), diags.len());
                failed = true;
                continue;
            }
        };
        if opts.check {
            eprintln!("ok {}", input.display());
            continue;
        }
        let dir = opts.out_dir.clone().unwrap_or_else(|| input.parent().map(Path::to_path_buf).unwrap_or_default());
        let stem = input.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| "out".into());
        let result = (|| -> Result<(), String> {
            if opts.gtk {
                let out = gtk::emit(&doc);
                write(&dir.join(format!("{stem}.ui")), &out.ui)?;
                if let Some(css) = out.css {
                    write(&dir.join(format!("{stem}.gtk.css")), &css)?;
                }
            }
            if opts.qml {
                write(&dir.join(format!("{}.qml", doc.component)), &qml::emit(&doc))?;
            }
            if opts.egui {
                write(&dir.join(format!("{stem}_egui.rs")), &egui::emit(&doc))?;
            }
            Ok(())
        })();
        if let Err(e) = result {
            eprintln!("m3-convert: {e}");
            return ExitCode::from(2);
        }
    }
    if failed { ExitCode::from(1) } else { ExitCode::SUCCESS }
}
