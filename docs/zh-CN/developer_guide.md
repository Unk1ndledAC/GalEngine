# GalEngine 开发指引（中文版）

> GalEngine —— 基于 Python 的开源视觉小说（Galgame）引擎。
> 版本：v0.1.0 | 最后更新：2026-05-31

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

GalEngine 是一个用 Python 编写的开源视觉小说引擎，支持：

- **多格式脚本**：支持 JSON 和 Markdown 两种场景脚本格式
- **图形化编辑器**：内置 Web 编辑器，支持拖拽式场景编辑
- **跨平台运行**：Windows / macOS / Linux 均支持
- **补丁系统**：支持 `.gpk` 数据包进行增量内容发布
- **多语言**：引擎界面和文档支持中文、英文、日文

### 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| Python | 3.10+ | 3.12+ |
| 内存 | 2 GB | 4 GB+ |
| 硬盘 | 200 MB（含依赖） | 1 GB+ |
| 显卡 | 支持 OpenGL 3.3 | 独立显卡 |

---

## 2. 安装与运行环境

### 2.1 安装 GalEngine

```bash
# 克隆仓库
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine

# 安装依赖
pip install -r requirements.txt

# 验证安装
python -m galengine --version
# 预期输出: GalEngine v0.1.0
```

### 2.2 依赖项

核心依赖（已包含在 `requirements.txt`）：

```
pygame>=2.5.0
Pillow>=10.0.0
pydub>=0.25.0
jinja2>=3.1.0
click>=8.1.0
watchdog>=4.0.0
```

### 2.3 验证安装

```bash
# 运行示例项目
python -m galengine --project examples/demo_project --preview

# 启动图形化编辑器
python -m galengine.editor
# 然后在浏览器打开 http://localhost:8080
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

Markdown 格式更适合手写剧情，语法简洁直观。

#### 基本语法

```markdown
# 序章

==background: bg_classroom.png==

==bgm: bgm_everyday.ogg==

### 爱丽丝

早上好！今天也是充满活力的一天呢。

（语音：voice/alice_greeting.ogg）

### 旁白

教室里的阳光格外温暖。

### 选择

?? 你要怎么做？

- [主动打招呼] -> choice_a
- [默默走过] -> choice_b

## choice_a

==show_sprite: alice_normal.png, center==

### 爱丽丝

哇，你主动打招呼了！

## choice_b

==hide_sprite: alice==

### 旁白

你默默地走过了教室门口。

### 系统

==jump: chapter1==
```

#### Markdown 语法说明

| 语法 | 说明 |
|------|------|
| `# 标题` | 场景名称（一级标题） |
| `### 角色名` | 对话说话人 |
| `### 旁白` | 旁白内容 |
| `==background: xxx==` | 切换背景 |
| `==show_sprite: xxx, pos==` | 显示立绘（位置：left/center/right） |
| `==bgm: xxx==` | 播放 BGM |
| `?? 问题` | 选项提示语 |
| `- [选项] -> target` | 选项及跳转目标 |
| `==jump: target==` | 跳转场景 |
| `==cg: xxx==` | 显示 CG |
| `（语音：path）` | 关联语音文件 |

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

GalEngine 内置 Web 图形化编辑器，支持可视化场景编辑。

### 7.1 启动编辑器

```bash
python -m galengine.editor
# 然后在浏览器打开 http://localhost:8080
```

### 7.2 界面布局

编辑器界面分为四个区域：

1. **左侧边栏**：项目文件树 / 素材面板（可切换）
2. **中央画布**：场景可视化编辑区域
3. **右侧属性面板**：选中元素的属性编辑
4. **底部时间轴**：场景命令序列

### 7.3 基本操作

| 操作 | 方法 |
|------|------|
| 添加素材 | 拖拽文件到素材面板，或点击"导入"按钮 |
| 添加对话 | 点击工具栏"+"对话"按钮 |
| 添加选项 | 点击工具栏"+"选项"按钮 |
| 切换背景 | 从素材面板拖拽背景图片到画布 |
| 放置立绘 | 从素材面板拖拽立绘到画布，可拖动调整位置 |
| 预览场景 | 点击工具栏"预览"按钮 |
| 编译游戏 | 点击工具栏"编译"按钮 |

### 7.4 三种编辑模式

编辑器支持三种编辑模式，可在工具栏切换：

1. **场景编辑模式**（默认）：编辑对话、选项、背景、立绘
2. **流程图模式**：可视化编辑游戏分支流程，拖拽创建节点和连线
3. **UI 布局模式**：可视化编辑 UI 元素位置和样式

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

*GalEngine 开发团队 | 文档版本 v0.1.0*
