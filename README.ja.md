# GalEngine

**ビジュアルノベル、ギャルゲーム、テキストアドベンチャーゲーム開発に特化したエンジン**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.6%2B-blue.svg)](https://www.typescriptlang.org/)
[![DOI](https://zenodo.org/badge/1255084198.svg)](https://doi.org/10.5281/zenodo.20474789)

## 概要

GalEngine はオープンソースのビジュアルノベルゲームエンジンです。開発者は JSON または Markdown スクリプトを使用して、ギャルゲーム、テキストアドベンチャー、ポイントアンドクリック型パズルゲームを素早く制作できます。

### 主な機能

- **デュアルスクリプト形式** — JSON（GUIエディタで自動生成）と Markdown（手書き）の両方をサポート
- **ゼロコンフィグ開発** — 開発者は素材とスクリプトを用意するだけで、開発環境の設定は不要
- **スタンドアロンコンパイル** — ゲームプロジェクトを独立した実行可能ファイルとデータパックにコンパイルし、プレイヤーが直接ダウンロードして遊べます
- **グラフィカルエディタ** — 複数のエディタ実装：Electron + React（TypeScript リライト版）、PyWebView（旧 JS 版）、Qt（Python デスクトップ版）
- **多言語サポート** — 中国語・英語・日本語の開発ガイドとLLM補助プロンプト
- **パッチ/DLCシステム** — 追加コンテンツを独立したデータパックとしてコンパイルし、プレイヤーがコピーするだけで使用可能
- **デュアルライセンス** — オープンソース版（Apache 2.0）+ 商用ライセンス版

---

## 環境セットアップ

### ステップ1：Python のインストール

GalEngine は **Python 3.10 以上** が必要です。

- ダウンロード：<https://www.python.org/downloads/>
- **Windows ユーザー**：インストール時に **「Add Python to PATH」** に必ずチェックを入れてください
- インストール確認：

```bash
python --version
# 期待される出力：Python 3.10.x 以上
```

### ステップ2：GalEngine のインストール

**方法A：PyPI からインストール（一般ユーザー推奨, 現在は使用できません）**

```bash
pip install galengine
```

**方法B：ソースからの editable インストール（開発者推奨）**

```bash
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine
pip install -e .
```

これで全ての依存関係（`pygame-ce`、`click`、`jsonschema`、`markdown`、`Pillow`、`pywebview`）が自動インストールされます。

### ステップ3：インストール確認

```bash
# CLI ヘルプを表示
galengine-cli --help

# グラフィカルエディタを起動（ネイティブデスクトップウィンドウが開きます）
galengine-editor
```

---

## クイックスタート

### 新規プロジェクトの作成

```bash
galengine-cli new my_game
```

### プロジェクトのビルド

```bash
galengine-cli build my_game/
```

### プロジェクトの実行

```bash
galengine-cli run my_game/
```

### グラフィカルエディタの起動

```bash
galengine-editor
```

エディタは **独立したデスクトップウィンドウ** として開きます（システムのネイティブ WebView 使用、ブラウザ不要）。

---

## プロジェクト構造

```
GalEngine/
├── galengine/              # エンジンコア（Python）
│   ├── core/               # コアエンジン、設定管理
│   ├── loader/             # プロジェクトローダー
│   ├── parser/             # JSON/Markdownスクリプトパーサー
│   ├── scene/              # シーンマネージャー
│   ├── dialogue/           # ダイアログシステム
│   ├── audio/              # オーディオマネージャー
│   ├── save/               # セーブマネージャー
│   ├── ui/                 # UIマネージャー
│   ├── flowchart/          # フローチャートシステム
│   └── build/              # ビルド＆パッケージングシステム
├── editor_ts/              # エディタ — TypeScript リライト版（Electron + React）
│   ├── src/                # TypeScript ソースコード
│   ├── scripts/            # ビルド＆パッケージングスクリプト
│   └── resources/          # アイコン、プラットフォーム設定
├── editor_js/              # エディタ — 旧 JS 版（PyWebView）
├── editor_qt/              # エディタ — 旧 Python Qt 版
├── cli/                    # コマンドラインツール
├── docs/                   # 多言語ドキュメント
├── schemas/                # JSONスキーマ定義
├── examples/               # サンプルプロジェクト
└── tests/                  # テスト
```

---

## TypeScript エディタ（editor_ts/）

主要エディタ実装は TypeScript リライト版で、Electron + React ベース、現在 **v0.2.0** です。

### 開発

```bash
cd editor_ts
npm install
npm run dev              # Vite 開発サーバー + HMR
npm run electron:dev     # 開発モード（ライブリロード付き）
```

### ビルドとパッケージング

```bash
cd editor_ts
npm run build            # TypeScript コンパイル + レンダラービルド
npm run start            # ビルド + Electron 起動（本番モード）
npm run package          # 完全パッケージング → NSIS インストーラー
```

パッケージングには **electron-builder** を使用し、`asar: true` でクローズドソース配布に対応します。出力は `editor_ts/release/` に生成されます。

---

## ドキュメント

- [中文开发指引](docs/zh-CN/)
- [English Guide](docs/en/)
- [日本語ガイド](docs/ja/)
- [JSON Schema 仕様](schemas/)
- [Markdown スクリプト仕様](schemas/markdown-script-spec.ja.md)
- [データパック形式仕様](schemas/gpk-format-spec.ja.md)
- [TypeScript アーキテクチャ](editor_ts/ARCHITECTURE.md)

---

## 配布用パッケージング

### エンジンランタイム（Python）

エンジンランタイムを独立した実行可能ファイルとしてパッケージング（プレイヤーは Python 不要）：

```bash
pip install pyinstaller
pyinstaller --onefile --windowed cli/package.py
```

### エディタ（TypeScript + Electron）

TypeScript エディタは electron-builder でパッケージングします：

```bash
cd editor_ts
npm run package          # Windows NSIS インストーラー
npm run package:linux    # Linux AppImage + deb
```

---

## ライセンス

GalEngine はデュアルライセンスモデルを採用しています：

- **オープンソース版**: Apache License 2.0 — オープンソースプロジェクトや個人学習に適しています
- **商用版**: 商用ライセンスについてはプロジェクトメンテナーにお問い合わせください

---

## コントリビューション

Issue や Pull Request を歓迎します！

---

*GalEngine — ストーリー創作をよりシンプルに*
