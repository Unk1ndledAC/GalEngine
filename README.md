# GalEngine TypeScript Version

[![Electron](https://img.shields.io/badge/electron-42.3.0-blue.svg)](https://www.electronjs.org/)

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Layered architecture** | base → platform → engine → workbench. Strict dependency direction (lower never depends on upper). |
| **Contrib pattern** | Loose-coupled feature modules; each is a self-contained dir under `workbench/contrib/`. |
| **Service Locator** | Simplified singleton registry for cross-cutting services (VFS, LLM providers, plugin host). |
| **Monaco as core editor** | `MonacoEditor.tsx` wraps `@monaco-editor/react` for JSON/Markdown scene script editing. |
| **Plugin system** | `PluginHost` manages activate/deactivate lifecycle + contribution points (commands, panels, LLM providers). |
| **Pure-logic / UI split** | `engine/` contains all game logic (zero DOM dependency); `workbench/` handles React UI. |
| **React MenuBar** | All menus (File/Edit/View/Help) live in the React layer via `MenuBar.tsx`; native Electron menu is hidden. |

---

## 2. Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  main.ts            Electron main process               │
│                      BrowserWindow, IPC, native dialogs │
│  preload.ts          Context bridge (galengine API)    │
├─────────────────────────────────────────────────────────┤
│  src/workbench/     IDE-like workbench (React)         │
│  ├── parts/         Layout parts                        │
│  │   ├── ActivityBar.tsx   Left icon rail               │
│  │   ├── Sidebar.tsx       Explorer / Plugins / LLM     │
│  │   ├── MenuBar.tsx       VSCode-style top menu bar     │
│  │   ├── EditorArea.tsx    Monaco × N + WelcomeScreen   │
│  │   ├── BottomPanel.tsx   Output / Debug / Terminal    │
│  │   └── StatusBar.tsx     Status bar                   │
│  ├── contrib/       Feature contributions               │
│  │   ├── welcome/          Welcome + New Project         │
│  │   ├── project/          ProjectStore (zustand)       │
│  │   ├── explorer/          Project file tree            │
│  │   ├── editor/            Monaco editor wrapper + store │
│  │   ├── preview/           Live game preview (Canvas2D) │
│  │   ├── debug/             Debug console                │
│  │   ├── llm/               LLM chat / copilot / scene gen│
│  │   └── plugins/           Plugin manager UI            │
│  └── styles/         global.css                         │
├─────────────────────────────────────────────────────────┤
│  src/engine/        Visual novel engine (pure logic)    │
│  ├── types.ts            All data model interfaces      │
│  ├── config.ts           EngineConfig                   │
│  ├── loader.ts           ProjectLoader                  │
│  ├── parser.ts           JSON + Markdown parser (@cmd)  │
│  ├── scene.ts            SceneManager                   │
│  ├── dialogue.ts         DialogueSystem                 │
│  ├── sprite.ts           SpriteManager                  │
│  ├── audio.ts            AudioManager (Web Audio API)   │
│  ├── save.ts             SaveManager                    │
│  ├── flowchart.ts        Flowchart                      │
│  ├── engine.ts           GalEngine main class           │
│  └── preview/            Canvas2D renderer              │
├─────────────────────────────────────────────────────────┤
│  src/platform/       Platform services                  │
│  ├── electron-vfs.ts     Electron file system (IPC)     │
│  ├── node-vfs.ts         Node.js file system            │
│  ├── ipc.ts              IPC channel definitions        │
│  └── plugin/             PluginHost (lifecycle + registry)│
├─────────────────────────────────────────────────────────┤
│  src/base/           Zero-dependency utilities           │
│  ├── event.ts            Event/Emitter (typed events)   │
│  ├── lifecycle.ts         Disposable pattern            │
│  ├── async.ts             Deferred, helpers             │
│  ├── uri.ts               URI / path utilities           │
│  └── types.ts             Shared utility types           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Directory Layout

```
GE TS ver/               ← project root (contains editor + engine)
├── src/
│   ├── main.ts              ← Electron main process
│   ├── preload.ts            ← Context bridge (galengine API)
│   ├── renderer.tsx         ← React entry
│   ├── global.d.ts          ← Window type augmentation
│   │
│   ├── base/                ← [Layer 0] Zero-dependency
│   │   ├── event.ts
│   │   ├── lifecycle.ts
│   │   ├── async.ts
│   │   ├── uri.ts
│   │   └── types.ts
│   │
│   ├── platform/            ← [Layer 1] Platform services
│   │   ├── electron-vfs.ts
│   │   ├── node-vfs.ts
│   │   ├── ipc.ts
│   │   └── plugin/
│   │       └── PluginHost.ts
│   │
│   ├── engine/              ← [Layer 2] VN Engine (pure logic)
│   │   ├── types.ts
│   │   ├── config.ts
│   │   ├── loader.ts
│   │   ├── parser.ts
│   │   ├── scene.ts
│   │   ├── dialogue.ts
│   │   ├── sprite.ts
│   │   ├── audio.ts
│   │   ├── save.ts
│   │   ├── flowchart.ts
│   │   ├── engine.ts
│   │   └── preview/
│   │       └── PreviewRenderer.ts
│   │
│   ├── workbench/           ← [Layer 3] React IDE
│   │   ├── App.tsx
│   │   ├── parts/
│   │   │   ├── ActivityBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MenuBar.tsx        ← React menu bar (File/Edit/View/Help)
│   │   │   ├── EditorArea.tsx
│   │   │   ├── BottomPanel.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── contrib/
│   │   │   ├── welcome/      WelcomeScreen.tsx
│   │   │   ├── project/      ProjectStore.ts
│   │   │   ├── explorer/     FileTree.tsx
│   │   │   ├── editor/       EditorStore.ts, MonacoEditor.tsx, EditorCommands.ts
│   │   │   ├── preview/      PreviewPanel.tsx, PreviewStore.ts
│   │   │   ├── debug/        DebugPanel.tsx
│   │   │   ├── llm/          AIChatPanel, LLMPanel, SceneGenerator
│   │   │   └── plugins/      PluginManager.tsx
│   │   └── styles/
│   │       └── global.css
│   │
│   └── i18n/
│       ├── translations.ts   ← zh-CN / ja-JP / en-US translations
│       └── useTranslation.ts
│
├── schemas/                ← JSON Schema + format specs
│   ├── scene.schema.json
│   ├── settings.schema.json
│   ├── ui-layout.schema.json
│   ├── markdown-script-spec.{zh-CN,en,ja}.md
│   └── gpk-format-spec.{zh-CN,en,ja}.md
│
├── docs/                   ← Developer guides (zh-CN/en/ja)
│
├── examples/               ← Demo project
│   └── demo_project/
│
├── resources/              ← Icons, platform configs
│
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── vite.config.ts
└── electron-builder.yml   ← Packaging config
```

---

## 4. Build System

| Tool | Purpose |
|------|---------|
| **Vite** | Dev server + HMR + production renderer build |
| **TypeScript** | Type checking + main process compilation |
| **electron-builder** | Packaging: NSIS (Windows), DMG (macOS), AppImage/deb (Linux) |

### Key Scripts

```bash
npm install              # Install dependencies
npm run dev              # Vite dev server (renderer only)
npm run electron:dev      # Dev mode with Electron + HMR
npm run build            # Compile main + build renderer
npm run start            # Build + launch Electron (production mode)
npm run package          # Full packaging pipeline → NSIS installer
npm run package:win      # Windows NSIS installer only
npm run typecheck        # TypeScript check (no emit)
```

---

## 5. Menu Bar Architecture

All menus are implemented in **React** (`MenuBar.tsx`), not the native Electron menu. The native menu bar is hidden on startup (`Menu.setApplicationMenu(null)` on Windows/Linux).

**Menu structure:**

| Menu | Items |
|------|-------|
| **File** | New Project, Open Project, Save, Save As, Close Project |
| **Edit** | Undo, Redo, Cut, Copy, Paste, Select All, Find, Replace, Find in Files |
| **View** | Toggle Developer Tools, Reset Zoom, Toggle Full Screen |
| **Help** | About |

**Edit commands** (Undo/Redo/Cut/Copy/Paste/Select All) are dispatched to the active Monaco editor instance via `EditorCommands.ts`. Monaco stores are registered on mount (`setActiveEditor`) and cleaned up on unmount.

---

## 6. Editor Integration

**Monaco Editor** (`MonacoEditor.tsx`) is the primary text editing component:

- Uses `@monaco-editor/react` with local package (no CDN dependency)
- `automaticLayout: false` — layout is driven by a `ResizeObserver` on the container wrapper
- Registers GalEngine-specific JSON schema for `.scene.json` files
- Integrates with `EditorCommands.ts` for menu bar access
- Local `loadingPath` state avoids Zustand staleness bugs on fast tab switches

**Preview Panel** (`PreviewPanel.tsx`) embeds a Canvas2D renderer for live game preview:

- Creates `InMemoryVFS` for the engine to read from
- Manages `PreviewRenderer` lifecycle (create/dispose on play/stop)
- Image cache via `PreviewStore` (global `Map` keyed by asset path)
- `pause()` / `resume()` on the renderer (not dispose) for memory efficiency

---

## 7. Plugin System Design

The plugin system uses a simplified host pattern. Plugins declare activation events and contribution points via a manifest.

**Plugin lifecycle:**
- **Discovery**: `PluginHost` scans configured plugin directories
- **Activation**: triggered by events (`onCommand`, `onProjectOpen`, etc.)
- **Deactivation**: cleanup on unload or app exit

**Contribution points:**
- `commands` — register commands
- `panels` — add custom panels to workbench
- `llmProviders` — register custom LLM backends
- `languages` — register custom script language support

---

## 8. LLM Integration

Located in `src/workbench/contrib/llm/`:

- **AIChatPanel** — chat interface with context awareness (current scene, selected commands)
- **LLMPanel** — provider/model configuration
- **LLMProviders** — provider abstraction (local Ollama / cloud OpenAI, Claude)
- **LLMStore** — zustand store for LLM state
- **SceneGenerator** — AI-assisted scene script generation
- Integrated as a workbench sidebar panel

---

## 9. i18n

All UI strings are translated via `src/i18n/translations.ts`. Supported locales: `zh-CN`, `ja-JP`, `en-US`. Language preference is persisted in `~/.galengine/settings.json` and takes effect immediately without restart.

Translation keys are type-checked via `TranslationKey` union type — missing keys cause TypeScript errors at compile time.
