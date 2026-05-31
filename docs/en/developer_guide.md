# GalEngine Developer Guide (English)

> GalEngine — A Python-based open-source visual novel (galgame) engine.
> Version: v0.1.0 | Last updated: 2026-05-31

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

GalEngine is an open-source visual novel engine written in Python, featuring:

- **Multi-format scripts**: Supports both JSON and Markdown scene script formats
- **GUI Editor**: Built-in web editor with drag-and-drop scene editing
- **Cross-platform**: Supports Windows / macOS / Linux
- **Patch system**: Supports `.gpk` data packages for incremental content delivery
- **Multi-language**: Engine UI and documentation in Chinese, English, and Japanese

### System Requirements

| Component | Minimum | Recommended |
|-----------|----------|-------------|
| Python    | 3.10+   | 3.12+      |
| RAM       | 2 GB    | 4 GB+      |
| Disk      | 200 MB (with dependencies) | 1 GB+ |
| GPU       | OpenGL 3.3 support | Dedicated GPU |

---

## 2. Installation & Environment

### 2.1 Install GalEngine

```bash
# Clone the repository
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -m galengine --version
# Expected output: GalEngine v0.1.0
```

### 2.2 Dependencies

Core dependencies (included in `requirements.txt`):

```
pygame>=2.5.0
Pillow>=10.0.0
pydub>=0.25.0
jinja2>=3.1.0
click>=8.1.0
watchdog>=4.0.0
```

### 2.3 Verify Installation

```bash
# Run example project
python -m galengine --project examples/demo_project --preview

# Launch GUI editor
python -m galengine.editor
# Then open http://localhost:8080 in your browser
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

Markdown format is more suitable for hand-writing stories, with clean and intuitive syntax.

#### Basic Syntax

```markdown
# Prologue

==background: bg_classroom.png==

==bgm: bgm_everyday.ogg==

### Alice

Good morning! Another energetic day!

(Voice: voice/alice_greeting.ogg)

### Narration

The sunlight in the classroom is especially warm.

### Choice

?? What will you do?

- [Greet actively] -> choice_a
- [Walk past silently] -> choice_b

## choice_a

==show_sprite: alice_normal.png, center==

### Alice

Wow, you greeted me first!

## choice_b

==hide_sprite: alice==

### Narration

You walk past the classroom door silently.

### System

==jump: chapter1==
```

#### Markdown Syntax Reference

| Syntax | Description |
|--------|-------------|
| `# Title` | Scene name (level-1 heading) |
| `### Character` | Dialogue speaker |
| `### Narration` | Narration content |
| `==background: xxx==` | Switch background |
| `==show_sprite: xxx, pos==` | Show sprite (position: left/center/right) |
| `==bgm: xxx==` | Play BGM |
| `?? Question` | Choice prompt |
| `- [Choice] -> target` | Choice and jump target |
| `==jump: target==` | Jump to scene |
| `==cg: xxx==` | Show CG |
| `(Voice: path)` | Associate voice file |

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

GalEngine has a built-in web GUI editor for visual scene editing.

### 7.1 Launch the Editor

```bash
python -m galengine.editor
# Then open http://localhost:8080 in your browser
```

### 7.2 Interface Layout

The editor interface is divided into four areas:

1. **Left sidebar**: Project file tree / Asset panel (switchable)
2. **Center canvas**: Scene visual editing area
3. **Right property panel**: Selected element property editing
4. **Bottom timeline**: Scene command sequence

### 7.3 Basic Operations

| Operation | Method |
|-----------|--------|
| Add asset | Drag file to asset panel, or click "Import" button |
| Add dialogue | Click toolbar "+ Dialogue" button |
| Add choice | Click toolbar "+ Choice" button |
| Switch background | Drag background image from asset panel to canvas |
| Place sprite | Drag sprite from asset panel to canvas, drag to adjust position |
| Preview scene | Click toolbar "Preview" button |
| Compile game | Click toolbar "Compile" button |

### 7.4 Three Editing Modes

The editor supports three editing modes, switchable via the toolbar:

1. **Scene Edit Mode** (default): Edit dialogue, choices, backgrounds, sprites
2. **Flowchart Mode**: Visual editing of game branch flow, drag to create nodes and edges
3. **UI Layout Mode**: Visual editing of UI element positions and styles |

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

*GalEngine Development Team | Documentation Version v0.1.0*
