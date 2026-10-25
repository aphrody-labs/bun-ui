# OS shells and compositors: reuse for Bun UI (deep research, 2026-10-25)

> Adversarially verified (3-vote) web research over 105 agents. Refuted claims were dropped; no WebAssembly (greenfield) or Windows (WSLg/Weston RDP) hosting claim survived verification, so those recommendations remain unverified.

## Question

How do modern OS UI stacks build their shell and low-level compositor, and what should a cross-platform Material 3 OS shell (Bun OS: Wayland/Hyprland-style compositor, selectable GNOME/KDE/COSMIC/M3 shells, also running in the browser via WebAssembly and on Win32) reuse? Cover, from official docs and source (2025-2026): (1) Linux/Wayland compositor architecture: Wayland core + wayland-protocols (layer-shell, xdg-shell, ext-* protocols), wlroots vs Smithay vs Hyprland's Aquamarine, Mutter/GNOME Shell (Clutter/St, JS shell), KWin/Plasma (QML shell), cosmic-comp + libcosmic/iced; (2) toolkit theming and shell UI docs: GTK 4/libadwaita, Qt 6 Quick/Kirigami, iced, egui, Material 3 (m3.material.io) and Google design system guidance; (3) Google's OS UIs: Android/AOSP SystemUI, launcher and SurfaceFlinger/HWComposer compositor, ChromeOS Ash shell + Aura/Exo (Wayland server in Chromium), Android desktop windowing, and Google's Android-based PC OS effort (reported 'Aluminium OS') — what is public; (4) lessons for one design-token/component contract across these shells, and for running a compositor/shell in WebAssembly (e.g., greenfield) and on Windows (WSLg/Weston RDP). Produce a cited report with concrete reuse recommendations.

## Summary

The stacks examined all draw the same line. A low-level layer turns display and input hardware into buffers and outputs, and a separate shell layer, often written in a higher-level language, decides window policy and draws system UI. On Linux, that low-level layer is a library you build on: Hyprland's Aquamarine (written from scratch and independent of wlroots since 0.42.0), Smithay (Rust building blocks with no built-in policy), or Mutter (a KMS/libinput compositor library with in-tree forks of Clutter and Cogl, hosted by GNOME Shell and by Gala). Shell surfaces such as panels, docks and wallpapers usually use the wlr-layer-shell protocol, which KWin also implements at version 5; Mutter does not. Google's equivalents are SurfaceFlinger plus the HWC HAL over BufferQueue on Android, and Exo on ChromeOS, a Wayland server inside the Aura shell that hosts both Android (ARC++) and Linux (Crostini) apps. Android's newer desktop windowing and connected-display sessions show the shell UI conventions Google uses, such as system-drawn caption controls and a bottom taskbar. For Bun OS, the evidence supports: Smithay as the base if the compositor is in Rust (Aquamarine if it stays close to Hyprland); layer-shell as the one cross-shell contract for panels, docks and wallpapers, with a separate path for GNOME/Mutter; the Exo idea of one embedded Wayland server hosting several app runtimes; and Material 3's three-level token model (md.ref, md.sys, md.comp) with Material Color Utilities as the single design-token source that every shell and toolkit adapter maps onto. No claims about WebAssembly (greenfield) or Windows (WSLg/Weston RDP) hosting survived verification, so recommendations there are unverified.

## Findings

### high confidence (vote 3-0)

Hyprland left wlroots starting with release 0.42.0. Its low-level backend (outputs, buffers, input over a DRM/tty session, or running nested in a window under another Wayland compositor) now lives in Aquamarine, a small library written from scratch. Its authors say it is not meant to compete with wlroots, and existing Wayland clients keep working. Rendering, through Hyprland's OpenGL renderer, stays in Hyprland, since Aquamarine does not depend on any particular rendering API. Reuse: if Bun OS wants Hyprland-style behaviour, Aquamarine's design is a good model for its backend layer. The same backend can run nested (useful for development and for hosted environments) or directly on DRM.

Sources: <https://hypr.land/news/independentHyprland>, <https://github.com/hyprwm/aquamarine>

Evidence: Merges claims 0, 1 and 2, each voted 3-0. Primary source is the project's own announcement of 2024-07-21. Caveat: the libinput/KMS details are inferred, not stated in the README.

### high confidence (vote 3-0)

Smithay is a Rust library of building blocks for Wayland compositors. It is not a full compositor or a framework and imposes no constraints, so each project must write its own window-management policy; its Anvil compositor is only a sample. Reuse: for a Rust-first Bun OS compositor, Smithay is the matching base, and Bun OS would own all policy (tiling, Hyprland-like rules, shell selection).

