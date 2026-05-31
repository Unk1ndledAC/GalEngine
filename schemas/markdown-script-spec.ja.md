# GalEngine ゲームスクリプト作成仕様 (.md)

GalEngine は開発者が Markdown 形式でゲームスクリプトを作成することをサポートしています。Markdown スクリプトは JSON スクリプトと同等であり、エンジンが自動的に解析します。
Markdown スクリプトは直接の作成/読解に適しており、JSON スクリプトはGUIエディターによる自動生成に適しています。

## 基本構造

各 `.md` ファイルは1つのシーン（Scene）を表し、ファイル名が `scene_id` となります。

```markdown
# scene_id: シーンタイトル
chapter: 第一章
route: common
background: bg_classroom.png
bgm: bgm_everyday.ogg

## content

ここにシーンスクリプトの内容を記述...
```

## コマンド構文

すべてのコマンドは `@command` で始まり、`@` は行頭にある必要があります。

### ダイアログ

```
@dialogue (character_id) [オプションの表示名]
ダイアログのテキスト内容
```

例：
```
@dialogue alice
こんにちは！お会いできて嬉しいです。

@dialogue alice [???]
...私の名前は秘密です。
```

### ナレーション・地の文

キャラクターを指定しない場合はナレーションになります：
```
@narration
穏やかな朝だった。
```

または単にテキストを書く（`@` マークなし）とナレーションになります。

### 立ち絵の表示/非表示

```
@show character_id sprite_name [left|center|right] [scale:1.0]
@hide character_id [transition:fade] [duration:0.5]
```

例：
```
@show alice default center
@show alice happy center
@hide alice fade 0.5
```

### 背景切り替え

```
@background bg_filename [transition:fade] [duration:1.0]
```

### 音楽/効果音/ボイス

```
@bgm filename [loop:true] [fade:1.0]
@stop_bgm [fade:1.0]
@sfx filename
@voice filename [character_id]
```

### 選択肢/分岐

```
@choice [プロンプトテキスト]
- 選択肢テキスト1 => label_name1 | flag1=val1 flag2=val2
- 選択肢テキスト2 => label_name2
- [condition:flag>=5] 条件付き選択肢 => label_name3
```

### ジャンプ/ラベル

```
@label label_name
@jump label_name
@call scene_id
@return
```

### フラグ/変数

```
@set flag_name=value
@set flag_name+=1
```

### 条件分岐

```
@if flag_name>=5
  @show alice happy center
  @dialogue alice
  とても嬉しい！
@else
  @dialogue alice
  ...ふん。
@endif
```

### CG

```
@cg image_file [cg_id:cg_id]
@hide_cg [transition:fade] [duration:0.5]
```

### トランジション効果

```
@transition fade 1.0
```

対応効果: fade, dissolve, wipe_left, wipe_right, wipe_up, wipe_down, blinds, iris_in, iris_out

### 待機

```
@wait 2.0
```

### シーン終了

```
@end [next_scene_id]
```

## 完全な例

```markdown
# scene_prologue: 序章
chapter: 序章
route: common
background: bg_classroom.png
bgm: bgm_everyday.ogg

@narration
放課後、教室には私だけが残っていた。

@show alice default right fade 0.5
@dialogue alice
まだいたの？

@dialogue protagonist
うん、ちょっと考え事をしてて。

@dialogue alice
そう？じゃあ邪魔しないね。

@hide alice fade 0.5

@choice 呼び止める？
- 呼び止める => label_callout | affection_alice=1
- そのまま帰す => label_leave

@label label_callout
@show alice default right
@dialogue protagonist
ちょっと待って！
@dialogue alice [???]
え？
@jump label_after_choice

@label label_leave
@narration
彼女の背中が扉の向こうに消えていくのを見つめていた。
@set affection_alice=0

@label label_after_choice
@end scene_chapter1
```
