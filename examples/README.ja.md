# GalEngine サンプルプロジェクト（demo_project）

これは GalEngine エンジンを使用して開発された完全なビジュアルノベルのサンプルプロジェクトで、エンジンのコア機能をデモンストレーションします。

---

## プロジェクト構造

```
demo_project/
├── settings.json              # ゲームプロジェクト設定ファイル
├── assets/                  # ゲーム素材ディレクトリ（素材は手動で追加が必要）
│   ├── backgrounds/           # 背景画像
│   ├── sprites/             # キャラクター立ち絵
│   ├── cg/                  # CG画像
│   ├── audio/
│   │   ├── bgm/             # 背景音楽
│   │   ├── se/              # 効果音
│   │   └── voice/           # キャラクターボイス
│   ├── fonts/               # フォントファイル
│   └── ui/                  # UI素材
├── scripts/                 # シーンスクリプトディレクトリ
│   ├── prologue.json        # 序章（JSON形式）
│   ├── chapter1.md         # 第一章（Markdown形式）
│   ├── choice_a.json        # 選択分岐A
│   ├── choice_b.json        # 選択分岐B
│   └── ending.json         # エンディング
└── ui-layout.json           # UIレイアウト設定ファイル
```

---

## クイックスタート

### 1. 素材の準備

以下の素材を対応するディレクトリに配置してください（同名のファイルで代用可能）：

| 素材タイプ | 必要なファイル | 説明 |
|-----------|----------|------|
| 背景 | `bg_classroom.png`, `bg_corridor.png`, `bg_sunset.png` | 教室、廊下、夕暮れ |
| 立ち絵 | `alice_normal.png`, `alice_smile.png`, `bob_normal.png` | Alice と Bob の立ち絵 |
| CG | `cg_ending.png` | エンディングCG |
| BGM | `bgm_everyday.ogg`, `bgm_happy.ogg`, `bgm_lonely.ogg` | 日常、楽しい、孤独 |
| 効果音 | `se_bell.ogg`, `se_chime.ogg` | ベル、チャイム |

> **ヒント**：適切な素材がない場合は、任意の画像/音声ファイルをリネームして代用し、ワークフローを体験できます。

### 2. サンプルプロジェクトの実行

```bash
# GalEngine ルートディレクトリで実行
python -m galengine --project examples/demo_project --preview
```

### 3. サンプルプロジェクトのビルド

```bash
# 配布可能なパッケージにコンパイル
python -m galengine.cli compile --project examples/demo_project --output build/demo/

# スタンドアロン実行可能ファイルとしてパッケージ化
python -m galengine.cli package --project examples/demo_project --output dist/
```

---

## シーンスクリプトの説明

| ファイル | 形式 | 説明 |
|------|------|------|
| `prologue.json` | JSON | 序章、背景切り替え・立ち絵表示・ダイアログ・選択分岐をデモ |
| `chapter1.md` | Markdown | 第一章、Markdown形式でのストーリー作成をデモ |
| `choice_a.json` | JSON | 選択分岐A：積極的に挨拶した後の展開 |
| `choice_b.json` | JSON | 選択分岐B：黙ってうなずいた後の展開 |
| `ending.json` | JSON | エンディング、条件分岐（`if` コマンド）とCG表示をデモ |

---

## 機能デモ

このサンプルプロジェクトは以下の GalEngine コア機能をデモンストレーションします：

- ✅ 背景切り替え（フェードトランジション）
- ✅ キャラクター立ち絵の表示/非表示
- ✅ ダイアログシステム（話者名付き）
- ✅ ナレーション
- ✅ 選択肢分岐
- ✅ グローバル変数（set_flag / if）
- ✅ シーンジャンプ（jump）
- ✅ BGM再生制御
- ✅ 効果音再生
- ✅ CG表示
- ✅ JSON と Markdown のデュアル形式スクリプト

---

## 次のステップ

- `docs/ja/developer_guide.md` を読んでエンジンの詳細な使い方を学ぶ
- グラフィカルエディターでビジュアルにシーン編集：`python -m galengine.editor`
- このプロジェクトをベースに修正して、あなただけのビジュアルノベルを作成しよう！

---

*GalEngine 開発チーム | サンプルプロジェクト バージョン v0.1.0*
