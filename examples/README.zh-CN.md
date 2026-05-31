# GalEngine 示例项目（demo_project）

这是一个使用 GalEngine 引擎开发的完整示例视觉小说项目，用于演示引擎的核心功能。

---

## 项目结构

```
demo_project/
├── settings.json              # 游戏项目配置文件
├── assets/                  # 游戏素材目录（需要手动添加素材）
│   ├── backgrounds/           # 背景图片
│   ├── sprites/             # 人物立绘
│   ├── cg/                  # CG 图片
│   ├── audio/
│   │   ├── bgm/             # 背景音乐
│   │   ├── se/              # 音效
│   │   └── voice/           # 人物语音
│   ├── fonts/               # 字体文件
│   └── ui/                  # UI 素材
├── scripts/                 # 场景脚本目录
│   ├── prologue.json        # 序章（JSON 格式）
│   ├── chapter1.md         # 第一章（Markdown 格式）
│   ├── choice_a.json        # 选择分支 A
│   ├── choice_b.json        # 选择分支 B
│   └── ending.json         # 结局
└── ui-layout.json           # UI 布局配置文件
```

---

## 快速开始

### 1. 准备素材

将以下素材放入对应目录（可使用任意同名文件代替）：

| 素材类型 | 需要文件 | 说明 |
|-----------|----------|------|
| 背景 | `bg_classroom.png`, `bg_corridor.png`, `bg_sunset.png` | 教室、走廊、黄昏 |
| 立绘 | `alice_normal.png`, `alice_smile.png`, `bob_normal.png` | Alice 和 Bob 的立绘 |
| CG | `cg_ending.png` | 结局 CG |
| BGM | `bgm_everyday.ogg`, `bgm_happy.ogg`, `bgm_lonely.ogg` | 日常、开心、孤独 |
| 音效 | `se_bell.ogg`, `se_chime.ogg` | 铃声、提示音 |

> **提示**：如果没有合适素材，可以先用任意图片/音频文件重命名代替，体验流程。

### 2. 运行示例项目

```bash
# 在 GalEngine 根目录运行
python -m galengine --project examples/demo_project --preview
```

### 3. 编译示例项目

```bash
# 编译为可分发包
python -m galengine.cli compile --project examples/demo_project --output build/demo/

# 打包为独立可执行文件
python -m galengine.cli package --project examples/demo_project --output dist/
```

---

## 场景脚本说明

| 文件 | 格式 | 说明 |
|------|------|------|
| `prologue.json` | JSON | 序章，展示背景切换、立绘显示、对话、选项分支 |
| `chapter1.md` | Markdown | 第一章，展示 Markdown 格式编写剧情 |
| `choice_a.json` | JSON | 选择分支 A：主动打招呼的后续 |
| `choice_b.json` | JSON | 选择分支 B：默默点头的后续 |
| `ending.json` | JSON | 结局，展示条件分支（`if` 命令）和 CG 显示 |

---

## 功能演示

本示例项目演示了以下 GalEngine 核心功能：

- ✅ 背景切换（fade 过渡）
- ✅ 人物立绘显示/隐藏
- ✅ 对话系统（含说话人名字）
- ✅ 旁白（narration）
- ✅ 选项分支（choice）
- ✅ 全局变量（set_flag / if）
- ✅ 跳转场景（jump）
- ✅ BGM 播放控制
- ✅ 音效播放
- ✅ CG 显示
- ✅ JSON 和 Markdown 双格式脚本

---

## 下一步

- 阅读 `docs/zh-CN/developer_guide.md` 了解引擎详细用法
- 使用图形化编辑器可视化编辑场景：`python -m galengine.editor`
- 基于本项目修改，创建你自己的视觉小说！

---

*GalEngine 开发团队 | 示例项目版本 v0.1.0*
