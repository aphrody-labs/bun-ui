// SPDX-License-Identifier: Apache-2.0
//! Material Symbols as GTK symbolic icons.
//!
//! GTK recolors icons whose name ends in `-symbolic`. [`install_material_symbols`] copies the
//! outlined 24 px Material Symbols SVGs (Apache-2.0, google/material-design-icons) into a cache
//! directory as `m3-<symbol>-symbolic.svg` and adds it to the display icon theme search path,
//! so `gtk::Image::from_icon_name(&icon_name("home"))` works with any theme.
//!
//! Accepted source layouts: flat `<symbol>.svg`, `<symbol>_24px.svg`, and the upstream tree
//! `symbols/web/<symbol>/materialsymbolsoutlined/<symbol>_24px.svg`. Filled (`fill1`) and
//! other optical sizes are skipped.

use std::path::{Path, PathBuf};
use std::{env, fs, io};

use gtk::gdk;

/// Prefix of every installed icon name.
pub const ICON_PREFIX: &str = "m3-";

/// Environment variable naming the Material Symbols SVG directory.
pub const SYMBOLS_DIR_ENV: &str = "APHRODY_M3_SYMBOLS_DIR";

/// Icon name of a Material Symbol (`home` -> `m3-home-symbolic`).
#[must_use]
pub fn icon_name(symbol: &str) -> String {
    format!("{ICON_PREFIX}{symbol}-symbolic")
}

/// Symbol name for an SVG file name, or `None` for filled or non-24 px variants.
fn symbol_of(file_name: &str) -> Option<&str> {
    let stem = file_name.strip_suffix(".svg")?;
    if stem.contains("fill1") {
        return None;
    }
    match stem.rsplit_once('_') {
        Some((name, "24px")) => Some(name),
        Some((_, size)) if size.ends_with("px") => None,
        _ => Some(stem),
    }
}

fn collect(dir: &Path, out: &mut Vec<(String, PathBuf)>) -> io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let kind = entry.file_type()?;
        if kind.is_dir() {
            let name = entry.file_name();
            // Upstream trees ship rounded and sharp siblings; keep outlined only.
            if name == "materialsymbolsrounded" || name == "materialsymbolssharp" {
                continue;
            }
            collect(&path, out)?;
        } else if let Some(symbol) = path.file_name().and_then(|n| n.to_str()).and_then(symbol_of) {
            out.push((symbol.to_owned(), path));
        }
    }
    Ok(())
}

/// Default source directory: `$APHRODY_M3_SYMBOLS_DIR`, else the first
/// `$XDG_DATA_HOME|$XDG_DATA_DIRS/material-symbols` that exists.
#[must_use]
pub fn default_symbols_dir() -> Option<PathBuf> {
    if let Some(dir) = env::var_os(SYMBOLS_DIR_ENV) {
        return Some(PathBuf::from(dir));
    }
    let home = env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")));
    let dirs = env::var("XDG_DATA_DIRS").unwrap_or_else(|_| "/usr/local/share:/usr/share".into());
    home.into_iter()
        .chain(dirs.split(':').filter(|d| !d.is_empty()).map(PathBuf::from))
        .map(|d| d.join("material-symbols"))
        .find(|d| d.is_dir())
}

/// Cache directory holding the installed symbolic icons.
#[must_use]
pub fn cache_dir() -> PathBuf {
    env::var_os("XDG_CACHE_HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("HOME").map(|h| PathBuf::from(h).join(".cache")))
        .unwrap_or_else(env::temp_dir)
        .join("aphrody-m3-gtk/icons")
}

/// Copies the Material Symbols under `source` into [`cache_dir`] as symbolic icons and adds
/// that directory to the icon theme of `display`. Returns the number of icons available.
///
/// # Errors
///
/// Fails when `source` cannot be read or the cache cannot be written.
pub fn install_material_symbols(display: &gdk::Display, source: &Path) -> io::Result<usize> {
    let mut found = Vec::new();
    collect(source, &mut found)?;
    let cache = cache_dir();
    fs::create_dir_all(&cache)?;
    for (symbol, path) in &found {
        let target = cache.join(format!("{}.svg", icon_name(symbol)));
        let fresh = match (fs::metadata(path), fs::metadata(&target)) {
            (Ok(src), Ok(dst)) => src.len() != dst.len(),
            _ => true,
        };
        if fresh {
            fs::copy(path, &target)?;
        }
    }
    gtk::IconTheme::for_display(display).add_search_path(&cache);
    Ok(found.len())
}

/// Adds a GResource path holding `m3-*-symbolic.svg` icons (for bundled apps).
pub fn install_material_symbols_resource(display: &gdk::Display, resource_path: &str) {
    gtk::IconTheme::for_display(display).add_resource_path(resource_path);
}

/// Whether the display icon theme resolves `symbol`.
#[must_use]
pub fn has_symbol(display: &gdk::Display, symbol: &str) -> bool {
    gtk::IconTheme::for_display(display).has_icon(&icon_name(symbol))
}
