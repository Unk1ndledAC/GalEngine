# GalEngine Example Project (demo_project)

This is a complete visual novel example project built with the GalEngine engine, demonstrating the engine's core functionality.

---

## Project Structure

```
demo_project/
├── settings.json              # Game project configuration file
├── assets/                  # Game asset directory
│   ├── backgrounds/           # Background images
│   ├── sprites/             # Character sprites
│   ├── cg/                  # CG images
│   ├── audio/
│   │   ├── bgm/             # Background music
│   │   ├── se/              # Sound effects
│   │   └── voice/           # Character voices
│   ├── fonts/               # Font files
│   └── ui/                  # UI assets
├── scripts/                 # Scene script directory
│   ├── prologue.json        # Prologue (JSON format)
│   ├── chapter1.md         # Chapter 1 (Markdown format)
│   ├── choice_a.json        # Choice branch A
│   ├── choice_b.json        # Choice branch B
│   └── ending.json         # Ending
└── ui-layout.json           # UI layout configuration file
```

---

## Quick Start

### 1. Prepare Assets

Place the following assets into their corresponding directories (any files with matching names can be used as substitutes):

| Asset Type | Required Files | Description |
|-----------|----------|------|
| Backgrounds | `bg_classroom.png`, `bg_corridor.png`, `bg_sunset.png` | Classroom, corridor, sunset |
| Sprites | `alice_normal.png`, `alice_smile.png`, `bob_normal.png` | Alice and Bob sprites |
| CG | `cg_ending.png` | Ending CG |
| BGM | `bgm_everyday.ogg`, `bgm_happy.ogg`, `bgm_lonely.ogg` | Everyday, happy, lonely |
| Sound Effects | `se_bell.ogg`, `se_chime.ogg` | Bell, chime |

> **Tip**: If you don't have suitable assets, you can rename any image/audio files as placeholders to experience the workflow.

### 2. Open Project in Editor

```bash
cd editor_ts
npm run electron:dev
# After startup: Menu → File → Open Project → Select demo_project directory
```

### 3. Edit and Preview

- Click `.json` or `.md` files in the left Explorer to edit scene scripts
- Click the **Preview** button in the top-right to see live game preview
- Use the **Debug** panel to view runtime logs

---

## Scene Script Overview

| File | Format | Description |
|------|------|------|
| `prologue.json` | JSON | Prologue: background switching, sprite display, dialogue, and choice branching |
| `chapter1.md` | Markdown (@cmd) | Chapter 1: story writing in Markdown format |
| `choice_a.json` | JSON | Choice branch A: continuation after actively greeting |
| `choice_b.json` | JSON | Choice branch B: continuation after silently nodding |
| `ending.json` | JSON | Ending: conditional branching (`if` command) and CG display |

---

## Feature Demonstration

This example project demonstrates the following GalEngine core features:

- ✅ Background switching (fade transition)
- ✅ Character sprite show/hide
- ✅ Dialogue system (with speaker names)
- ✅ Narration
- ✅ Choice branching
- ✅ Global variables (set_flag / if)
- ✅ Scene jumping (jump)
- ✅ BGM playback control
- ✅ Sound effect playback
- ✅ CG display
- ✅ Dual script formats (JSON + Markdown)

---

## Next Steps

- Read `docs/en/developer_guide.md` for detailed engine usage
- Try the AI scene generation feature in the editor: open the AI Assistant panel and describe a scene in natural language
- Modify this project as a base to create your own visual novel!

---

*GalEngine Development Team | Example Project Version v0.2.0*
