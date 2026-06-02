# GalEngine 开发指引（中文版）

> GalEngine —— 基于 TypeScript 的开源视觉小说（Galgame）引擎编辑器。
> 版本：v0.2.0 | 最后更新：2026-06-02

---

## 目录

1. [概述](#1-概述)
2. [安装与运行环境](#2-安装与运行环境)
3. [项目结构](#3-项目结构)
4. [游戏项目配置（settings.json）](#4-游戏项目配置settingsjson)
5. [场景脚本编写](#5-场景脚本编写)
6. [编译与打包](#6-编译与打包)
7. [图形化编辑器使用](#7-图形化编辑器使用)
8. [附录：JSON Schema](#8-附录json-schema)
9. [常见问题（FAQ）](#9-常见问题faq)

---

## 1. 概述

GalEngine 是一个开源视觉小说引擎编辑器，基于 Electron + React + TypeScript，支持：

- **多格式脚本**：支持 JSON 和 Markdown 两种场景脚本格式（使用 `@command` 语法）
- **图形化编辑器**：内置 Monaco Editor，支持 JSON 语法高亮、自动补全和实时预览
- **跨平台运行**：Windows / macOS / Linux 均支持
- **补丁系统**：支持 `.gpk` 数据包进行增量内容发布
- **多语言**：引擎界面和文档支持中文、英文、日文

### 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| Node.js | 18+ | 20+ |
| 内存 | 2 GB | 4 GB+ |
| 硬盘 | 500 MB（含依赖） | 1 GB+ |

---

## 2. 安装与运行环境

### 2.1 安装编辑器

```bash
# 克隆仓库
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine/editor_ts

# 安装依赖
npm install

# 启动开发模式
npm run electron:dev
```

### 2.2 验证安装

```bash
# 启动 Electron 开发模式
npm run electron:dev
# 编辑器将作为桌面窗口打开（1400×900）

# 或启动 Vite 开发服务器（无 Electron）
npm run dev
```

---

## 3. 项目结构

一个标准的 GalEngine 游戏项目结构如下：

```
my_game/
├── settings.json          # 游戏项目配置文件（必需）
├── assets/              # 游戏素材目录
│   ├── backgrounds/     # 背景图片（.png/.jpg/.webp）
│   ├── sprites/         # 人物立绘（支持多差分）
│   ├── cg/             # CG 图片
│   ├── audio/          # 音频文件
│   │   ├── bgm/       # 背景音乐
│   │   ├── se/        # 音效
│   │   └── voice/     # 人物语音
│   ├── fonts/          # 字体文件（.ttf/.otf）
│   └── ui/             # UI 素材
├── scripts/             # 场景脚本目录
│   ├── prologue.json   # JSON 格式场景脚本
│   ├── chapter1.md     # Markdown 格式场景脚本
│   └── ...
├── patches/             # 补丁包目录（.gpk 文件）
├── build/               # 编译输出目录
└── ui-layout.json       # UI 布局配置文件（可选）
```

---

## 4. 游戏项目配置（settings.json）

`settings.json` 是每个游戏项目的核心配置文件。

### 4.1 完整示例

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

### 4.2 配置项说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `project.name` | string | 游戏名称 |
| `project.version` | string | 游戏版本号 |
| `project.resolution` | [int, int] | 游戏分辨率 [宽, 高] |
| `window.width` | int | 窗口宽度（像素） |
| `window.height` | int | 窗口高度（像素） |
| `window.fullscreen` | bool | 是否默认全屏 |
| `assets.*` | string | 各类素材的目录路径 |
| `scenes` | object | 场景 ID → 脚本文件路径的映射 |
| `ui.layout` | string | UI 布局配置文件路径 |
| `save.slots` | int | 存档栏位数量 |

---

## 5. 场景脚本编写

GalEngine 支持 **JSON** 和 **Markdown** 两种格式编写场景脚本。

### 5.1 JSON 格式

JSON 格式适合程序化生成场景，或与其他工具集成。

#### 基本结构

```json
{
  "id": "prologue",
  "name": "序章",
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
        "display_name": "爱丽丝",
        "text": "早上好！今天也是充满活力的一天呢。",
        "voice": "voice/alice_greeting.ogg",
        "sprite": "alice_normal.png"
      }
    },
    {
      "type": "choice",
      "data": {
        "prompt": "你要怎么做？",
        "choices": [
          { "text": "主动打招呼", "target": "choice_a" },
          { "text": "默默走过", "target": "choice_b" }
        ]
      }
    }
  ]
}
```

#### 命令类型一览

| 类型 | 说明 | 主要字段 |
|------|------|----------|
| `background` | 切换背景 | `image`, `transition`, `duration` |
| `dialogue` | 对话 | `character`, `display_name`, `text`, `voice`, `sprite` |
| `narration` | 旁白 | `text` |
| `choice` | 选项分支 | `prompt`, `choices` ([`text`, `target`]) |
| `show_sprite` | 显示立绘 | `character`, `sprite`, `position`, `transition` |
| `hide_sprite` | 隐藏立绘 | `character`, `transition` |
| `bgm` | 播放 BGM | `file`, `loop`, `fade_in` |
| `se` | 播放音效 | `file`, `volume` |
| `voice` | 播放语音 | `file`, `character` |
| `set_flag` | 设置全局变量 | `key`, `value` |
| `if` | 条件分支 | `condition`, `then`, `else` |
| `jump` | 跳转场景 | `target` |
| `cg` | 显示 CG | `image`, `duration` |

### 5.2 Markdown 格式

Markdown 格式更适合手写剧情，语法简洁直观。所有命令以 `@` 开头。

#### 基本语法

```markdown
# scene_prologue: 序章
chapter: 序章
route: common

@background bg_classroom.png fade 1.0
@bgm bgm_everyday.ogg loop:true fade:1.0

@show alice default right fade 0.5

@dialogue alice
早上好！今天也是充满活力的一天呢。

@narration
教室里的阳光格外温暖。

@choice 要怎么做？
- [主动打招呼] -> label_callout | affection_alice=1
- [默默走过] -> label_leave

@label label_callout
@dialogue protagonist
等一下！

@jump scene_chapter1

@label label_leave
@narration
看着她的背影消失在门口。
@end scene_chapter1
```

#### Markdown 语法说明

| 语法 | 说明 |
|------|------|
| `# scene_id` | 场景 ID（文件名为 scene_id） |
| `chapter:` / `route:` | 章节/路线元信息 |
| `@dialogue character_id [显示名]` | 对话（显示名为可选） |
| `@narration` | 旁白 |
| `@show character sprite [left\|center\|right]` | 显示立绘 |
| `@hide character [transition] [duration]` | 隐藏立绘 |
| `@background filename [transition] [duration]` | 切换背景 |
| `@bgm filename [loop:true] [fade:n]` | 播放 BGM |
| `@sfx filename` | 播放音效 |
| `@voice filename [character_id]` | 播放语音 |
| `@choice 提示文字` + `- [选项] -> target` | 选项分支 |
| `@label label_name` | 定义跳转标签 |
| `@jump label_name` | 跳转到标签 |
| `@set flag_name=value` | 设置变量 |
| `@if condition ... @endif` | 条件分支 |
| `@cg filename` | 显示 CG |
| `@transition effect duration` | 转场效果 |
| `@wait seconds` | 等待 |
| `@end [next_scene_id]` | 结束场景 |

### 5.3 格式对比与选择

| 特性 | JSON 格式 | Markdown 格式 |
|------|-----------|----------------|
| 可读性 | 较差 | 优秀 |
| 手写友好 | 差 | 优秀 |
| 工具生成 | 优秀 | 一般 |
| 复杂逻辑 | 支持更好 | 有限支持 |
| 推荐用途 | 工具生成、复杂分支 | 手写剧情、快速原型 |

**建议**：剧情编写使用 Markdown，复杂分支逻辑使用 JSON，或通过图形化编辑器生成。

---

## 6. 编译与打包

### 6.1 使用命令行编译

```bash
# 编译整个项目
python -m galengine.cli compile --project ./my_game --output ./build

# 编译指定场景
python -m galengine.cli compile --project ./my_game --scenes prologue,chapter1

# 编译补丁包（部分场景）
python -m galengine.cli compile-patch --project ./my_game --scenes new_chapter --output patches/patch_001.gpk
```

### 6.2 编译输出

编译后 `build/` 目录结构：

```
build/
├── game.pkg              # 编译后的游戏数据包
├── engine/              # 引擎运行时
│   └── galengine_runtime.exe  # Windows 可执行文件
├── assets/              # 打包后的素材（已压缩）
└── manifest.json        # 构建清单
```

### 6.3 打包为独立可执行文件

```bash
# 使用 PyInstaller 打包（需要安装 pyinstaller）
python -m galengine.cli package --project ./my_game --output ./dist

# 输出: dist/MyGame.exe（Windows）或 dist/MyGame.app（macOS）
```

### 6.4 补丁系统

GalEngine 支持通过 `.gpk` 补丁包进行增量内容发布：

1. 将补丁文件（`.gpk`）放入游戏目录的 `patches/` 文件夹
2. 启动游戏时，引擎会自动扫描并加载兼容的补丁
3. 补丁包含版本信息，引擎会检查与游戏本体的版本兼容性

---

## 7. 图形化编辑器使用

GalEngine 内置 Electron 桌面编辑器，基于 Monaco Editor，支持可视化场景编辑和实时预览。

### 7.1 启动编辑器

```bash
cd editor_ts
npm run electron:dev
```

编辑器将作为独立桌面窗口打开（1400×900）。

### 7.2 界面布局

编辑器界面分为以下区域：

1. **顶部菜单栏**：文件 / 编辑 / 视图 / 帮助（VSCode 风格）
2. **左侧活动栏**：资源管理器 / 插件 / AI助手 / 调试
3. **左侧边栏**：项目文件树 / 素材面板（可切换）
4. **中央编辑区**：Monaco Editor，支持多标签
5. **右侧边栏**：可选面板（大纲视图等）
6. **底部面板**：调试输出 / 搜索 / 终端
7. **底部状态栏**：编码 / 语言 / 光标位置

### 7.3 基本操作

| 操作 | 方法 |
|------|------|
| 打开文件 | 在资源管理器中点击文件 |
| 保存文件 | 菜单 → 文件 → 保存，或 Ctrl+S |
| 新建项目 | 菜单 → 文件 → 新建项目 |
| 打开项目 | 菜单 → 文件 → 打开项目 |
| 实时预览 | 点击右上角"预览"按钮或 ▶ 按钮 |
| 查找/替换 | 菜单 → 编辑 → 查找 / 替换，或 Ctrl+F / Ctrl+H |

### 7.4 AI 场景生成

编辑器内置 AI 助手面板，支持：
- 自然语言描述生成场景脚本（JSON 格式）
- 接入 OpenAI / Claude / Ollama 等 LLM 后端
- 自动将生成内容插入到当前编辑文件

---

## 8. 附录：JSON Schema

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

### 8.2 场景脚本 JSON Schema

参见 `schemas/scene.schema.json`（引擎自带）。

---

## 9. 常见问题（FAQ）

### Q1：如何设置人物立绘的不同差分（表情/服装）？

在 `assets/sprites/` 目录下，为每个角色准备多张图片，命名格式：`角色名_差分名.png`，例如：
- `alice_normal.png`（普通表情）
- `alice_smile.png`（微笑）
- `alice_angry.png`（生气）

在场景脚本中切换差分：
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

### Q2：如何发布补丁（DLC）？

1. 在编辑器中编写新场景内容
2. 点击"编译补丁"，选择要打包的场景
3. 将生成的 `.gpk` 文件分发给玩家
4. 玩家将 `.gpk` 文件放入游戏目录的 `patches/` 文件夹
5. 重启游戏，补丁内容自动加载

### Q3：支持哪些图片/音频格式？

- **图片**：PNG（推荐）、JPG、WEBP
- **音频**：OGG（推荐）、MP3、WAV

### Q4：如何自定义 UI 布局？

编辑 `ui-layout.json`（或通过编辑器的"UI 布局模式"可视化编辑）：

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

### Q5：编译后如何分发？

- **方式一**：分发整个 `build/` 目录（包含引擎运行时和游戏数据）
- **方式二**：使用 `package` 命令打包为单个可执行文件（.exe / .app）
- **方式三**：先分发基础版，后续内容通过 `.gpk` 补丁包更新

---

*GalEngine 开发团队 | 文档版本 v0.2.0*
