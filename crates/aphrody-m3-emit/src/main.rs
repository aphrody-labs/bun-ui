// SPDX-License-Identifier: Apache-2.0
//! `m3-emit --seed '#6750a4' [--variant tonal-spot] [--contrast 0] [--target gtk|all] [--out DIR]`

use aphrody_m3_emit::{Target, Theme, emit};
use aphrody_m3_tokens::scheme::Variant;
use std::path::PathBuf;
use std::process::ExitCode;

fn parse_seed(text: &str) -> Option<u32> {
    let hex = text.trim_start_matches('#');
    (hex.len() == 6).then(|| u32::from_str_radix(hex, 16).ok().map(|rgb| 0xff00_0000 | rgb))?
}

fn main() -> ExitCode {
    let mut seed = 0xff67_50a4;
    let mut variant = Variant::TonalSpot;
    let mut contrast = 0.0;
    let mut target = None;
    let mut out: Option<PathBuf> = None;
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        let value = args.next();
        let ok = match (arg.as_str(), value.as_deref()) {
            ("--seed", Some(v)) => parse_seed(v).map(|s| seed = s).is_some(),
            ("--variant", Some(v)) => Variant::from_name(v).map(|x| variant = x).is_some(),
            ("--contrast", Some(v)) => v.parse().map(|x| contrast = x).is_ok(),
            ("--target", Some("all")) => {
                target = None;
                true
            }
            ("--target", Some(v)) => Target::from_name(v).map(|t| target = Some(t)).is_some(),
            ("--out", Some(v)) => {
                out = Some(PathBuf::from(v));
                true
            }
            _ => false,
        };
        if !ok {
            eprintln!("usage: m3-emit --seed '#rrggbb' [--variant NAME] [--contrast N] [--target NAME|all] [--out DIR]");
            return ExitCode::from(2);
        }
    }
    let theme = Theme { seed, variant, contrast };
    let targets: Vec<Target> = target.map_or_else(|| Target::ALL.to_vec(), |t| vec![t]);
    for t in targets {
        let text = emit(&theme, t);
        match &out {
            Some(dir) => {
                if let Err(e) = std::fs::create_dir_all(dir).and_then(|()| std::fs::write(dir.join(t.file_name()), text)) {
                    eprintln!("m3-emit: {}: {e}", t.name());
                    return ExitCode::FAILURE;
                }
            }
            None => print!("{text}"),
        }
    }
    ExitCode::SUCCESS
}
