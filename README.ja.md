# GalEngine

**ビジュアルノベル、ギャルゲーム、テキストアドベンチャーゲーム開発に特化したエンジン**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.6%2B-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/electron-42.3.0-blue.svg)](https://www.electronjs.org/)
[![DOI](https://zenodo.org/badge/1255084198.svg)](https://doi.org/10.5281/zenodo.20474789)

## 概要

GalEngine はオープンソースのビジュアルノベルゲームエンジンです。開発者は JSON または Markdown スクリプトを使用して、ギャルゲーム、テキストアドベンチャー、ポイントアンドクリック型パズルゲームを素早く制作できます。

### 主な機能

- **デュアルスクリプト形式** — JSON（GUIエディタで自動生成）と Markdown（手書き）の両方をサポート
- **ゼロコンフィグ開発** — 開発者は素材とスクリプトを用意するだけで、開発環境の設定は不要
- **スタンドアロンコンパイル** — ゲームプロジェクトを独立した実行可能ファイルとデータパックにコンパイルし、プレイヤーが直接ダウンロードして遊べます
- **グラフィカルエディタ** — Electron + React + Monaco Editor（TypeScript リライト版 v0.2.0）
- **多言語サポート** — 中国語・英語・日本語の開発ガイドとLLM補助プロンプト
- **パッチ/DLCシステム** — 追加コンテンツを独立したデータパックとしてコンパイルし、プレイヤーがコピーするだけで使用可能
- **デュアルライセンス** — オープンソース版（Apache 2.0）+ 商用ライセンス版

---

## 環境セットアップ

### ステップ1：Node.js のインストール

TypeScript エディタには **Node.js 18+** が必要です。

- ダウンロード：<https://nodejs.org/>

### ステップ2：GalEngine TypeScript エディタのインストール

```bash
# リポジトリをクローン
git clone https://github.com/Unk1ndledAC/GalEngine.git
cd GalEngine

# エディタの依存関係をインストール
cd editor_ts
npm install
```

### ステップ3：インストール確認

```bash
# Electron 開発モードを起動
npm run electron:dev

# または Vite 開発サーバーを起動（Electron なし）
npm run dev
```

---

## クイックスタート

### エディタの起動

```bash
cd editor_ts
npm run electron:dev
```

エディタは **独立したデスクトップウィンドウ** として開きます（1400×900 デフォルト、最小 900×600）。

### 新規プロジェクトの作成

1. メニュー → **ファイル → 新規プロジェクト** をクリック
2. プロジェクト名と保存場所を選択
3. エディタが自動的にプロジェクト構造を作成し開きます

### シーンスクリプトの編集

1. 左側のエクスプローラーから `.json` または `.md` ファイルをクリック
2. Monaco Editor が JSON 構文ハイライトと自動補完を提供
3. **プレビュー** パネルでライブゲームプレビューを確認

### ビルドとパッケージング

```bash
npm run build            # TypeScript コンパイル + レンダラービルド
npm run start            # ビルド + Electron 起動（本番モード）
npm run package          # 完全パッケージング → NSIS インストーラー
npm run package:win       # Windows NSIS のみ
npm run typecheck        # TypeScript 型チェック
```

パッケージングには **electron-builder** を使用。出力は `editor_ts/release/` に生成されます。

---

## プロジェクト構造

```
GE TS ver/              ← リポジトリルート
├── src/                ← TypeScript エディタソース
│   ├── engine/         ← ビジュアルノベルエンジンコア（純粋論理、DOM なし）
│   ├── platform/       ← プラットフォームサービス（VFS、IPC、プラグイン宿主）
│   ├── base/          ← ゼロ依存ユーティリティ
│   └── workbench/      ← React IDE UI
│       ├── parts/       ← レイアウトコンポーネント（ActivityBar、MenuBar、Sidebar…）
│       └── contrib/     ← 機能モジュール（エディタ、プレビュー、LLM、プラグイン…）
├── schemas/             ← JSON Schema 仕様
├── docs/               ← 多言語開発者ガイド
├── examples/           ← サンプルプロジェクト（demo_project）
└── resources/          ← アイコン、プラットフォーム設定
```

---

## TypeScript エディタ（editor_ts/）

主要エディタ実装は TypeScript リライト版で、Electron + React + Monaco Editor ベース、現在 **v0.2.0** です。

### 技術スタック

| コンポーネント | 技術 |
|------|------|
| デスクトップフレームワーク | Electron 42.3.0 |
| フロントエンド | React 18.3.1 + TypeScript 5.6 |
| コードエディタ | Monaco Editor（`@monaco-editor/react`） |
| 状態管理 | Zustand 5.0 |
| ビルドツール | Vite 6.0 |
| 国際化 | カスタム `useTranslation` hook |

### インターフェースレイアウト

エディタは VSCode スタイルのページ割りレイアウトを採用：

```
┌──────────────────────────────────────────┐
│  MenuBar (ファイル / 編集 / 表示 / ヘルプ) │
├────┬─────────────────────────────────────┤
│    │                                      │
│ A  │        Monaco Editor (メイン編集領域) │
│ c  │                                      │
│ t  │                                      │
│ i  │                                      │
│ v  ├─────────────────────────────────────┤
│ i  │        プレビューパネル (Canvas2D)  │
│ t  │                                      │
│ y  ├─────────────────────────────────────┤
│ B  │        ボトムパネル (デバッグ / 検索) │
│ a  ├─────────────────────────────────────┤
│ r  │  ステータスバー (エンコーディング / 言語) │
└────┴─────────────────────────────────────┘
```

### 開発

```bash
cd editor_ts
npm install
npm run dev              # Vite 開発サーバー + HMR
npm run electron:dev      # Electron 開発モード（ライブリロード付き）
```

### ビルドとパッケージング

```bash
npm run build            # TypeScript コンパイル + レンダラービルド
npm run start            # ビルド + Electron 起動（本番モード）
npm run package          # 完全パッケージング → NSIS インストーラー
npm run package:win       # Windows NSIS のみ
npm run typecheck        # TypeScript 型チェック
```

---

## ドキュメント

- [中文开发指引](docs/zh-CN/)
- [English Guide](docs/en/)
- [日本語ガイド](docs/ja/)
- [JSON Schema 仕様](schemas/)
- [Markdown スクリプト仕様](schemas/markdown-script-spec.ja.md)
- [データパック形式仕様](schemas/gpk-format-spec.ja.md)
- [TypeScript アーキテクチャ](README.md)

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
