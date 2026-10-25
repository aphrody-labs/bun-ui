# Chrome QA: https://aphrody.com/ (2026-10-25)

Claude in Chrome, desktop viewport 1638 px, real Chrome session. Scope: WebOS desktop,
launcher, Files.

## Healthy

- No console errors or exceptions; no failed network requests.
- 61 interactive controls, all with an accessible name; Material Symbols glyphs are
  `aria-hidden`.
- DOM content loaded in about 0.94 s; `lang="en"`; 5 landmarks.

## Defects

| Severity | Where | Defect | Fix area |
| --- | --- | --- | --- |
| P1 | Launcher, "Create" section | All 13 Craft studios (PDF, Documents, Tables, Slides, Images, Vectors, Layout, Interface layouts, Audio, CAD, Video, Compositing, Photo processing) share one generic grid icon, so they cannot be told apart | `apps/webos` app catalog icons; `packages/assets` / `m3-icons` per-studio symbols |
| P1 | Files | Status bar reads "memory only": the home folder is not persisted (`navigator.storage.persisted()` is false) although OPFS is available | `apps/webos/src/apps/files*`, `packages/webos-wasm` OPFS mount; request persistent storage |
| P1 | Desktop | Empty desktop: gradient background only, no wallpaper, desktop items or widgets | immersive desktop (Bun UI plan phase 15) |
| P2 | Files toolbar, dock "Files" button | No visible focus indicator (2 of the first 40 focusable controls) | `apps/webos/src/styles.css`, `apps/files.css` (Codex task `focus`) |
| P2 | Files | Folder icons are fixed blue, outside the M3 scheme of the rest of the shell | file-kind icons should use `--md-sys-color-primary` / tonal roles |
| P2 | Files sidebar | Library entries are truncated ("Space: Aphrod...") with no visible full name | tooltip or wrapping per `truncation-strategy` |
| P2 | Launcher | The dock stays visible under the launcher overlay's bottom edge | launcher scrim / z-index scale |
| P2 | Document | No `h1` on the page | add a visually hidden `h1` for the desktop |

Not covered in this pass: other routes (/apps, /os, /play, studios), mobile viewport,
light theme, Claude in Chrome tooling defects (none hit in this session).
