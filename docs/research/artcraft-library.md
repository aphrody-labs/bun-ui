# ArtCraft -> shared library: research report

Repo: `C:\src\bun-os` @ `ba1a7c65e0` (read-only survey, no builds run). Date: 2026-10-25.
Scope: `apps/artcraft` (Tauri Rust), `apps/artcraft-web-app`, `apps/artcraft_native`, `packages/artcraft-frontend`,
60 `packages/storyteller-*`, 21 `crates/artcraft-*` / `crates/artcraft_*` plus `crates/artcraft-tauri-plugin-http`.
LOC = `wc -l` of `.ts/.tsx` or `.rs`, tests included.

## 0. Headline findings

1. **No storyteller package declares its runtime deps.** Only `storyteller-tauri-api`, `-tauri-utils`, `-ui-settings-modal` have a
   `dependencies` block (`packages/storyteller-tauri-api/package.json:21-25`). react, zustand, lucide-react, tailwind-merge,
   @headlessui/react, three, konva, radix... resolve via hoisting and via the build-only `packages/artcraft-frontend/package.json`
   (`@frontend/source`), plus tsconfig `paths` mapping every `@storyteller/*` to source (`packages/artcraft-frontend/tsconfig.base.json:19-79`)
   and `~/*` to the app (`:18`). **Not consumable by another app as-is.**
2. **No storyteller package imports `@aphrody/m3*`.** M3 bridge is CSS only: `apps/artcraft-web-app/app/src/styles/aphrody.css:3-12`
   (`--st-*` -> `--md-sys-color-*`) and `apps/artcraft-web-app/tailwind.config.ts:4-5,92-106`. Widgets use app-only Tailwind classes
   (`bg-ui-controls-border`, `text-base-fg/60`: `storyteller-ui-badge/src/lib/badge.tsx`, `storyteller-ui-label/src/lib/label.tsx`)
   and the app's Tailwind content glob reaches into `../../packages/storyteller-*/src/**` (`tailwind.config.ts:12`).
3. **Tauri versions already split:** root catalog `@tauri-apps/api` **3.0.0-alpha.2** (`package.json:787`, installed in node_modules),
   plugins 2.x (`package.json:717-718` dialog/http 2.8.2; `storyteller-tauri-api/package.json:25` upload 2.4.0), Rust app on
   **tauri 2.11.2** (`apps/artcraft/Cargo.toml:81`; `tauri-build 2.6.2` `:22`).
4. **11 frontend commands are dead** (invoked by `storyteller-tauri-api`, absent from `apps/artcraft/src/lib.rs:227-291`):
   `enqueue_edit_image_command` (`src/lib/enqueue/EnqueueEditImage.ts:201`), `enqueue_image_inpaint_command` (`EnqueueImageInpaint.ts:120`),
   `enqueue_image_to_video_command` (`EnqueueImageToVideo.ts:163`), `enqueue_text_to_image_command` (`EnqueueTextToImage.ts:175`),
   `fal_background_removal_command` (`fal/FalBackgroundRemoval.ts:34`), `fal_kling_image_to_video_command` (`fal/FalKlingImageToVideo.ts:34`),
   `get/set_fal_api_key_command` (`fal/GetFalApiKey.ts:13`, `fal/SetFalApiKey.ts:5`), `get/set_openai_api_key_command`
   (`openai/GetOpenAIApiKey.ts:13`, `openai/SetOpenAIApiKey.ts:5`), `sora_image_remix_command` (`sora/SoraImageRemix.ts:53`).
   Registered but not wrapped in TS: `flip_image` (`apps/artcraft/src/core/commands/flip_image.rs:8`), `platform_info_command`
   (`platform_info_command.rs:38`), `provider_{clear,list,set_api_key}_command`, `generate_audio_command`, `estimate_{audio,mesh}_cost_command`,
   `download_media_file_command`, `enqueue_image_to_{3d_object,gaussian}_command`, `open_sora_login_command`, `worldlabs_{open_login,receive_bearer,clear_credentials}_command`.
