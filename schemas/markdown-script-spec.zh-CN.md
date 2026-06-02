# GalEngine 游戏脚本编写规范 (.md)

GalEngine 支持开发者使用 Markdown 格式编写游戏脚本。Markdown 脚本与 JSON 脚本等效，引擎会自动解析。
Markdown 脚本更适合直接编写/阅读，JSON 脚本更适合 GUI 编辑器自动生成。

## 基本结构

每个 .md 文件代表一个场景（Scene），文件名即为 scene_id。

```markdown
# scene_id: 场景标题
chapter: 第一章
route: common
background: bg_classroom.png
bgm: bgm_everyday.ogg

## content

这里是场景脚本内容...
```

## 命令语法

所有命令以 `@command` 开头，`@` 必须在行首。

### 对话

```
@dialogue (character_id) [可选显示名]
对话文本内容
```

示例：
```
@dialogue alice
你好！很高兴认识你。

@dialogue alice [???]
...我的名字是秘密。
```

### 旁白/叙述

不指定角色即为旁白：
```
@narration
这是一个平静的早晨。
```

或者直接写文本（无 @ 标记）即为旁白。

### 显示/隐藏立绘

```
@show character_id sprite_name [left|center|right] [scale:1.0]
@hide character_id [transition:fade] [duration:0.5]
```

示例：
```
@show alice default center
@show alice happy center
@hide alice fade 0.5
```

### 背景切换

```
@background bg_filename [transition:fade] [duration:1.0]
```

### 音乐/音效/语音

```
@bgm filename [loop:true] [fade:1.0]
@stop_bgm [fade:1.0]
@sfx filename
@voice filename [character_id]
```

### 选项/分支

```
@choice [提示文字]
- 选项文本1 => label_name1 | flag1=val1 flag2=val2
- 选项文本2 => label_name2
- [condition:flag>=5] 条件选项 => label_name3
```

### 跳转/标签

```
@label label_name
@jump label_name
@call scene_id
@return
```

### 标志/变量

```
@set flag_name=value
@set flag_name+=1
```

### 条件分支

```
@if flag_name>=5
  @show alice happy center
  @dialogue alice
  我很开心！
@else
  @dialogue alice
  ...哼。
@endif
```

### CG

```
@cg image_file [cg_id:cg_id]
@hide_cg [transition:fade] [duration:0.5]
```

### 过渡效果

```
@transition fade 1.0
```

支持的效果: fade, dissolve, wipe_left, wipe_right, wipe_up, wipe_down, blinds, iris_in, iris_out

### 等待

```
@wait 2.0
```

### 场景结束

```
@end [next_scene_id]
```

## 完整示例

```markdown
# scene_prologue: 序章
chapter: 序章
route: common
background: bg_classroom.png
bgm: bgm_everyday.ogg

@narration
放课后，教室里只剩下我一个人。

@show alice default right fade 0.5
@dialogue alice
你还在啊？

@dialogue protagonist
嗯，在想一些事情。

@dialogue alice
是吗？那我不打扰你了。

@hide alice fade 0.5

@choice 要不要叫住她？
- 叫住她 => label_callout | affection_alice=1
- 让她离开 => label_leave

@label label_callout
@show alice default right
@dialogue protagonist
等一下！
@dialogue alice [???]
嗯？
@jump label_after_choice

@label label_leave
@narration
看着她的背影消失在门口。
@set affection_alice=0

@label label_after_choice
@end scene_chapter1
```
