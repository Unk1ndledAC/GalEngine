# GalEngine Game Script Writing Specification (.md)

GalEngine supports developers in writing game scripts using Markdown format. Markdown scripts are equivalent to JSON scripts, and the engine will parse them automatically.
Markdown scripts are better suited for direct writing/reading, while JSON scripts are better suited for automatic generation by the GUI editor.

## Basic Structure

Each `.md` file represents a scene, and the filename is the `scene_id`.

```markdown
# scene_id: Scene Title
chapter: Chapter 1
route: common
background: bg_classroom.png
bgm: bgm_everyday.ogg

## content

Scene script content goes here...
```

## Command Syntax

All commands begin with `@command`, and the `@` must be at the start of the line.

### Dialogue

```
@dialogue (character_id) [optional display name]
Dialogue text content
```

Example:
```
@dialogue alice
Hello! Nice to meet you.

@dialogue alice [???]
...My name is a secret.
```

### Narration

Not specifying a character means narration:
```
@narration
It was a peaceful morning.
```

Or simply write text (without `@` marker) for narration.

### Show/Hide Sprites

```
@show character_id sprite_name [left|center|right] [scale:1.0]
@hide character_id [transition:fade] [duration:0.5]
```

Example:
```
@show alice default center
@show alice happy center
@hide alice fade 0.5
```

### Background Switch

```
@background bg_filename [transition:fade] [duration:1.0]
```

### Music / Sound Effects / Voice

```
@bgm filename [loop:true] [fade:1.0]
@stop_bgm [fade:1.0]
@sfx filename
@voice filename [character_id]
```

### Choices / Branching

```
@choice [prompt text]
- Option text 1 => label_name1 | flag1=val1 flag2=val2
- Option text 2 => label_name2
- [condition:flag>=5] Conditional option => label_name3
```

### Jumps / Labels

```
@label label_name
@jump label_name
@call scene_id
@return
```

### Flags / Variables

```
@set flag_name=value
@set flag_name+=1
```

### Conditional Branching

```
@if flag_name>=5
  @show alice happy center
  @dialogue alice
  I'm so happy!
@else
  @dialogue alice
  ...Hmph.
@endif
```

### CG

```
@cg image_file [cg_id:cg_id]
@hide_cg [transition:fade] [duration:0.5]
```

### Transition Effects

```
@transition fade 1.0
```

Supported effects: fade, dissolve, wipe_left, wipe_right, wipe_up, wipe_down, blinds, iris_in, iris_out

### Wait

```
@wait 2.0
```

### Scene End

```
@end [next_scene_id]
```

## Full Example

```markdown
# scene_prologue: Prologue
chapter: Prologue
route: common
background: bg_classroom.png
bgm: bgm_everyday.ogg

@narration
After school, I was the only one left in the classroom.

@show alice default right fade 0.5
@dialogue alice
You're still here?

@dialogue protagonist
Yeah, just thinking about some things.

@dialogue alice
Oh? I won't bother you then.

@hide alice fade 0.5

@choice Should I call out to her?
- Call out => label_callout | affection_alice=1
- Let her go => label_leave

@label label_callout
@show alice default right
@dialogue protagonist
Wait!
@dialogue alice [???]
Hmm?
@jump label_after_choice

@label label_leave
@narration
Watching her figure disappear through the door.
@set affection_alice=0

@label label_after_choice
@end scene_chapter1
```