5. **The four big editors are already adapter-based:** video editor (`storyteller-ui-video-editor/src/index.ts`, "Adapter interfaces - hosts
   implement these"), moodboard (`MoodboardAdapter`), pagedraw (`PageDrawAdapter`), pagescene (`PageSceneAdapter`). The video editor has
   **zero** `@storyteller/*`/tauri imports. Highest-value extractions.
6. **Craft studios are egui/Rust**, not React (`apps/filmcraft/Cargo.toml`, `apps/photocraft/Cargo.toml`: egui 0.36; `crates/craft-ui`).
   For them the reusable ArtCraft assets are Rust (`artcraft_client`, `artcraft_api_defs`, `artcraft_router`) and the egui shell of
   `apps/artcraft_native` (already on `craft-ui`, `apps/artcraft_native/Cargo.toml`).
7. Outside the family nothing imports `@storyteller/*`; only build/deploy scripts reference it (`scripts/build-frontend.ts:8-10`,
   `scripts/aphrody/tools/infra/deploy-craft-frontends.ts:80` mounts it at `/art/`), plus `apps/desktop/src/app.ts:45` and
   `packages/bun-workspace/src/capabilities.ts:34` (labels).

## 1. Inventory

### 1.1 Apps

| Member | LOC | Nature | Key deps | Consumers |
|---|---|---|---|---|
| `apps/artcraft` (lib `artcraft_app_lib`) | 29,889 Rust / 467 files; `services/` 10,022 (storyteller 3,657, sora 2,237, grok 1,736, worldlabs 1,359, midjourney 1,029) | Real. Tauri 2 backend: 63 commands (`src/lib.rs:227-291`), 5 provider login webviews with cookie scraping, task queue (sqlite_tasks), billing windows | tauri 2.11.2 (+unstable, devtools, protocol-asset), plugins dialog 2.7.1 / log 2.8.0 / upload 2.4.0 / opener 2 (`Cargo.toml:78-92`), forked `artcraft-tauri-plugin-http`, 15 artcraft crates, provider clients | leaf; **excluded** from root workspace (`Cargo.toml:2`) |
| `apps/artcraft-web-app` (`artcraft`) | 21,754 TS / 177 files (pages 10,068, components 6,417, Classes 2,494) | Real SPA (`BrowserRouter`, `app/src/index.tsx`), 17 page folders (Image, Video, VideoEditor, Scene, Draw, Moodboard, Storyboard, Audio, Angles, ...). Remix entry files and deps are leftovers. Hardcoded hosts (`index.tsx` `ENV` block: studio.storyteller.ai, cdn-2.fakeyou.com) | react, signals, react-router 6, konva, posthog, `@aphrody/m3` (build plugin only), `@aphrody/identity` (`components/signaled/TopBar/TopBar.tsx:1`) | Tauri `frontendDist` (`apps/artcraft/tauri.conf.json`), build/deploy scripts |
| `apps/artcraft_native` | 21,814 Rust | Real egui app over the same crates; Create Image/Video/Audio done, rest "coming soon" (`README.md`) | craft-ui, eframe/egui 0.36, wry 0.55 (Midjourney login only) | leaf (root member `Cargo.toml:483`) |
| `packages/artcraft-frontend` (`@frontend/source`) | 461 TS / 3 files | **Build tooling only**: `scripts/artcraft.ts` (Bun.build, tailwind, `m3Plugin`, inlines `storyteller-*/**/*.worker.ts`), perf/test tools. De facto dep manifest for all storyteller packages. `lint` script targets non-existent `apps/artcraft/app/src libs` | 60+ deps (radix, headlessui, framer-motion, zustand, three, konva, mediabunny, opencut-wasm, dnd-kit...) | web app scripts, build/deploy scripts |

### 1.2 storyteller-* (60 packages, 161,345 LOC, 32 spec files)

Deps = **actual imports** (*decl* = declared in package.json). **T** = imports `@storyteller/tauri-*` or `@tauri-apps/*`.
Consumers = importers among storyteller-* and WEBAPP. None is a pure re-export stub; all have real code.

**Domain / data**

| Package | LOC | Notes | Deps | Consumers |
|---|---|---|---|---|
| api | 5,828 | REST client for storyteller.ai; `ApiManager.ts:5` uses `FetchProxy`; hosts hardcoded (`config/StorytellerApiHostStore.ts:2,17`, `enums/Api.ts:3-4`, `GetCdnOrigin.ts:3`, `SegmentationApi.ts:48,67`) | tauri-utils, plugin-http, opencv-js | WEBAPP + 11 |
| api-enums | 243 | pure enums | - | WEBAPP + 7 |
| common | 775 | assets/enums/utils | - | WEBAPP + 16 |
| model-list | 3,836 | model catalog, families, prompt formatters | api-enums, tauri-utils, react | WEBAPP + 10 |
| omni-gen | 719 | | api, react | WEBAPP, promptbox |
| credits | 130 | zustand store, **T** (`lib/state/credits-state.ts:2`) | zustand | WEBAPP, settings-modal |
| subscription | 212 | plans + store, **T** (`lib/subscription-state.ts:2`) | zustand | WEBAPP, pricing-*, settings |
| keybinds | 2,605 | registry, presets, capture, cheatsheet, settings UI | react, zustand, tailwind-merge | moodboard, pagedraw, pagescene, settings |
| google-analytics | 31 | hardcoded `TAG_ID = "G-Y4Y8KMLPQ7"` (`lib/tag-id.ts:1`) | - | WEBAPP + 3 |
| markdown-content | 606 | help docs | react-router-dom, lucide | help-menu |
| soundboard | 347 | howler, **T** | howler | WEBAPP + 3 |
| icons | 183 | `DynamicIcon` over lucide | lucide-react | 20 pkgs |

**Tauri bridge**

| Package | LOC | Notes | Deps | Consumers |
|---|---|---|---|---|
| tauri-api | 2,875 / 59 | typed `invoke` wrappers for ArtCraft commands + `useModelsStore`; 11 dead commands (see 0.4) | *decl* @tauri-apps/api, plugin-dialog, plugin-upload 2.4.0 (`lib/download/LocalDownloads.ts:1-2`) | WEBAPP + 9 |
| tauri-events | 736 | typed `listen` hooks (generation complete/failed/enqueue, credits/subscription changed, billing/login modals) | @tauri-apps/api, toaster, soundboard | WEBAPP + 3 |
| tauri-utils | 175 | generic: `IsDesktopApp` (`lib/IsDesktopApp.ts`), `FetchProxy` (`lib/FetchProxy.ts`), `useTauriWindowControls`, `useTauriPlatform`; pollutes `window.*` | *decl* plugin-http | WEBAPP + 5 |

**Feature widgets**

| Package | LOC | Coupling | Deps | Consumers |
|---|---|---|---|---|
| ui-video-editor | 63,502 / 506 | none to storyteller/tauri; adapter API; private shadcn set `src/lib/components/ui/` (26 files) | radix-ui (16 imports), cva, @hugeicons, opencut-wasm, mediabunny, zustand, framer-motion, soundtouchjs | WEBAPP |
| ui-pagescene | 20,369 / 204 | `PageSceneAdapter`; imports 25 storyteller pkgs | three, @sparkjsdev/spark, zustand, headlessui | WEBAPP |
| ui-promptbox | 13,003 / 37 | **T** (`PromptBoxImage.tsx:8`, `PromptBoxVideo.tsx:8`, `PromptBox3D.tsx:2,33`, `deck/usePromptBoxDrop.tsx:6,287-288`, `deck/useDeckMedia.tsx:4`), api, gallery-modal, GA | dnd-kit, signals, zustand | WEBAPP + 5 |
| ui-moodboard | 8,807 / 72 | `MoodboardAdapter` + persistence adapter; only UI-kit storyteller deps | konva, react-konva, zustand, react-colorful | WEBAPP |
| ui-pagedraw | 7,645 / 32 | `PageDrawAdapter`; pulls promptbox, model-selector, pricing-modal | konva, three, zustand | WEBAPP |
| ui-gallery-modal | 4,923 / 14 | api, generation-list, lightbox, folders/dnd | signals | WEBAPP + 4 |
| ui-upload-modal | 3,297 / 27 | api, gallery-modal, viewer-3d | three, spark | WEBAPP |
| ui-generation-list | 3,068 / 29 | api, model-list (no tauri) | zustand, react-masonry-css | WEBAPP, gallery-modal |
| ui-settings-modal | 1,950 / 19 | **T** heavy (8 tauri-api imports), login, pricing, keybinds | *decl* plugin-dialog | WEBAPP |
| ui-pricing-modal | 1,806 / 23 | **T**, promptbox, model-selector | zustand | WEBAPP + 4 |
| ui-lightbox-modal | 1,708 | **T** (`lib/lightbox-modal.tsx:29` MediaFileDelete), api, viewer-3d | embla, dayjs | gallery-modal |
| ui-login-modal | 1,374 | api, @tauri-apps/api, DesktopLoginBridge | qrcode.react | WEBAPP, settings |
| ui-vfx | 1,333 | api, promptbox, gallery | zustand | WEBAPP |
| ui-viewer-3d | 937 | clean | three, spark | WEBAPP + 4 |
| ui-model-selector | 926 / 10 | **T** (`classy-model-selector.tsx:5`, `model-selectors-for-pages.tsx:13`, `provider-icons.tsx:2`) | zustand, model-list, popover | WEBAPP + 3 |
| ui-pricing-table | 499 | subscription | headlessui | pricing-modal |
| ui-help-menu | 463 | **T**, markdown-content; hardcoded getartcraft.com (`help-menu.tsx:30`) | zustand | WEBAPP + 2 |
| ui-audio-player | 433 | clean | wavesurfer.js | generation-list, lightbox |
| provider-setup-modal / provider-billing-modal | 170 / 151 | tauri-events | - | WEBAPP |
| ui-camera-settings-modal | 209 | UI kit only | - | promptbox |
| ui-action-reminder-modal | 193 | self-import (`lib/action-reminder-modal-signals.ts:4`) | signals | WEBAPP + 4 |

**Generic UI kit** (see section 3): ui-popover 1,487, ui-modal 1,112 (radix-dialog + react-spring, `lib/modal.tsx:2,10`), ui-tooltip 402,
ui-input 340, ui-button 296, ui-sliderv2 213, ui-button-dropdown 186, ui-menu-icon-selector 171, ui-loading 135, ui-tab-selector 125,
ui-checkbox 117, ui-gravatar 108 (hardcoded storyteller.ai `gravatar.tsx:22-23`), ui-file-uploader 103, ui-toaster 89, ui-select 82,
ui-button-icon-select 76, ui-list-dropdown 57, ui-switch 50, ui-button-icon 35, ui-close-button 32, ui-badge 24, ui-label 24, ui-loading-spinner 14.

Not imported by WEBAPP directly (transitive only): badge, button-dropdown, button-icon, button-icon-select, camera-settings-modal, label,
list-dropdown, switch, lightbox-modal, audio-player, keybinds, markdown-content, pricing-table.

### 1.3 Crates (142,363 LOC Rust)

| Crate | LOC | Notes | Deps | Consumers (path deps) |
|---|---|---|---|---|
| artcraft_router | 89,610 / 790 (2,730 tests, 178 ignored) | multi-provider generation router (image/video/audio/mesh/splat) over artcraft, fal, gmicloud, grok, kinovi, midjourney, worldlabs (`src/client/*`) | provider clients, wreq, tokio | artcraft, artcraft_native |
| artcraft-enums | 28,845 / 170 | includes `src/tauri/` (task types, event names) | serde, utoipa | artcraft, native, api_defs, client, router, sqlite_tasks |
| artcraft_api_defs | 9,390 / 256 | request/response types | enums, tokens, utoipa | artcraft, native, client, router |
| artcraft_client | 5,741 / 153 | HTTP client (credentials, endpoints, recipes) | reqwest, cookie, backoff, client_identity | artcraft, native, router |
| artcraft-tokens | 2,836 / 77 | typed IDs | rand, utoipa | 6 |
| artcraft-tauri-plugin-http | 1,265 | fork of tauri-plugin-http 2.4.3 (`Cargo.toml:5-6,15`) | **tauri 2.11.2** (`:42`), tauri-plugin 2.6.2 (`:31`), tauri-plugin-fs 2.5.1 (`:45`) | artcraft |
| artcraft-primitives | 922 | str/bool/num utils | none | artcraft |
| artcraft-filesys | 825 | | walkdir | artcraft, grok/midjourney/worldlabs clients |
| artcraft-url_utils | 580 | | url | artcraft, router |
| artcraft-images | 487 | | image | artcraft |
| artcraft-mimetypes | 412 | | infer | artcraft, images, client, file_to_base64_url |
| artcraft_client_identity | 348 | Origin/User-Agent per destination (`src/lib.rs:1-12`) | url | plugin-http, client |
| artcraft-jwt_light | 315 | **unverified** JWT parsing (`src/lib.rs:2-6`) | base64, chrono | worldlabs_consumer_client only |
| artcraft-cookie_store | 230 | lightweight jar; overlaps `crates/cookie_store_wrapper` | serde | artcraft, grok/worldlabs consumer clients |
| artcraft-memory_store | 141 | | anyhow | artcraft |
| artcraft-test_data / test_utils | 100 / 66 | fixtures/helpers | | router + 8 / 13 crates |
| artcraft-http_headers | 84 / 13 files | near-stub (constants) | | worldlabs_consumer_client |
| artcraft-uuid_utils | 64 | thin | uuid | artcraft, client, midjourney, sora |
| artcraft-build_metadata | 54 | thin | build-info | artcraft |
| artcraft-errors | 29 | **stub**: anyhow re-export (`src/lib.rs:21-29`) | anyhow | 20 crates |
| artcraft-web_base64 | 19 | stub | base64 | artcraft |

Consumers rename packages back (`errors = { package = "artcraft-errors" }`, `apps/artcraft/Cargo.toml` deps), so code reads
`errors::`, `tokens::`, `enums::` - collision-prone in a shared workspace.

## 2. Reusable capabilities ranked by value for other apps

| # | Capability | Source | Value | Cost / blockers |
|---|---|---|---|---|
| 1 | Desktop/web dual-mode utils (`IsDesktopApp`, `FetchProxy`, window controls, platform) | storyteller-tauri-utils (175) | every hybrid app (webos, play, app-ui) | trivial; retarget to `@aphrody/tauri` (`isTauri` in `packages/bun-tauri/js/api/core.ts:585-600`); drop `window.*` globals |
| 2 | Video editor | ui-video-editor (63.5k) | filmcraft-web, product creator, webos | low coupling (adapters); replace private `components/ui/*` shadcn with m3-baseui; two icon sets (hugeicons + lucide); check opencut-wasm licence |
| 3 | Generation list / gallery grid (pending/failed/done cards, masonry, selection) | ui-generation-list (3k) | product, app-ui history, m3-ai | medium: tied to `@storyteller/api` Job/Media types and model-list; needs `GenerationItem` adapter |
| 4 | Model catalog + model selector | model-list (3.8k) + ui-model-selector (0.9k) | product, m3-ai, app-ui | overlaps `packages/m3-ai/src/ModelSelector.tsx`; selector imports tauri-api (`Provider`, `useImageModels`) - invert to props |
| 5 | Prompt box (mentions, reference deck, dnd, fullscreen) | ui-promptbox (13k) | product; peer of m3-ai `ChatComposer.tsx` | high: 6 tauri-api imports, gallery-modal, GA, soundboard. Extract `MentionTextarea`, `MentionChipMenu`, `ReferenceDeck`, `useAutoGrowEditorHeight`; keep `PromptBoxImage/Video/3D` in ArtCraft |
| 6 | Lightbox + 3D viewer + audio player | ui-lightbox-modal, ui-viewer-3d, ui-audio-player | webos viewer, m3-showcase, app-ui, play | viewer/audio clean; lightbox: move `MediaFileDelete` + api calls behind callbacks |
| 7 | Moodboard | ui-moodboard (8.8k) | designcraft-web, product, webos | adapter-based; swap UI kit for m3 |
| 8 | Pagedraw (2D/inpaint) and Pagescene (3D stage) | ui-pagedraw, ui-pagescene | Craft web studios | adapter-based but pull promptbox/model-selector/pricing: keep in ArtCraft studio tier |
| 9 | Keybinds system | storyteller-keybinds (2.6k) | all apps; app-ui `CommandPalette.tsx` | clean; compare with m3-primitives `Shortcut`/`Kbd` |
| 10 | Billing / credits / subscription / pricing | credits, subscription, ui-pricing-*, provider-billing-modal | storyteller-backed apps only | backend-specific; not shared tier |
| 11 | Tauri API / events wrappers | storyteller-tauri-api, -events | ArtCraft only | command names are the ArtCraft contract; reuse the pattern, generate from Rust (fork has `specta` feature, `aphrody-tauri/Cargo.toml` features) |
| 12 | Rust http/cookie/jwt/fs helpers | client_identity, cookie_store, jwt_light, filesys, mimetypes, url_utils, primitives | Craft studios, Rust provider clients | tiny; merge (section 5) |
| 13 | Provider router + client + API types | artcraft_router, artcraft_client, artcraft_api_defs | Craft studios (egui), product backends, artcraft_native | already shared by two apps; core of a Rust generation SDK |
| 14 | Client identity | artcraft_client_identity | any Tauri app talking to third-party sites | small, clean |
| 15 | Login modal / desktop login bridge | ui-login-modal | storyteller-backed apps | backend-specific |

There is no reusable JS router: the web app uses react-router-dom `BrowserRouter` directly (`app/src/index.tsx`). "Router" here means
`artcraft_router` (Rust provider router).

## 3. storyteller-ui-* duplicating M3 primitives (replace, do not extract)

Targets: `packages/m3-primitives/src/index.ts` (Base UI based) and `packages/m3-baseui/src/*`.

| storyteller package | Replace with | Note |
|---|---|---|
| ui-button (296) | `Button` (`m3-primitives/src/index.ts:6`) | lucide + twMerge wrapper |
| ui-button-icon (35), ui-close-button (32) | `CircleButton` (`:167`) | `close-button.tsx` hardcodes `bg-black/40` |
| ui-button-icon-select (76), ui-menu-icon-selector (171) | `ToggleGroup` (m3-primitives `ToggleGroup.tsx`, m3-baseui `toggle-group.tsx`) | |
| ui-button-dropdown (186), ui-list-dropdown (57) | `DropdownMenu` / `Dropdown` (`:118`) | headlessui Menu |
| ui-checkbox (117) | `CheckBox` (`:14`) | |
| ui-switch (50) | `Switch` (`:19`) | headlessui + clsx |
| ui-select (82) | `Select` / `SelectPill` (`:121,138`) | headlessui Listbox |
| ui-input (340), ui-label (24) | `Input`, `Label`, `TextArea` (`:10`); m3-forms `InputField` | |
| ui-sliderv2 (213) | `Slider` (`:23`) | |
| ui-tooltip (402) | `Tooltip` (`:61`) | |
| ui-popover (1,487) | `Popover` (`:48-58`); move `group-model-items` + `model-picker-style-store` into model-selector | `ui-popover/src/index.ts` exports model-picker stores |
| ui-modal (1,112) | `Dialog` (`:31`), m3-baseui `dialog.tsx` / `drawer.tsx` | radix-dialog + react-spring |
| ui-action-reminder-modal (193) | `AlertDialog` | |
| ui-tab-selector (125) | `Tabs` / `TabBar` (`:173`) | |
| ui-toaster (89) | `toast`, `Toaster` (`:142`) | keep the `setToastDelegate` idea (`lib/toaster.tsx`) |
| ui-loading (135), ui-loading-spinner (14) | `Loader`, `CircularProgress` (`:146,156`) | |
| ui-badge (24) | `Badge` | |
| ui-gravatar (108) | `Avatar` / `@aphrody/identity` `AphrodyAvatar` (already used, `TopBar.tsx:1`) | |
| ui-file-uploader (103) | m3-forms field + a new dropzone primitive (gap: none in m3-primitives) | react-drag-drop-files |
| storyteller-icons (183) | `@aphrody/m3-icons` / `Icon` | |
| ui-video-editor `src/lib/components/ui/*` (26 shadcn files) | m3-baseui equivalents (dialog, dropdown-menu, select, slider, tabs, tooltip, scroll-area, switch, checkbox, radio-group, popover, progress, context-menu, separator) + m3-primitives `Resizable` | radix-ui, cva |

Keep and re-skin: ui-camera-settings-modal, ui-audio-player, ui-pricing-table, ui-help-menu, ui-settings-modal.
Total: 22 packages (about 5.0k LOC) deleted plus the video editor internal ui set.

## 4. Blockers: apps/artcraft tauri 2.11 -> aphrody-tauri fork (Tauri 3 line)

Fork facts: `packages/bun-tauri/Cargo.toml` is its own workspace (edition 2024, rust-version 1.97); `aphrody-tauri` 1.4.7,
`aphrody-tauri-runtime-cef` (CEF 154.5, `aphrody-tauri-runtime-cef/Cargo.toml:34`), single `tauri-plugin-aphrody` (autostart,
clipboard-manager, deep-link, dialog, fs, global-shortcut, log, notification, opener, os, process, single-instance, store, updater,
window-state, mcp-bridge). Reference consumer: `apps/desktop/src-tauri/Cargo.toml:14-21` and its `src` (`Builder::default().runtime(tauri_runtime_cef::Cef::default()).plugin(tauri_plugin_aphrody::init())`).

| # | Blocker | Evidence | Fix |
|---|---|---|---|
| B1 | No http plugin in the fork; artcraft uses a forked tauri-plugin-http on tauri 2.11 + tauri-plugin-fs 2.5 | `crates/artcraft-tauri-plugin-http/Cargo.toml:31,42,45`; `apps/artcraft/src/lib.rs:159`; capabilities `http:default`, `http:allow-fetch` | port to `aphrody-tauri-plugin`, add feature `http` to tauri-plugin-aphrody (client-identity hook optional), use its internal `fs` module |
| B2 | No upload plugin in the fork | `apps/artcraft/Cargo.toml:80`, `lib.rs:161`; JS `LocalDownloads.ts:1` | add `upload` feature, or use the registered native `download_media_file_command` |
| B3 | 4 plugins -> one `tauri_plugin_aphrody::init()`; log plugin commented out yet in capabilities | `lib.rs:157-172`; `capabilities/default.json` (`log:default`, `upload:*`, `http:*`) | regenerate capabilities against fork schema |
| B4 | Runtime wry -> CEF. Fork defaults generics to `DynRuntime` (`aphrody-tauri/src/app.rs:381,1514`, `lib.rs:176`, `webview/webview_window.rs:1525`) so bare `AppHandle` (about 340 uses) compiles, but runtime must be set | `lib.rs:157` | `.runtime(Cef::default())`; CEF distribution size |
| B5 | Cookie scraping of provider login webviews | `services/*/windows/*extract*cookies.rs` (`cookies_for_url`), `clear_main_webview_window_storyteller_cookies.rs:11` | supported (`aphrody-tauri-runtime-cef/src/webview.rs:1911-1935`); verify jar isolation between main app and provider windows in CEF |
| B6 | Per-window `user_agent` + `devtools(true)` | `open_midjourney_login_window.rs:30`, `grok_login_window_open.rs:50`, `open_storyteller_billing_window.rs:284`, sora/worldlabs openers | CEF has no per-browser UA; fork emulates via DevTools `Emulation.setUserAgentOverride` (`webview.rs:790-874,2197`) - fragile vs provider bot detection; devtools needs runtime-cef `devtools` feature |
| B7 | `on_new_window` + `NewWindowResponse` | `worldlabs_login_window_open.rs:12,49-53` | API present (`aphrody-tauri/src/webview/mod.rs:206,586`); verify CEF life-span handler (`cef_impl/client/life_span.rs`) |
| B8 | Toolchain/workspace: artcraft edition 2021, rust-version 1.77.2; excluded from root workspace | `apps/artcraft/Cargo.toml:8-9`; root `Cargo.toml:2` | follow `apps/desktop/src-tauri` pattern (path deps into `packages/bun-tauri/crates`), bump edition |
| B9 | Config schema `2.0.0-rc`, `withGlobalTauri: true`, asset scope `**`, wide CSP | `apps/artcraft/tauri.conf.json` | fork keeps `withGlobalTauri` (`aphrody-tauri-utils/src/config.rs`) and `protocol-asset`; tighten scope |
| B10 | JS mismatch: `@tauri-apps/api` 3.0.0-alpha.2 with 2.x plugins | `package.json:717-718,787`; `storyteller-tauri-api/package.json:21-25` | replace `@tauri-apps/*` with `@aphrody/tauri` (`./api/*`, `./plugins/dialog`, `./plugins/fs`); add http/upload guest bindings in `packages/bun-tauri/js/plugins/` |
| B11 | Command drift (section 0 item 4) | | generate TS bindings from Rust (`specta`) before migrating |
| B12 | `enums::tauri` module aliased as `tauri::tasks::...` (41 hits of `tauri::tasks::task_type::TaskType`) | `crates/artcraft-enums/src/tauri/` | rename to `desktop` |

### storyteller-tauri-* vs @aphrody/tauri

| storyteller | @aphrody/tauri | Verdict |
|---|---|---|
| tauri-utils `IsDesktopApp` | `isTauri` (`js/api/core.ts:585-600`) | delete, alias |
| tauri-utils `FetchProxy` | none (no http binding; `js/bun.ts` `bunFetch` is the Bun sidecar bridge) | add `plugins/http.ts`, move FetchProxy as desktop-aware fetch |
| tauri-utils window controls / platform | `api/window`, `plugins/os` | move hooks to new `@aphrody/tauri/react` subpath |
| tauri-api invoke wrappers | `api/core` `invoke` | keep (ArtCraft contract), rebase imports, regenerate |
| tauri-api `LocalDownloads` | `plugins/dialog` yes, upload missing | add upload binding or native command |
| `BasicEventWrapper` duplicated (`storyteller-tauri-api/src/lib/events/BasicEventWrapper.ts`, `storyteller-tauri-events/src/lib/common/BasicEventWrapper.ts`) | `api/event` | merge into one ArtCraft bridge |
| tauri-events hooks | `api/event` `listen` | keep, import from @aphrody/tauri |

## 5. Proposed library layout

### 5.1 JS packages

Shared tier (webos, play, product/app-ui, m3-showcase; deps only `@aphrody/m3-*`, `@aphrody/tauri`, react, declared as peers):

| Package | Built from | Notes |
|---|---|---|
| `@aphrody/tauri` (extend) | + `plugins/http.ts`, `plugins/upload.ts`, `fetch.ts` (FetchProxy), `react.ts` (window controls, platform, `useIsDesktop`) | absorbs storyteller-tauri-utils |
| `@aphrody/m3-media` | ui-generation-list (adapter), ui-lightbox-modal, ui-viewer-3d, ui-audio-player, grid parts of ui-gallery-modal | `MediaItem` adapter, M3 only |
| `@aphrody/m3-video-editor` | ui-video-editor | internal shadcn -> m3-baseui; keep adapter API |
| `@aphrody/m3-canvas-boards` | ui-moodboard (later pagedraw core) | konva peer |
| `@aphrody/m3-keybinds` | storyteller-keybinds | or merge into m3-primitives `Shortcut` |
| `@aphrody/m3-gen` | ui-model-selector + generic promptbox parts (`MentionTextarea`, `MentionChipMenu`, `ReferenceDeck`, `useAutoGrowEditorHeight`) | reconcile with m3-ai `ModelSelector` / `ChatComposer` |

ArtCraft tier (storyteller backend specific):

| Package | Merges |
|---|---|
| `@artcraft/sdk` | api, api-enums, common, model-list, omni-gen, credits, subscription, google-analytics (TAG_ID to config), soundboard; hosts configurable (remove hardcodes in `StorytellerApiHostStore.ts`, `enums/Api.ts`, web app `index.tsx` ENV) |
| `@artcraft/desktop` | tauri-api + tauri-events (one BasicEventWrapper, generated bindings, dead commands removed) |
| `@artcraft/studio` | ui-promptbox (ArtCraft compositions), ui-pagedraw, ui-pagescene, ui-upload-modal, ui-vfx, ui-camera-settings-modal, ui-gallery-modal folders/dnd |
| `@artcraft/account` | ui-login-modal, ui-settings-modal, ui-pricing-modal, ui-pricing-table, provider-setup-modal, provider-billing-modal, ui-help-menu, markdown-content |

Delete: the 22 UI-kit packages of section 3 and storyteller-icons. Every survivor declares deps/peers and stops relying on
`packages/artcraft-frontend/tsconfig.base.json` paths; artcraft-frontend shrinks to build scripts (or folds into the web app).
Replace app-only Tailwind classes with `--md-sys-*` tokens / m3 Tailwind plugin, then remove the `--st-*` bridge (`aphrody.css`).
Net: 60 packages -> 5 shared additions + `@aphrody/tauri` extension + 4 ArtCraft packages.

### 5.2 Rust crates

| Crate | Merges / role |
|---|---|
| `artcraft-support` | errors, primitives, uuid_utils, web_base64, url_utils, mimetypes, filesys, memory_store, build_metadata, http_headers (feature-gated modules); removes 10 micro-crates and the rename aliasing |
| `artcraft-net` | client_identity + cookie_store (reconcile with `crates/cookie_store_wrapper`) + jwt_light (as module `jwt_unverified`) |
| `artcraft-types` | enums + tokens + api_defs (`enums::tauri` -> `enums::desktop`) |
| `artcraft_client` | keep |
| `artcraft_router` | keep; add per-media-kind features to cut compile cost for consumers |
| `artcraft-testkit` | test_data + test_utils (dev-only) |
| tauri-plugin-aphrody features `http`, `upload` | replace artcraft-tauri-plugin-http (delete after port) |

Provider clients (fal, grok_*, midjourney, worldlabs_*, kinovi, gmicloud, openai_sora, sqlite_tasks, file_to_base64_url) only need path updates.

### 5.3 Migration order

1. Hygiene, no behavior change: declare deps in all storyteller package.json; remove or wire the 11 dead commands; fix action-reminder self-import; merge duplicate BasicEventWrapper.
2. `@aphrody/tauri` gaps: http, upload, fetch, react hooks; switch all `@tauri-apps/*` imports to `@aphrody/tauri` (works against the tauri 2 backend as command names are unchanged). Delete storyteller-tauri-utils.
3. UI kit replacement inside remaining widgets, smallest first (label, badge, spinner, close-button, switch, checkbox, select, tooltip, popover, modal last). Move popover model-picker stores into model-selector.
4. Shared-tier extraction: m3-video-editor (lowest coupling) -> m3-media -> m3-canvas-boards -> m3-gen (after m3-ai reconciliation).
5. ArtCraft tier merges: sdk, desktop (generated bindings via specta), account, studio.
6. Rust consolidation: artcraft-support, artcraft-net, artcraft-types, artcraft-testkit; update provider clients.
7. Tauri fork port: http/upload into tauri-plugin-aphrody; move apps/artcraft to fork deps (edition 2024, CEF runtime, regenerated capabilities); manual validation of each provider login window (B5-B7).
8. Adoption: m3-showcase stories for each shared package -> app-ui/product (generation list, lightbox, gen selector) -> webos (media viewer, video editor, boards) -> play (lightbox, viewer) -> Craft studios via Rust router/client and artcraft_native egui pieces (`src/prompt_box`, `src/feed`) promoted into craft-ui.

### 5.4 Target consumers

| Consumer | Uses |
|---|---|
| webos | @aphrody/tauri (fetch/react), m3-media, m3-video-editor, m3-canvas-boards |
| play | @aphrody/tauri, m3-media (lightbox, viewer-3d) |
| product / app-ui | m3-gen, m3-media, m3-keybinds; optionally @artcraft/sdk |
| m3-showcase | all new `@aphrody/m3-*` packages (demos, visual tests) |
| Craft studios (egui) | artcraft_router, artcraft_client, artcraft-types, artcraft-support; egui widgets from artcraft_native into craft-ui |
| artcraft-web-app / apps/artcraft | everything above + `@artcraft/*` |

## Appendix: method

`find`/`wc -l` per member; import scan of `src/`; reverse-dependency scan across storyteller-* and `apps/artcraft-web-app/app`;
Cargo path-dependency scan across apps/crates/packages; diff of `invoke("...")` names vs `generate_handler!` list. No build, no bun run.
