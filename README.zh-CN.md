# GalEngine

**专注于视觉小说、Galgame、文字冒险游戏开发的引擎**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://python.org)
[![DOI](https://zenodo.org/badge/1255084198.svg)](https://doi.org/10.5281/zenodo.20474789)

## 简介

GalEngine 是一款开源视觉小说游戏引擎，开发者可使用 JSON 或 Markdown 脚本快速创作 Galgame、文字冒险游戏及点击解谜游戏。

### 核心特性

- **双脚本格式** — 同时支持 JSON（GUI 编辑器自动生成）和 Markdown（手写）脚本格式
- **零配置开发** — 开发者只需准备素材和脚本，无需搭建开发环境
- **独立编译打包** — 将游戏项目编译为独立可执行文件和数据包，玩家可直接下载运行
- **图形化编辑器** — 桌面端 GUI 编辑器，支持拖拽场景编辑（基于 pywebview，无需浏览器）
- **多语言支持** — 提供中文、英文、日文三语言开发指引及 LLM 辅助开发提示词
- **补丁/DLC 系统** — 将追加内容编译为独立数据包，玩家直接复制即可使用
- **双许可证** — 开源版（Apache 2.0）+ 商业许可证

---

## 环境配置

### 第一步：安装 Python

GalEngine 需要 **Python 3.10 或以上版本**。

- 下载地址：<https://www.python.org/downloads/>
- Windows 用户安装时请务必勾选 **"Add Python to PATH"**
- 安装完成后，打开命令行验证：

```bash
python --version
# 预期输出：Python 3.10.x 或更高版本
```

### 第二步：安装 GalEngine

**方式一：从 PyPI 安装（推荐普通用户，当前暂不可用）**

```bash
pip install galengine
```

**方式二：从源码可编辑安装（推荐开发者）**

```bash
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine
pip install -e .
```

这会自动安装所有依赖：`pygame-ce`、`click`、`jsonschema`、`markdown`、`Pillow`、`pywebview`。

### 第三步：验证安装

```bash
# 查看 CLI 帮助
galengine-cli --help

# 启动图形化编辑器（会自动打开桌面窗口）
galengine-editor
```

---

## 快速开始

### 创建新项目

```bash
galengine-cli new my_game
```

### 构建项目

```bash
galengine-cli build my_game/
```

### 运行项目

```bash
galengine-cli run my_game/
```

### 启动图形化编辑器

```bash
galengine-editor
```

编辑器将以**独立桌面窗口**形式打开（使用系统原生 WebView），无需浏览器，无需手动打开网页。

---

## 项目结构

```
GalEngine/
├── galengine/              # 引擎核心
│   ├── core/               # 核心引擎、配置管理
│   ├── loader/             # 项目加载器
│   ├── parser/             # JSON/Markdown 脚本解析器
│   ├── scene/              # 场景管理器
│   ├── dialogue/           # 对话系统
│   ├── audio/              # 音频管理器
│   ├── save/               # 存档管理器
│   ├── ui/                 # UI 管理器
│   ├── flowchart/          # 流程图系统
│   └── build/              # 编译与打包系统
├── editor/                 # 图形化编辑器（桌面应用）
├── cli/                    # 命令行工具
├── docs/                   # 多语言文档
├── schemas/                # JSON Schema 定义
├── examples/               # 示例项目
└── tests/                  # 测试套件
```

---

## 文档

- [中文开发指引](docs/zh-CN/)
- [English Guide](docs/en/)
- [日本語ガイド](docs/ja/)
- [JSON Schema 规范](schemas/)
- [Markdown 脚本规范](schemas/markdown-script-spec.zh-CN.md)
- [数据包格式规范](schemas/gpk-format-spec.zh-CN.md)

---

## 许可证

GalEngine 采用双许可证模式：

- **开源版**：Apache License 2.0 — 适用于开源项目及个人学习
- **商业版**：请联系项目维护者获取商业许可证

---

## 打包为独立可执行文件（用于分发）

使用 PyInstaller 将游戏项目打包为独立 exe（玩家无需安装 Python）：

```bash
# 安装打包工具
pip install pyinstaller

# 打包引擎运行时
pyinstaller --onefile --windowed cli/package.py
```

详细打包说明见[中文开发指引](docs/zh-CN/)。

---

## 贡献

Issue 和 Pull Request 均欢迎！

---

*GalEngine — 让故事创作更简单*
