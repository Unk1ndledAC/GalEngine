# GalEngine

**专注于视觉小说、Galgame、文字冒险游戏开发的引擎**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.6%2B-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/electron-42.3.0-blue.svg)](https://www.electronjs.org/)
[![DOI](https://zenodo.org/badge/1255084198.svg)](https://doi.org/10.5281/zenodo.20474789)

## 简介

GalEngine 是一款开源视觉小说游戏引擎，开发者可使用 JSON 或 Markdown 脚本快速创作 Galgame、文字冒险游戏及点击解谜游戏。

### 核心特性

- **双脚本格式** — 同时支持 JSON（GUI 编辑器自动生成）和 Markdown（手写）脚本格式
- **零配置开发** — 开发者只需准备素材和脚本，无需搭建开发环境
- **独立编译打包** — 将游戏项目编译为独立可执行文件和数据包，玩家可直接下载运行
- **图形化编辑器** — Electron + React + Monaco Editor（TypeScript 重写版 v0.2.0）
- **多语言支持** — 提供中文、英文、日文三语言开发指引及 LLM 辅助开发提示词
- **补丁/DLC 系统** — 将追加内容编译为独立数据包，玩家直接复制即可使用
- **双许可证** — 开源版（Apache 2.0）+ 商业许可证

---

## 环境配置

### 第一步：安装 Node.js

TypeScript 编辑器需要 **Node.js 18+**。

- 下载地址：<https://nodejs.org/>

### 第二步：安装 GalEngine TypeScript 编辑器

```bash
# 克隆仓库
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine

# 安装编辑器依赖
cd editor_ts
npm install
```

### 第三步：验证安装

```bash
# 启动 Electron 开发模式
npm run electron:dev

# 或启动 Vite 开发服务器（无 Electron）
npm run dev
```

---

## 快速开始

### 启动编辑器

```bash
cd editor_ts
npm run electron:dev
```

编辑器将作为 **独立桌面窗口** 打开（1400×900，默认，最小 900×600）。

### 创建新项目

1. 点击菜单 → **文件 → 新建项目**
2. 选择项目名称和存放位置
3. 编辑器将自动创建项目结构并打开

### 编辑场景脚本

1. 从左侧资源管理器点击 `.json` 或 `.md` 文件
2. Monaco Editor 支持 JSON 语法高亮和自动补全
3. 使用 **预览** 面板实时查看游戏效果

### 编译项目

```bash
npm run build            # 编译 TypeScript + 构建渲染进程
npm run start            # 构建 + 启动 Electron（生产模式）
npm run package          # 完整打包流程 → NSIS 安装包
```

打包使用 **electron-builder**，产物输出至 `editor_ts/release/`。

---

## 项目结构

```
GE TS ver/                 ← 仓库根目录
├── src/                    ← TypeScript 编辑器源码
│   ├── engine/            ← 视觉小说引擎核心（纯逻辑，无 DOM 依赖）
│   ├── platform/          ← 平台服务（VFS、IPC、插件宿主）
│   ├── base/              ← 零依赖工具类
│   └── workbench/         ← React IDE 界面
│       ├── parts/          ← 布局组件（ActivityBar、MenuBar、Sidebar…）
│       └── contrib/        ← 功能模块（编辑器、预览、LLM、插件…）
├── schemas/               ← JSON Schema 规范
├── docs/                  ← 多语言开发指引
├── examples/              ← 示例项目（demo_project）
└── resources/             ← 图标、平台配置
```

---

## TypeScript 编辑器（editor_ts/）

基于 Electron + React + Monaco Editor，当前版本 **v0.2.0**。

### 技术栈

| 组件 | 技术 |
|------|------|
| 桌面框架 | Electron 42.3.0 |
| 前端框架 | React 18.3.1 + TypeScript 5.6 |
| 代码编辑器 | Monaco Editor（`@monaco-editor/react`） |
| 状态管理 | Zustand 5.0 |
| 构建工具 | Vite 6.0 |
| 国际化 | 自定义 `useTranslation` hook |

### 界面布局

编辑器采用 VSCode 风格的多面板布局：

```
┌──────────────────────────────────────────┐
│  MenuBar (文件 / 编辑 / 视图 / 帮助)      │
├────┬─────────────────────────────────────┤
│    │                                     │
│ A  │        Monaco Editor (主编辑区)       │
│ c  │                                     │
│ t  │                                     │
│ i  │                                     │
│ v  ├─────────────────────────────────────┤
│ i  │        预览面板（Canvas2D 游戏预览）  │
│ t  │                                     │
│ y  ├─────────────────────────────────────┤
│ B  │        底部面板（调试 / 搜索）        │
│ a  ├─────────────────────────────────────┤
│ r  │  StatusBar（编码 / 语言 / 光标位置）  │
└────┴─────────────────────────────────────┘
```

### 开发

```bash
cd editor_ts
npm install
npm run dev              # Vite 开发服务器 + HMR
npm run electron:dev      # Electron 开发模式（含热更新）
```

### 构建与打包

```bash
npm run build            # 编译 TypeScript + 构建渲染进程
npm run start            # 构建 + 启动 Electron（生产模式）
npm run package          # 完整打包流程 → NSIS 安装包
npm run package:win       # 仅 Windows NSIS
npm run typecheck        # TypeScript 类型检查
```

---

## 文档

- [中文开发指引](docs/zh-CN/)
- [English Guide](docs/en/)
- [日本語ガイド](docs/ja/)
- [JSON Schema 规范](schemas/)
- [Markdown 脚本规范](schemas/markdown-script-spec.zh-CN.md)
- [数据包格式规范](schemas/gpk-format-spec.zh-CN.md)
- [TypeScript 架构文档](README.md)

---

## 许可证

GalEngine 采用双许可证模式：

- **开源版**：Apache License 2.0 — 适用于开源项目及个人学习
- **商业版**：请联系项目维护者获取商业许可证

---

## 贡献

Issue 和 Pull Request 均欢迎！

---

*GalEngine — 让故事创作更简单*
