# GalEngine Developer Guide (English)

> GalEngine — An Electron + React + TypeScript open-source visual novel (galgame) engine editor.
> Version: v0.2.0 | Last updated: 2026-06-02

---

## Table of Contents

1. [Overview](#1-overview)
2. [Installation & Environment](#2-installation--environment)
3. [Project Structure](#3-project-structure)
4. [Game Project Configuration (settings.json)](#4-game-project-configuration-settingsjson)
5. [Scene Script Writing](#5-scene-script-writing)
6. [Compilation & Packaging](#6-compilation--packaging)
7. [Using the GUI Editor](#7-using-the-gui-editor)
8. [Appendix: JSON Schema](#8-appendix-json-schema)
9. [FAQ](#9-faq)

---

## 1. Overview

GalEngine is an open-source visual novel engine editor, built with Electron + React + TypeScript, featuring:

- **Multi-format scripts**: Supports both JSON and Markdown scene script formats (using `@command` syntax)
- **GUI Editor**: Built-in Monaco Editor with JSON syntax highlighting, auto-completion, and live preview
- **Cross-platform**: Supports Windows / macOS / Linux
- **Patch system**: Supports `.gpk` data packages for incremental content delivery
- **Multi-language**: Engine UI and documentation in Chinese, English, and Japanese

### System Requirements

| Component | Minimum | Recommended |
|-----------|----------|-------------|
| Node.js  | 18+      | 20+         |
| RAM       | 2 GB     | 4 GB+       |
| Disk      | 500 MB (with dependencies) | 1 GB+ |

---

## 2. Installation & Environment

### 2.1 Install the Editor

```bash
# Clone the repository
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine/editor_ts

# Install dependencies
npm install

# Start dev mode
npm run electron:dev
```

### 2.2 Verify Installation

```bash
# Start Electron dev mode
npm run electron:dev
# Editor opens as a desktop window (1400×900)

# Or start Vite dev server (no Electron)
npm run dev
```

---

## 3. Project Structure

A standard GalEngine game project structure:

```
my_game/
├── settings.json          # Game project config file (required)
├── assets/              # Game assets directory
│   ├── backgrounds/     # Background images (.png/.jpg/.webp)
│   ├── sprites/         # Character sprites (supports variants)
│   ├── cg/             # CG images
│   ├── audio/          # Audio files
│   │   ├── bgm/       # Background music
│   │   ├── se/        # Sound effects
│   │   └── voice/     # Character voices
│   ├── fonts/          # Font files (.ttf/.otf)
│   └── ui/             # UI assets
├── scripts/             # Scene scripts directory
│   ├── prologue.json   # JSON format scene script
│   ├── chapter1.md     # Markdown format scene script
│   └── ...
├── patches/             # Patch files directory (.gpk files)
├── build/               # Build output directory
└── ui-layout.json       # UI layout config file (optional)
```

---

## 4. Game Project Configuration (settings.json)

`settings.json` is the core configuration file for every game project.

### 4.1 Complete Example

```json
{
  "project": {
    "name": "My Galgame",
    "version": "1.0.0",
    "author": "Your Name",
    "resolution": [1280, 720]
  },
  "window": {
    "width": 1280,
    "height": 720,
    "title": "My Galgame",
    "icon": "assets/ui/icon.png",
    "fullscreen": false
  },
  "assets": {
    "backgrounds": "assets/backgrounds",
    "sprites": "assets/sprites",
    "cgs": "assets/cg",
    "audio": "assets/audio",
    "fonts": "assets/fonts",
    "ui": "assets/ui"
  },
  "scenes": {
    "prologue": "scripts/prologue.json",
    "chapter1": "scripts/chapter1.md",
    "ending_a": "scripts/ending_a.json"
  },
  "ui": {
    "layout": "ui-layout.json",
    "textbox": {
      "position": [100, 500],
      "size": [1080, 200],
      "background": "assets/ui/textbox.png",
      "text_color": "#FFFFFF",
      "name_color": "#FF8888",
      "font_size": 24
    }
  },
  "audio": {
    "master_volume": 0.8,
    "bgm_volume": 0.6,
    "se_volume": 0.7,
    "voice_volume": 0.9
  },
  "save": {
    "slots": 20,
    "screenshot_width": 320,
    "screenshot_height": 180
  }
}
```

### 4.2 Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `project.name` | string | Game name |
| `project.version` | string | Game version |
| `project.resolution` | [int, int] | Game resolution [width, height] |
| `window.width` | int | Window width (pixels) |
| `window.height` | int | Window height (pixels) |
| `window.fullscreen` | bool | Default to fullscreen? |
| `assets.*` | string | Asset directory paths |
| `scenes` | object | Scene ID → script file path mapping |
| `ui.layout` | string | UI layout config file path |
| `save.slots` | int | Number of save slots |

---

## 5. Scene Script Writing

GalEngine supports **JSON** and **Markdown** formats for scene scripts.

### 5.1 JSON Format

JSON format is suitable for programmatically generated scenes or integration with other tools.

#### Basic Structure

```json
{
  "id": "prologue",
  "name": "Prologue",
  "commands": [
    {
      "type": "background",
      "data": {
        "image": "bg_classroom.png",
        "transition": "fade",
        "duration": 1.0
      }
    },
    {
      "type": "dialogue",
      "data": {
        "character": "alice",
        "display_name": "Alice",
        "text": "Good morning! Another energetic day!",
        "voice": "voice/alice_greeting.ogg",
        "sprite": "alice_normal.png"
      }
    },
    {
      "type": "choice",
      "data": {
        "prompt": "What will you do?",
        "choices": [
          { "text": "Greet actively", "target": "choice_a" },
          { "text": "Walk past silently", "target": "choice_b" }
        ]
      }
    }
  ]
}
```

#### Command Types

| Type | Description | Main Fields |
|------|-------------|---------------|
| `background` | Switch background | `image`, `transition`, `duration` |
| `dialogue` | Dialogue | `character`, `display_name`, `text`, `voice`, `sprite` |
| `narration` | Narration | `text` |
| `choice` | Choice branch | `prompt`, `choices` ([`text`, `target`]) |
| `show_sprite` | Show sprite | `character`, `sprite`, `position`, `transition` |
| `hide_sprite` | Hide sprite | `character`, `transition` |
| `bgm` | Play BGM | `file`, `loop`, `fade_in` |
| `se` | Play SFX | `file`, `volume` |
| `voice` | Play voice | `file`, `character` |
| `set_flag` | Set global flag | `key`, `value` |
| `if` | Conditional branch | `condition`, `then`, `else` |
| `jump` | Jump to scene | `target` |
| `cg` | Show CG | `image`, `duration` |

### 5.2 Markdown Format

Markdown format is more suitable for hand-writing stories, with clean and intuitive syntax. All commands begin with `@`.

#### Basic Syntax

```markdown
# scene_prologue: Prologue
chapter: Prologue
route: common

@background bg_classroom.png fade 1.0
@bgm bgm_everyday.ogg loop:true fade:1.0

@show alice default right fade 0.5

@dialogue alice
Good morning! Another energetic day!

@narration
The sunlight in the classroom is especially warm.

@choice What will you do?
- [Greet back] -> label_callout | affection_alice=1
- [Walk past] -> label_leave

@label label_callout
@dialogue protagonist
Wait!

@jump scene_chapter1

@label label_leave
@narration
Watching her figure disappear through the door.
@end scene_chapter1
```

#### Markdown Syntax Reference

| Syntax | Description |
|--------|-------------|
| `# scene_id` | Scene ID (filename is scene_id) |
| `chapter:` / `route:` | Chapter/route metadata |
| `@dialogue character_id [display_name]` | Dialogue (display_name optional) |
| `@narration` | Narration |
| `@show character sprite [left\|center\|right]` | Show sprite |
| `@hide character [transition] [duration]` | Hide sprite |
| `@background filename [transition] [duration]` | Switch background |
| `@bgm filename [loop:true] [fade:n]` | Play BGM |
| `@sfx filename` | Play sound effect |
| `@voice filename [character_id]` | Play voice |
| `@choice prompt` + `- [Choice] -> target` | Choice branch |
| `@label label_name` | Define jump label |
| `@jump label_name` | Jump to label |
| `@set flag_name=value` | Set variable |
| `@if condition ... @endif` | Conditional branch |
| `@cg filename` | Show CG |
| `@transition effect duration` | Transition effect |
| `@wait seconds` | Wait |
| `@end [next_scene_id]` | End scene |

### 5.3 Format Comparison

| Feature | JSON Format | Markdown Format |
|---------|-------------|-----------------|
| Readability | Moderate | Excellent |
| Hand-writing friendly | Poor | Excellent |
| Tool generation | Excellent | Fair |
| Complex logic | Better support | Limited support |
| Recommended use | Tool generation, complex branches | Hand-writing, quick prototyping |

**Recommendation**: Use Markdown for story writing, use JSON for complex branching logic, or use the GUI editor to generate scripts.

---

## 6. Compilation & Packaging

### 6.1 Compile via CLI

```bash
# Compile entire project
python -m galengine.cli compile --project ./my_game --output ./build

# Compile specific scenes
python -m galengine.cli compile --project ./my_game --scenes prologue,chapter1

# Compile patch package (partial scenes)
python -m galengine.cli compile-patch --project ./my_game --scenes new_chapter --output patches/patch_001.gpk
```

### 6.2 Compilation Output

After compilation, `build/` directory structure:

```
build/
├── game.pkg              # Compiled game data package
├── engine/              # Engine runtime
│   └── galengine_runtime.exe  # Windows executable
├── assets/              # Packaged assets (compressed)
└── manifest.json        # Build manifest
```

### 6.3 Package as Standalone Executable

```bash
# Use PyInstaller to package (requires pyinstaller installed)
python -m galengine.cli package --project ./my_game --output ./dist

# Output: dist/MyGame.exe (Windows) or dist/MyGame.app (macOS)
```

### 6.4 Patch System

GalEngine supports incremental content delivery via `.gpk` patch packages:

1. Place patch files (`.gpk`) into the game directory's `patches/` folder
2. When launching the game, the engine automatically scans and loads compatible patches
3. Patches include version info; the engine checks version compatibility with the base game

---

## 7. Using the GUI Editor

GalEngine has a built-in Electron desktop editor based on Monaco Editor, with visual scene editing and live preview.

### 7.1 Launch the Editor

```bash
cd editor_ts
npm run electron:dev
```

The editor opens as a standalone desktop window (1400×900).

### 7.2 Interface Layout

The editor interface is divided into the following areas:

1. **Top Menu Bar**: File / Edit / View / Help (VSCode-style)
2. **Left Activity Bar**: Explorer / Plugins / AI Assistant / Debug
3. **Left Sidebar**: Project file tree / Asset panel (switchable)
4. **Center Editor**: Monaco Editor with multi-tab support
5. **Right Sidebar**: Optional panels (outline, etc.)
6. **Bottom Panel**: Debug output / Search / Terminal
7. **Bottom Status Bar**: Encoding / Language / Cursor position

### 7.3 Basic Operations

| Operation | Method |
|-----------|--------|
| Open file | Click a file in the Explorer |
| Save file | Menu → File → Save, or Ctrl+S |
| New project | Menu → File → New Project |
| Open project | Menu → File → Open Project |
| Live preview | Click the "Preview" button or ▶ button in the top-right |
| Find/Replace | Menu → Edit → Find / Replace, or Ctrl+F / Ctrl+H |

### 7.4 AI Scene Generation

The editor has a built-in AI Assistant panel supporting:
- Natural language description to generate scene scripts (JSON format)
- Integration with OpenAI / Claude / Ollama LLM backends
- Auto-insert generated content into the current editing file

---

## 8. Appendix: JSON Schema

### 8.1 settings.json Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GalEngine Project Settings",
  "type": "object",
  "required": ["project", "assets", "scenes"],
  "properties": {
    "project": { "type": "object", "required": ["name", "version"] },
    "window": { "type": "object" },
    "assets": { "type": "object", "required": ["backgrounds", "sprites"] },
    "scenes": { "type": "object", "additionalProperties": { "type": "string" } },
    "ui": { "type": "object" },
    "audio": { "type": "object" },
    "save": { "type": "object" }
  }
}
```

### 8.2 Scene Script JSON Schema

See `schemas/scene.schema.json` (bundled with the engine).

---

## 9. FAQ

### Q1: How do I set up different character sprite variants (expressions/outfits)?

In the `assets/sprites/` directory, prepare multiple images for each character, named as: `character_variant.png`, e.g.:
- `alice_normal.png` (normal expression)
- `alice_smile.png` (smiling)
- `alice_angry.png` (angry)

Switch variants in scene scripts:
```json
{
  "type": "show_sprite",
  "data": {
    "character": "alice",
    "sprite": "alice_smile.png",
    "transition": "fade"
  }
}
```

### Q2: How do I release patches (DLC)?

1. Write new scene content in the editor
2. Click "Compile Patch", select scenes to package
3. Distribute the generated `.gpk` file to players
4. Players place the `.gpk` file into the game directory's `patches/` folder
5. Restart the game, patch content loads automatically

### Q3: Which image/audio formats are supported?

- **Images**: PNG (recommended), JPG, WEBP
- **Audio**: OGG (recommended), MP3, WAV

### Q4: How do I customize UI layout?

Edit `ui-layout.json` (or use the editor's "UI Layout Mode" for visual editing):

```json
{
  "elements": [
    {
      "id": "textbox",
      "type": "panel",
      "x": 100, "y": 500,
      "width": 1080, "height": 200,
      "style": {
        "background_color": "rgba(0,0,0,0.7)",
        "text_color": "#FFFFFF",
        "text_size": 24
      },
      "visible": true
    }
  ]
}
```

### Q5: How do I distribute after compilation?

- **Method 1**: Distribute the entire `build/` directory (includes engine runtime and game data)
- **Method 2**: Use the `package` command to package as a single executable (.exe / .app)
- **Method 3**: Distribute the base version first, then update content via `.gpk` patch packages

---

*GalEngine Development Team | Documentation Version v0.2.0*
