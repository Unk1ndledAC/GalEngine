# GalEngine TypeScript Version

[![TypeScript](https://img.shields.io/badge/typescript-5.6%2B-blue.svg)](https://www.typescriptlang.org/)

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Layered architecture** | base → platform → engine → workbench. Strict dependency direction (lower never depends on upper). |
| **Contrib pattern** | Loose-coupled feature modules; each is a self-contained dir under `workbench/contrib/`. |
| **Service Locator** | Simplified singleton registry for cross-cutting services (VFS, LLM providers, plugin host). |
| **Monaco as core editor** | `MonacoEditor.tsx` wraps `@monaco-editor/react` for JSON/Markdown scene script editing. |
| **Plugin system** | `PluginHost` manages activate/deactivate lifecycle + contribution points (commands, panels, LLM providers). |
| **Pure-logic / UI split** | `engine/` contains all game logic (zero DOM dependency); `workbench/` handles React UI. |

---

## 2. Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  main.ts            Electron main process               │
│                      BrowserWindow, IPC, native menus   │
│  preload.ts          Context bridge (galengine API)     │
├─────────────────────────────────────────────────────────┤
│  src/workbench/     IDE-like workbench (React)          │
│  ├── parts/         Layout parts                        │
│  │   ├── ActivityBar.tsx   Left icon rail               │
│  │   ├── Sidebar.tsx       Explorer / Plugins / LLM     │
│  │   ├── EditorArea.tsx    Monaco × N + WelcomeScreen   │
│  │   ├── BottomPanel.tsx   Output / Debug / Terminal    │
│  │   └── StatusBar.tsx     Status bar                   │
│  ├── contrib/       Feature contributions               │
│  │   ├── welcome/          Welcome + New Project        │
│  │   ├── project/          ProjectStore (zustand)       │
│  │   ├── explorer/         Project file tree            │
│  │   ├── editor/           Monaco editor wrapper        │
│  │   ├── preview/          Live game preview (Canvas2D) │
│  │   ├── debug/            Debug console                │
│  │   ├── llm/              LLM chat / copilot / scene gen│
│  │   └── plugins/          Plugin manager UI            │
│  └── styles/        global.css                          │
├─────────────────────────────────────────────────────────┤
│  src/engine/        Visual novel engine (pure logic)    │
│  ├── types.ts            All data model interfaces      │
│  ├── config.ts           EngineConfig                   │
│  ├── loader.ts           ProjectLoader                  │
│  ├── parser.ts           JSON + Markdown parser         │
│  ├── scene.ts            SceneManager                   │
│  ├── dialogue.ts         DialogueSystem                 │
│  ├── sprite.ts           SpriteManager                  │
│  ├── audio.ts            AudioManager (Web Audio API)   │
│  ├── save.ts             SaveManager                    │
│  ├── flowchart.ts        Flowchart                      │
│  ├── engine.ts           GalEngine main class           │
│  └── preview/            Canvas2D renderer              │
├─────────────────────────────────────────────────────────┤
│  src/platform/      Platform services                   │
│  ├── electron-vfs.ts     Electron file system           │
│  ├── node-vfs.ts         Node.js file system            │
│  ├── ipc.ts              IPC channel definitions        │
│  └── plugin/             PluginHost (lifecycle + registry)│
├─────────────────────────────────────────────────────────┤
│  src/base/          Zero-dependency utilities           │
│  ├── event.ts            Event/Emitter (typed events)   │
│  ├── lifecycle.ts        Disposable pattern             │
│  ├── async.ts            Deferred, helpers              │
│  ├── uri.ts              URI / path utilities            │
│  └── types.ts            Shared utility types            │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Directory Layout

```
editor_ts/
├── ARCHITECTURE.md          ← this file
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── vite.config.ts
├── electron-builder.yml     ← packaging config
├── index.html               ← Vite HTML entry
│
├── src/
│   ├── main.ts              ← Electron main process
│   ├── preload.ts           ← Context bridge
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
│   ├── platform/            ← [Layer 1] Services
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
│   └── workbench/           ← [Layer 3] React IDE
│       ├── App.tsx
│       ├── parts/
│       │   ├── ActivityBar.tsx
│       │   ├── Sidebar.tsx
│       │   ├── EditorArea.tsx
│       │   ├── BottomPanel.tsx
│       │   └── StatusBar.tsx
│       ├── contrib/
│       │   ├── welcome/     WelcomeScreen.tsx
│       │   ├── project/     ProjectStore.ts
│       │   ├── explorer/    FileTree.tsx
│       │   ├── editor/      EditorStore.ts, MonacoEditor.tsx
│       │   ├── preview/     PreviewPanel.tsx, PreviewStore.ts
│       │   ├── debug/       DebugPanel.tsx
│       │   ├── llm/         AIChatPanel, LLMPanel, SceneGenerator
│       │   └── plugins/     PluginManager.tsx
│       └── styles/
│           └── global.css
│
├── scripts/                 ← Build & utility scripts
│   ├── build-package.ps1
│   └── generate-icon.py
│
└── resources/               ← Static resources
    ├── entitlements.mac.plist
    ├── icons/
    │   ├── icon.ico
    │   ├── icon.png
    │   └── icon.icns.txt
    └── (future: templates/)
```

---


## 4. Build System

| Tool | Purpose |
|------|---------|
| **Vite** | Dev server + HMR + production renderer build |
| **TypeScript** | Type checking + main process compilation |
| **electron-builder** | Packaging: NSIS (Windows), DMG (macOS), AppImage/deb (Linux) |
| **Vitest** | Testing (future) |
| **ESLint + Prettier** | Code quality (future) |

### Key Scripts

```bash
npm run dev            # Vite dev server (renderer only)
npm run build          # Compile main + build renderer
npm run start          # Build + launch Electron (production mode)
npm run electron:dev   # Dev mode with Vite HMR
npm run package        # Full packaging pipeline (PowerShell)
npm run package:win    # Windows NSIS installer
npm run typecheck      # TypeScript check (no emit)
```

---

## 5. Plugin System Design

The plugin system uses a simplified host pattern. Plugins declare activation events and contribution points via a manifest.

**Plugin lifecycle**:
- **Discovery**: `PluginHost` scans configured plugin directories
- **Activation**: triggered by events (`onCommand`, `onProjectOpen`, etc.)
- **Deactivation**: cleanup on unload or app exit

**Contribution points** (planned):
- `commands` — register commands
- `panels` — add custom panels to workbench
- `llmProviders` — register custom LLM backends
- `languages` — register custom script language support

---

## 6. LLM Integration

Located in `src/workbench/contrib/llm/`:
- **AIChatPanel** — chat interface with context awareness (current scene, selected commands)
- **LLMPanel** — provider/model configuration
- **LLMProviders** — provider abstraction (local Ollama / cloud OpenAI, Claude)
- **LLMStore** — zustand store for LLM state
- **SceneGenerator** — AI-assisted scene script generation
- Integrated as a workbench sidebar panel
