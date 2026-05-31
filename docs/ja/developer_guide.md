# GalEngine 開発者ガイド（日本語版）

> GalEngine — Pythonベースのオープンソース・ビジュアルノベル（ギャルゲー）エンジン。
> バージョン：v0.1.0 | 最終更新：2026-05-31 |

---

## 目次

1. [概要](#1-概要)
2. [インストールと実行環境](#2-インストールと実行環境)
3. [プロジェクト構造](#3-プロジェクト構造)
4. [ゲームプロジェクト設定（settings.json）](#4-ゲームプロジェクト設定settingsjson)
5. [シーン・スクリプト作成](#5-シーンスクリプト作成)
6. [コンパイルとパッケージ化](#6-コンパイルとパッケージ化)
7. [GUIエディタの使用](#7-guiエディタの使用)
8. [付録：JSON Schema](#8-付録json-schema)
9. [よくある質問（FAQ）](#9-よくある質問faq)

---

## 1. 概要

GalEngine は Python で書かれたオープンソースのビジュアルノベルエンジンです。以下の機能をサポートします：

- **マルチフォーマット・スクリプト**：JSON と Markdown の両方のシーン・スクリプト形式をサポート
- **GUIエディタ**：ドラッグ＆ドロップによるシーン編集が可能な内蔵の Web エディタ
- **クロスプラットフォーム**：Windows / macOS / Linux をサポート
- **パッチ・システム**：`.gpk` データパッケージによる増分コンテンツ配信をサポート
- **マルチ言語**：エンジン UI とドキュメントは中国語、英語、日本語をサポート

### システム要件

| コンポーネント | 最低要件 | 推奨構成 |
|-----------|----------|----------|
| Python    | 3.10+   | 3.12+    |
| メモリ    | 2 GB    | 4 GB+    |
| ハードディスク | 200 MB（依存関係含む） | 1 GB+ |
| グラフィックカード | OpenGL 3.3 サポート | 専用 GPU |

---

## 2. インストールと実行環境

### 2.1 GalEngine のインストール

```bash
# リポジトリをクローン
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine

# 依存関係をインストール
pip install -r requirements.txt

# インストールを確認
python -m galengine --version
# 期待される出力: GalEngine v0.1.0
```

### 2.2 依存関係

核心依存関係（`requirements.txt` に含まれる）：

```
pygame>=2.5.0
Pillow>=10.0.0
pydub>=0.25.0
Jinja2>=3.1.0
click>=8.1.0
watchdog>=4.0.0
```

### 2.3 インストール確認

```bash
# サンプル・プロジェクトを実行
python -m galengine --project examples/demo_project --preview

# GUIエディタを起動
python -m galengine.editor
# 次にブラウザで http://localhost:8080 を開く
```

---

## 3. プロジェクト構造

標準的な GalEngine ゲーム・プロジェクトの構造：

```
my_game/
├── settings.json           # ゲーム・プロジェクト設定ファイル（必須）
├── assets/               # ゲーム素材ディレクトリ
│   ├── backgrounds/      # 背景画像（.png/.jpg/.webp）
│   ├── sprites/          # キャラクター立ち絵（差分サポート）
│   ├── cg/              # CG 画像
│   ├── audio/           # 音声ファイル
│   │   ├── bgm/        # 背景音楽（BGM）
│   │   ├── se/         # 効果音（SE）
│   │   └── voice/      # キャラクター音声
│   ├── fonts/           # フォント・ファイル（.ttf/.otf）
│   └── ui/              # UI 素材
├── scripts/              # シーン・スクリプト・ディレクトリ
│   ├── prologue.json    # JSON形式シーン・スクリプト
│   ├── chapter1.md      # Markdown形式シーン・スクリプト
│   └── ...
├── patches/              # パッチ・ファイル・ディレクトリ（.gpk ファイル）
├── build/                # コンパイル出力ディレクトリ
└── ui-layout.json        # UIレイアウト設定ファイル（オプション）
```

---

## 4. ゲームプロジェクト設定（settings.json）

`settings.json` は各ゲーム・プロジェクトの核心設定ファイルです。

### 4.1 完全な例

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

### 4.2 設定項目の説明

| フィールド | タイプ | 説明 |
|------------|--------|----------|
| `project.name` | string | ゲーム名 |
| `project.version` | string | ゲーム・バージョン番号 |
| `project.resolution` | [int, int] | ゲーム解像度 [幅, 高さ] |
| `window.width` | int | ウィンドウ幅（ピクセル） |
| `window.height` | int | ウィンドウ高さ（ピクセル） |
| `window.fullscreen` | bool | デフォルトでフルスクリーン？ |
| `assets.*` | string | 各種素材のディレクトリ・パス |
| `scenes` | object | シーン ID → スクリプト・ファイル・パスの対応 |
| `ui.layout` | string | UIレイアウト設定ファイル・パス |
| `save.slots` | int | セーブ・スロット数 |

---

## 5. シーン・スクリプト作成

GalEngine は **JSON** と **Markdown** の両方の形式でシーン・スクリプトを作成できます。

### 5.1 JSON 形式

JSON 形式は、プログラムでシーンを生成する場合や、他のツールと統合する場合に適しています。

#### 基本構造

```json
{
  "id": "prologue",
  "name": "プロローグ",
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
        "display_name": "アリス",
        "text": "おはよう！今日も元気な一日になりそうね。",
        "voice": "voice/alice_greeting.ogg",
        "sprite": "alice_normal.png"
      }
    },
    {
      "type": "choice",
      "data": {
        "prompt": "どうする？",
        "choices": [
          { "text": "主动打招呼", "target": "choice_a" },
          { "text": "默默走过", "target": "choice_b" }
        ]
      }
    }
  ]
}
```

#### コマンド・タイプ一覧

| タイプ | 説明 | 主要フィールド |
|--------|----------|----------|
| `background` | 背景切替 | `image`, `transition`, `duration` |
| `dialogue` | 对话 | `character`, `display_name`, `text`, `voice`, `sprite` |
| `narration` | 旁白 | `text` |
| `choice` | 选项分支 | `prompt`, `choices` ([`text`, `target`]) |
| `show_sprite` | 立绘表示 | `character`, `sprite`, `position`, `transition` |
| `hide_sprite` | 立绘非表示 | `character`, `transition` |
| `bgm` | BGM再生 | `file`, `loop`, `fade_in` |
| `se` | 効果音再生 | `file`, `volume` |
| `voice` | 音声再生 | `file`, `character` |
| `set_flag` | グローバル変数设定 | `key`, `value` |
| `if` | 条件分支 | `condition`, `then`, `else` |
| `jump` | シーン跳转 | `target` |
| `cg` | CG表示 | `image`, `duration` |

### 5.2 Markdown 形式

Markdown 形式は、ストーリーを手書きする場合に適しており、構文が簡潔で直感的です。

#### 基本構文

```markdown
# プロローグ

==background: bg_classroom.png==

==bgm: bgm_everyday.ogg==

### アリス #

おはよう！今日も元気な一日になりそうね。

（音声：voice/alice_greeting.ogg）

### 旁白 #

教室の陽光は特に暖かい。

### 选择 #

?? どうする？

- [主动打招呼] -> choice_a
- [默默走过] -> choice_b #

## choice_a #

==show_sprite: alice_normal.png, center==

### アリス #

わあ、主动打招呼了！

## choice_b #

==hide_sprite: alice==

### 旁白 #

你默默地走过了教室门口。

### 系统 #

==jump: chapter1==
```

#### Markdown 構文説明 #

| 構文 | 説明 |
|--------|----------|
| `# タイトル` | シーン名（レベル1見出し） |
| `### キャラクター名` | 对话の話し手 |
| `### 旁白` | 旁白コンテンツ |
| `==background: xxx==` | 背景切替 |
| `==show_sprite: xxx, pos==` | 立绘表示（位置：left/center/right） |
| `==bgm: xxx==` | BGM再生 |
| `?? 質問` | 选项プロンプト |
| `- [选项] -> target` | 选项と跳转目标 |
| `==jump: target==` | シーン跳转 |
| `==cg: xxx==` | CG表示 |
| `（音声：path）` | 关联音声ファイル |

---

## 6. コンパイルとパッケージ化

### 6.1 コマンドラインでコンパイル #

```bash
# プロジェクト全体をコンパイル
python -m galengine.cli compile --project ./my_game --output ./build

# 指定シーンをコンパイル
python -m galengine.cli compile --project ./my_game --scenes prologue,chapter1

# パッチ・パッケージをコンパイル（部分シーン）
python -m galengine.cli compile-patch --project ./my_game --scenes new_chapter --output patches/patch_001.gpk
```

### 6.2 コンパイル出力 #

コンパイル後の `build/` ディレクトリ構造：

```
build/
├── game.pkg               # コンパイル後のゲーム・データ・パッケージ
├── engine/               # エンジン・ランタイム
│   └── galengine_runtime.exe  # Windows 実行ファイル
├── assets/               # パッケージ化された素材（圧缩済み）
└── manifest.json         # ビルド・マニフェスト
```

### 6.3 スタンドアローン実行ファイルとしてパッケージ化 #

```bash
# PyInstaller を使用してパッケージ化（PyInstaller のインストールが必要）
python -m galengine.cli package --project ./my_game --output ./dist

# 出力: dist/MyGame.exe（Windows）または dist/MyGame.app（macOS）
```

### 6.4 パッチ・システム #

GalEngine は `.gpk` パッチ・パッケージによる増分コンテンツ配信をサポートします：

1. パッチ・ファイル（`.gpk`）をゲーム・ディレクトリの `patches/` フォルダに配置
2. ゲーム起動時、エンジンは互換性のあるパッチを自動スキャンしてロード
3. パッチにはバージョン情報が含まれ、エンジンはゲーム本体とのバージョン互換性を確認

---

## 7. GUIエディタの使用

GalEngine には、ビジュアル・シーン編集のための内蔵 Web GUI エディタがあります。

### 7.1 エディタの起動 #

```bash
python -m galengine.editor
# 次にブラウザで http://localhost:8080 を開く
```

### 7.2 インタフェース配置 #

エディタ・インタフェースは4つの領域に分かれています：

1. **左侧サイドバー**：プロジェクト・ファイル・ツリー / 素材パネル（切替可能）
2. **中央キャンバス**：シーン・ビジュアル編集領域
3. **右侧属性パネル**：选定要素の属性編集
4. **底部タイムライン**：シーン・コマンド・シーケンス

### 7.3 基本操作 #

| 操作 | 方法 |
|------|------|
| 素材追加 | 素材パネルにファイルをドラッグ＆ドロップ、または「导入」ボタンをクリック |
| 对话追加 | ツールバーの「+ 对话」ボタンをクリック |
| 选项追加 | ツールバーの「+ 选项」ボタンをクリック |
| 背景切替 | 素材パネルから背景画像をキャンバスにドラッグ |
| 立绘配置 | 素材パネルから立绘をキャンバスにドラッグ、ドラッグして位置调整 |
| シーンpreview | ツールバーの「preview」ボタンをクリック |
| ゲームコンパイル | ツールバーの「コンパイル」ボタンをクリック |

### 7.4 三种類の编集モード #

エディタは三种類の编集モードをサポートし、ツールバーから切替可能です：

1. **シーン编集モード**（デフォルト）：对话、选项、背景、立绘を编集
2. **フローチャート・モード**：ゲーム分支フローをビジュアル编集、ドラッグしてノードとエッジを作成
3. **UIレイアウト・モード**：UI要素の位置とスタイルをビジュアル编集

---

## 8. 付録：JSON Schema

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

---

## 9. よくある质问（FAQ）

### Q1：キャラクター立ち絵の异なる差分（表情/服装）を设定するには？

`assets/sprites/` ディレクトリで、各キャラクターに対して复数の画像を用意し、命名形式：`角色名_差分名.png`、例：
- `alice_normal.png`（普通表情）
- `alice_smile.png`（微笑）
- `alice_angry.png`（生气）

シーン・スクリプトで差分を切替：
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

### Q2：パッチ（DLC）をリリースするには？

1. エディタで新しいシーン・コンテンツを作成
2. 「コンパイル・パッチ」をクリックし、パッケージ化するシーンを选择
3. 生成された `.gpk` ファイルをプレイヤーに配布
4. プレイヤーは `.gpk` ファイルをゲーム・ディレクトリの `patches/` フォルダに配置
5. ゲームを再起動し、パッチ・コンテンツが自動ロード

### Q3：どの画像/音声形式をサポートしますか？

- **画像**：PNG（推奨）、JPG、WEBP
- **音声**：OGG（推奨）、MP3、WAV

### Q4：UIレイアウトをカスタマイズするには？

`ui-layout.json` を编集（またはエディタの「UIレイアウト・モード」でビジュアル编集）：

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

---

*GalEngine 开发チーム | ドキュメント・バージョン v0.1.0*