Sources: <https://github.com/Smithay/smithay>

Evidence: Merges claims 3 and 4, each voted 3-0, from the current README. A claim listing which production compositors use Smithay (COSMIC, Niri and others) was refuted 1-2, so do not cite that list without separate evidence.

### high confidence (vote 3-0 / 2-1)

Mutter is a Wayland display server library that runs on KMS and libinput. It contains in-tree forks of Clutter (scene graph and UI toolkit) and Cogl (a GL abstraction) and does not use wlroots. GNOME Shell and elementary's Gala are both built on it, and running plain `mutter` is meant only for debugging. Reuse: a 'GNOME shell' option in Bun OS realistically means hosting GNOME Shell on Mutter, not reskinning Bun OS's own compositor.

Sources: <https://github.com/GNOME/mutter>

Evidence: Merges claims 7 (2-1, a dissenter objected to calling Mutter 'standalone'), 8 (3-0) and 9 (3-0). The 'library hosted by a shell' framing is the one that holds up.

### high confidence (vote 3-0)

wlr-layer-shell-unstable-v1 gives a wl_surface the layer role (background, bottom, top, overlay) with a defined z-order and anchoring to screen edges. Panels, docks, wallpapers and overlays are built on it. KWin implements it at version 5, and wlroots-based compositors, Hyprland and cosmic-comp also support it; Mutter does not. Reuse: make layer-shell the one shell-surface contract for Bun OS's M3, KDE-style and COSMIC-style shells, so shell components can move between compositors. GNOME needs a separate path, such as Shell extensions.

Sources: <https://lxr.kde.org/source/plasma/kwin/src/wayland/protocols/wlr-layer-shell-unstable-v1.xml>, <https://invent.kde.org/plasma/kwin/-/raw/master/src/wayland/layershell_v1.cpp>

Evidence: Merges claims 5 and 6, each voted 3-0. The KWin source sets s_version = 5. The protocol is still wlr-protocols' unstable v1, and an ext-layer-shell version is not merged into wayland-protocols.

### high confidence (vote 3-0)

Android's compositor is built on BufferQueue producer/consumer links. SurfaceFlinger takes buffers from many producers and composites them for the display, and the HWC HAL decides for each layer whether display hardware overlays (device composition) handle it or the GPU does (client composition fallback, typically past about 4 planes). Reuse: Bun OS's compositor should do the same with DRM/KMS overlay planes, which is what wlroots, Aquamarine and Smithay already expose, and keep GPU composition as the fallback.

Sources: <https://source.android.com/docs/core/graphics/architecture>, <https://source.android.com/docs/core/graphics/hwc>

Evidence: Merges claims 10, 11 and 12, each voted 3-0, from AOSP docs updated 2026-10-09. Newer AOSP uses BLASTBufferQueue but keeps the same model.

### high confidence (vote 3-0)

In ChromeOS, Exo (components/exo) is a Wayland display server built on top of the Aura shell, not a standalone compositor. Its current clients are ARC++ (Android apps) and Crostini (Linux apps, through the sommelier proxy), and it also serves Chromecast through fullscreen-shell. Ash, Aura and viz handle window management and composition. Reuse: this matches Bun OS's browser and Win32 targets. One embedded Wayland server inside a host shell can carry several app runtimes, with the host's own compositor doing the final composition.

Sources: <https://chromium.googlesource.com/chromium/src/+/HEAD/components/exo/README.md>

Evidence: Merges claims 13, 14 and 15, each voted 3-0, from the Chromium README at HEAD. Newer devices use ARCVM, which still displays through Exo, and Lacros is deprecated.

### high confidence (vote 3-0)

Android desktop windowing shows several resizable app windows with a taskbar fixed at the bottom where apps can be pinned. Every window gets a system-drawn header bar, even in immersive mode. Apps can make it transparent (APPEARANCE_TRANSPARENT_CAPTION_BAR_BACKGROUND) and draw underneath, but the system still draws close and maximize on top, and from Android 15 WindowInsets#getBoundingRects() reports where those controls sit. Connected displays entered developer preview in Android 16 QPR1 Beta 2 (June 2025, Pixel 8/9). A phone connected over DisplayPort starts a separate, independent desktop session on the external display, which reached general availability in Android 16 QPR3 (March 2026) on supported Pixel and Samsung devices. Reuse: Bun OS's M3 shell can copy this model of server-drawn caption controls plus app-drawn headers with reported exclusion areas, and treat each output as its own session.

Sources: <https://developer.android.com/develop/adaptive-apps/guides/support-desktop-windowing>, <https://android-developers.googleblog.com/2025/06/developer-preview-enhanced-android-desktop-experiences-connected-displays.html>

Evidence: Merges claims 16 to 19, each voted 3-0, from Google developer docs (updated 2026-08) and blog posts. The GA date comes from a verifier's citation of the March 2026 blog post.

### high confidence (vote 3-0)

The Material 3 token contract has three levels: reference (md.ref.*, raw values), system (md.sys.*, the design system) and component (md.comp.*). It can be carried into non-web toolkits; Qt Material UI themes all of its QML UI through these names (for example md.sys.typescale.label-large.font and md.ref.typeface.plain). Material Color Utilities generates the color side. Its scheme component builds static and dynamic schemes from one source color (such as wallpaper) or a core palette, and its dynamiccolor component resolves token colors from dark mode, style, preferences and contrast level. Reuse: make one md.ref/md.sys/md.comp token source, generated by MCU, the canonical contract for Bun OS. Have adapters export it to CSS custom properties (web/WASM), QML (KDE/Qt), libcosmic/iced themes, egui, and GTK/libadwaita CSS variables.

Sources: <https://qt-material-ui.readthedocs.io/en/stable/get-started/theming.html>, <https://chromium.googlesource.com/external/github.com/material-foundation/material-color-utilities/+/91da30d89e70c3dc9575ec71a1ebe8874d881f29/README.md>, <https://github.com/material-foundation/material-color-utilities/blob/main/README.md>

Evidence: Merges claims 20 to 23, each voted 3-0. Qt Material UI is a third-party library describing its own design. The MCU wording about wallpaper comes from an older README, but the substance matches current main. The per-toolkit adapters are an inference from this report, not a verified claim.

## caveats

Several requested areas have no surviving verified claims: KWin/Plasma QML shell internals, cosmic-comp/libcosmic/iced specifics, GTK 4/libadwaita, Kirigami, egui, the m3.material.io guidance pages themselves, AOSP SystemUI and Launcher3, Ash shell details, 'Aluminium OS', greenfield (Wayland in WebAssembly), and WSLg/Weston RDP. Recommendations for the browser and Win32 targets therefore rest on the Exo analogy and on inference, not verified evidence. A claim listing compositors built on Smithay (COSMIC, Niri, Catacomb and others) was refuted 1-2 and should not be cited. Mutter's 'standalone' framing was disputed (2-1). Hyprland and MCU sources date from 2024 or are pinned to older commits. Android desktop and connected-display features change quickly (QPR releases), so check API levels and device support before relying on them. Qt Material UI's claim that any part of the UI can be customized through tokens is the project describing itself, and nobody independently checked it. Layer-shell is still an unstable wlr protocol, not part of upstream wayland-protocols.

## openQuestions

```json
[
  "Is greenfield (or another Wayland-in-WASM compositor) mature enough to host Bun OS shells in the browser, and how does it map wl_buffer to WebGPU or canvas? Could WSLg's Weston RDP-RAIL backend serve as the Win32 host path?",
  "What has Google actually confirmed publicly about 'Aluminium OS' (the Android-based PC OS), and does it reuse Android desktop windowing or Ash/Exo?",
  "Which production compositors actually use Smithay today? cosmic-comp and niri are believed to, but that was not verified. Would building on Smithay or on Aquamarine better fit Bun OS's Hyprland-style goal?",
  "How should GNOME/Mutter, which lacks layer-shell, join the shared shell contract: GNOME Shell extensions, a Mutter plugin, or nesting? And is the ext-layer-shell standardization close to landing in wayland-protocols?"
]
```

## refuted

```json
[
  {
    "claim": "Production compositors built on Smithay include COSMIC (cosmic-comp), Niri, Catacomb, MagmaWM and Pinnacle.",
    "vote": "1-2",
    "source": "https://github.com/Smithay/smithay"
  }
]
```

## unverified

```json
[]
```

## sources

```json
[
  {
    "url": "https://hypr.land/news/independentHyprland",
    "quality": "primary",
    "angle": "Wayland compositor libraries and protocols",
    "claimCount": 5
  },
  {
    "url": "https://www.phoronix.com/news/Hyprland-0.42-Wayland",
    "quality": "secondary",
    "angle": "Wayland compositor libraries and protocols",
    "claimCount": 4
  },
  {
    "url": "https://github.com/Smithay/smithay",
    "quality": "primary",
    "angle": "Wayland compositor libraries and protocols",
    "claimCount": 5
  },
  {
    "url": "https://lxr.kde.org/source/plasma/kwin/src/wayland/protocols/wlr-layer-shell-unstable-v1.xml",
    "quality": "primary",
    "angle": "Wayland compositor libraries and protocols",
    "claimCount": 5
  },
  {
    "url": "https://gjs.guide/extensions/overview/architecture.html",
    "quality": "secondary",
    "angle": "Desktop shell implementations (GNOME, KDE, COSMIC)",
    "claimCount": 5
  },
  {
    "url": "https://github.com/GNOME/mutter",
    "quality": "primary",
    "angle": "Desktop shell implementations (GNOME, KDE, COSMIC)",
    "claimCount": 5
  },
  {
    "url": "https://blog.martin-graesslin.com/blog/2015/07/plasma-phone-and-kwin/",
    "quality": "blog",
    "angle": "Desktop shell implementations (GNOME, KDE, COSMIC)",
    "claimCount": 5
  },
  {
    "url": "https://lwn.net/Articles/984771/",
    "quality": "secondary",
    "angle": "Desktop shell implementations (GNOME, KDE, COSMIC)",
    "claimCount": 5
  },
  {
    "url": "https://source.android.com/docs/core/graphics/architecture",
    "quality": "primary",
    "angle": "Google OS UI stacks",
    "claimCount": 5
  },
  {
    "url": "https://chromium.googlesource.com/chromium/src/+/HEAD/components/exo",
    "quality": "primary",
    "angle": "Google OS UI stacks",
    "claimCount": 5
  },
  {
    "url": "https://developer.android.com/develop/adaptive-apps/guides/support-desktop-windowing",
    "quality": "primary",
    "angle": "Google OS UI stacks",
    "claimCount": 5
  },
  {
    "url": "https://android-developers.googleblog.com/2025/06/developer-preview-enhanced-android-desktop-experiences-connected-displays.html",
    "quality": "primary",
    "angle": "Google OS UI stacks",
    "claimCount": 5
  },
  {
    "url": "https://www.androidauthority.com/aluminium-os-android-for-pcs-3619092",
    "quality": "secondary",
    "angle": "Google OS UI stacks",
    "claimCount": 5
  },
  {
    "url": "https://www.pcworld.com/article/2985849/googles-new-aluminium-os-is-officially-coming-to-supplant-chromeos.html",
    "quality": "secondary",
    "angle": "Google OS UI stacks",
    "claimCount": 5
  },
  {
    "url": "https://qt-material-ui.readthedocs.io/en/stable/get-started/theming.html",
    "quality": "primary",
    "angle": "Cross-toolkit design tokens and Material 3",
    "claimCount": 5
  },
  {
    "url": "https://chromium.googlesource.com/external/github.com/material-foundation/material-color-utilities/+/91da30d89e70c3dc9575ec71a1ebe8874d881f29/README.md",
    "quality": "primary",
    "angle": "Cross-toolkit design tokens and Material 3",
    "claimCount": 5
  },
  {
    "url": "https://docs.rs/material-color-rs",
    "quality": "primary",
    "angle": "Cross-toolkit design tokens and Material 3",
    "claimCount": 4
  },
  {
    "url": "https://devblogs.microsoft.com/commandline/wslg-architecture",
    "quality": "primary",
    "angle": "Compositor in WebAssembly and on Windows",
    "claimCount": 5
  },
  {
    "url": "https://gitlab.freedesktop.org/wayland/weston/-/merge_requests/1667",
    "quality": "primary",
    "angle": "Compositor in WebAssembly and on Windows",
    "claimCount": 5
  },
  {
    "url": "https://fosdem.org/schedule/event/fosdem-2024-3219-greenfield-wayland-in-the-browser-an-update",
    "quality": "primary",
    "angle": "Compositor in WebAssembly and on Windows",
    "claimCount": 3
  },
  {
    "url": "https://lpc.events/event/9/contributions/611/attachments/702/1298/XDC2020_-_X11_and_Wayland_applications_in_WSL.pdf",
    "quality": "primary",
    "angle": "Compositor in WebAssembly and on Windows",
    "claimCount": 5
  },
  {
    "url": "https://www.phoronix.com/news/Greenfield-Compositor-2024",
    "quality": "secondary",
    "angle": "Compositor in WebAssembly and on Windows",
    "claimCount": 5
  },
  {
    "url": "https://www.phoronix.com/news/Microsoft-Writing-Wayland-Comp",
    "quality": "secondary",
    "angle": "Compositor in WebAssembly and on Windows",
    "claimCount": 5
  }
]
```

## stats

```json
{
  "angles": 5,
  "sourcesFetched": 23,
  "claimsExtracted": 111,
  "claimsVerified": 25,
  "confirmed": 24,
  "killed": 1,
  "unverified": 0,
  "afterSynthesis": 8,
  "urlDupes": 0,
  "budgetDropped": 7,
  "agentCalls": 105
}
```

