"""
Scene Script Parser

Parses JSON scene scripts into an internal command representation.
Also supports Markdown script parsing via MarkdownParser.
"""

import json
import os
import re
from typing import Dict, Any, List, Optional, Iterator, Union
from dataclasses import dataclass, field
from enum import Enum, auto


class CommandType(Enum):
    """All supported script command types."""
    DIALOGUE = auto()
    NARRATION = auto()
    SHOW_SPRITE = auto()
    HIDE_SPRITE = auto()
    BACKGROUND = auto()
    BGM = auto()
    STOP_BGM = auto()
    SFX = auto()
    VOICE = auto()
    SHOW_CG = auto()
    HIDE_CG = auto()
    CHOICE = auto()
    JUMP = auto()
    SET_FLAG = auto()
    CONDITIONAL = auto()
    WAIT = auto()
    TRANSITION = auto()
    LABEL = auto()
    CALL_SCENE = auto()
    RETURN = auto()
    END_SCENE = auto()


@dataclass
class Command:
    """A single parsed command from a scene script."""
    type: CommandType
    data: Dict[str, Any] = field(default_factory=dict)
    line_number: int = 0


@dataclass
class ParsedScene:
    """Complete parsed scene data."""
    scene_id: str
    scene_name: str = ""
    chapter: str = ""
    route: Optional[str] = None
    background: Optional[str] = None
    bgm: Optional[str] = None
    commands: List[Command] = field(default_factory=list)
    labels: Dict[str, int] = field(default_factory=dict)  # label name -> command index


class SceneParser:
    """Parses JSON scene files into Command lists."""

    def parse_file(self, filepath: str) -> ParsedScene:
        """Parse a scene JSON file into a ParsedScene."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return self.parse_data(data, filepath)

    def parse_data(self, data: Dict[str, Any], source: str = "") -> ParsedScene:
        """Parse scene data dict into a ParsedScene."""
        scene_id = data.get("scene_id", os.path.splitext(os.path.basename(source))[0])
        scene = ParsedScene(
            scene_id=scene_id,
            scene_name=data.get("scene_name", scene_id),
            chapter=data.get("chapter", ""),
            route=data.get("route"),
            background=data.get("background"),
            bgm=data.get("bgm"),
        )

        raw_commands = data.get("commands", [])
        for i, cmd_data in enumerate(raw_commands):
            command = self._parse_command(cmd_data, i + 1)
            if command:
                scene.commands.append(command)
                if command.type == CommandType.LABEL:
                    scene.labels[command.data["name"]] = len(scene.commands) - 1

        return scene

    def _parse_command(self, data: Dict[str, Any], line: int) -> Optional[Command]:
        """Parse a single command dict into a Command object."""
        cmd_type = data.get("type", "")
        if not cmd_type:
            return None

        type_map = {
            "dialogue": CommandType.DIALOGUE,
            "narration": CommandType.NARRATION,
            "show_sprite": CommandType.SHOW_SPRITE,
            "hide_sprite": CommandType.HIDE_SPRITE,
            "background": CommandType.BACKGROUND,
            "bgm": CommandType.BGM,
            "stop_bgm": CommandType.STOP_BGM,
            "sfx": CommandType.SFX,
            "voice": CommandType.VOICE,
            "show_cg": CommandType.SHOW_CG,
            "hide_cg": CommandType.HIDE_CG,
            "choice": CommandType.CHOICE,
            "jump": CommandType.JUMP,
            "set_flag": CommandType.SET_FLAG,
            "conditional": CommandType.CONDITIONAL,
            "wait": CommandType.WAIT,
            "transition": CommandType.TRANSITION,
            "label": CommandType.LABEL,
            "call_scene": CommandType.CALL_SCENE,
            "return": CommandType.RETURN,
            "end_scene": CommandType.END_SCENE,
        }

        cmd_enum = type_map.get(cmd_type)
        if cmd_enum is None:
            print(f"WARNING: Unknown command type '{cmd_type}' at line {line}")
            return None

        return Command(type=cmd_enum, data=data, line_number=line)


class MarkdownParser:
    """
    Parses Markdown game scripts into ParsedScene objects.

    See schemas/markdown-script-spec.md for the full specification.
    """

    def parse_file(self, filepath: str) -> ParsedScene:
        """Parse a .md script file into a ParsedScene."""
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return self.parse_text(content, filepath)

    def parse_text(self, text: str, source: str = "") -> ParsedScene:
        """Parse Markdown text content into a ParsedScene."""
        lines = text.split("\n")
        scene_id = os.path.splitext(os.path.basename(source))[0]
        scene = ParsedScene(scene_id=scene_id)

        i = 0
        # Parse YAML-like front matter (lines starting without @ in header)
        while i < len(lines) and not lines[i].strip().startswith("@"):
            line = lines[i].strip()
            if line.startswith("# "):
                # Title line: # scene_id: Scene Name
                title = line[2:]
                if ":" in title:
                    sid, name = title.split(":", 1)
                    scene.scene_id = sid.strip()
                    scene.scene_name = name.strip()
            elif line.startswith("background:"):
                scene.background = line.split(":", 1)[1].strip()
            elif line.startswith("bgm:"):
                scene.bgm = line.split(":", 1)[1].strip()
            elif line.startswith("chapter:"):
                scene.chapter = line.split(":", 1)[1].strip()
            elif line.startswith("route:"):
                val = line.split(":", 1)[1].strip()
                scene.route = val if val.lower() != "common" else None
            i += 1

        # Skip ## content marker
        while i < len(lines) and lines[i].strip() in ("## content", "## script", ""):
            i += 1

        # Parse commands
        line_num = i + 1
        while i < len(lines):
            line = lines[i].strip()
            if not line or line.startswith("//"):
                i += 1
                line_num += 1
                continue

            if line.startswith("@"):
                cmd, consumed = self._parse_command_line(lines, i)
                if cmd:
                    cmd.line_number = line_num
                    scene.commands.append(cmd)
                    if cmd.type == CommandType.LABEL:
                        scene.labels[cmd.data["name"]] = len(scene.commands) - 1
                    i += consumed
                    line_num += consumed
                else:
                    i += 1
                    line_num += 1
            else:
                # Plain text = narration
                scene.commands.append(Command(
                    type=CommandType.NARRATION,
                    data={"text": line},
                    line_number=line_num
                ))
                i += 1
                line_num += 1

        return scene

    def _parse_command_line(self, lines: List[str], start: int) -> tuple:
        """Parse a @command line and its multi-line text body."""
        line = lines[start].strip()
        parts = line[1:].split(None, 1)  # Remove @, split command name
        if not parts:
            return None, 1

        cmd_name = parts[0]
        args_str = parts[1] if len(parts) > 1 else ""

        # Commands with multi-line text body
        if cmd_name in ("dialogue", "narration"):
            # Collect following lines until blank line or next @command
            text_lines = []
            consumed = 1
            j = start + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line or next_line.startswith("@"):
                    break
                text_lines.append(next_line)
                j += 1
                consumed += 1
            text = "\n".join(text_lines) if text_lines else ""

            if cmd_name == "dialogue":
                return self._parse_dialogue(args_str, text), consumed
            else:
                return Command(type=CommandType.NARRATION, data={"text": args_str + "\n" + text if args_str else text}), consumed

        # Single-line commands
        handlers = {
            "show": self._parse_show,
            "hide": self._parse_hide,
            "background": self._parse_background,
            "bgm": self._parse_bgm,
            "stop_bgm": self._parse_stop_bgm,
            "sfx": self._parse_sfx,
            "voice": self._parse_voice,
            "cg": self._parse_cg,
            "hide_cg": self._parse_hide_cg,
            "choice": lambda a: self._parse_choice(lines, start),
            "jump": self._parse_jump,
            "set": self._parse_set_flag,
            "if": lambda a: self._parse_conditional(lines, start),
            "wait": self._parse_wait,
            "transition": self._parse_transition,
            "label": self._parse_label,
            "call": self._parse_call,
            "return": self._parse_return,
            "end": self._parse_end_scene,
        }

        handler = handlers.get(cmd_name)
        if handler:
            return handler(args_str), 1

        print(f"WARNING: Unknown command '{cmd_name}'")
        return None, 1

    def _parse_dialogue(self, args_str: str, text: str) -> Command:
        """Parse @dialogue character_id [display_name] text"""
        parts = args_str.split(None, 1)
        data = {"text": text}
        if parts:
            data["character"] = parts[0]
            rest = parts[1] if len(parts) > 1 else ""
            # Check for display name override: [Display Name]
            match = re.match(r'\[(.+?)\]\s*(.*)', rest)
            if match:
                data["display_name"] = match.group(1)
                if match.group(2):
                    data["text"] = match.group(2) + "\n" + text if text else match.group(2)
            elif rest:
                data["text"] = rest + "\n" + text if text else rest
        return Command(type=CommandType.DIALOGUE, data=data)

    def _parse_show(self, args_str: str) -> Command:
        parts = args_str.split()
        data = {"character": parts[0]} if parts else {}
        if len(parts) > 1:
            data["sprite"] = parts[1]
        if len(parts) > 2:
            data["position"] = parts[2]
        if len(parts) > 3:
            data["transition"] = parts[3]
        if len(parts) > 4:
            data["duration"] = float(parts[4])
        return Command(type=CommandType.SHOW_SPRITE, data=data)

    def _parse_hide(self, args_str: str) -> Command:
        parts = args_str.split()
        data = {"character": parts[0]} if parts else {}
        if len(parts) > 1:
            data["transition"] = parts[1]
        if len(parts) > 2:
            data["duration"] = float(parts[2])
        return Command(type=CommandType.HIDE_SPRITE, data=data)

    def _parse_background(self, args_str: str) -> Command:
        parts = args_str.split()
        data = {"image": parts[0]} if parts else {}
        if len(parts) > 1:
            data["transition"] = parts[1]
        if len(parts) > 2:
            data["duration"] = float(parts[2])
        return Command(type=CommandType.BACKGROUND, data=data)

    def _parse_bgm(self, args_str: str) -> Command:
        parts = args_str.split()
        data = {"file": parts[0]} if parts else {}
        return Command(type=CommandType.BGM, data=data)

    def _parse_stop_bgm(self, args_str: str) -> Command:
        data = {}
        if args_str:
            data["fade_out"] = float(args_str)
        return Command(type=CommandType.STOP_BGM, data=data)

    def _parse_sfx(self, args_str: str) -> Command:
        data = {"file": args_str}
        return Command(type=CommandType.SFX, data=data)

    def _parse_voice(self, args_str: str) -> Command:
        parts = args_str.split()
        data = {"file": parts[0]} if parts else {}
        if len(parts) > 1:
            data["character"] = parts[1]
        return Command(type=CommandType.VOICE, data=data)

    def _parse_cg(self, args_str: str) -> Command:
        parts = args_str.split()
        data = {"image": parts[0]} if parts else {}
        return Command(type=CommandType.SHOW_CG, data=data)

    def _parse_hide_cg(self, args_str: str) -> Command:
        return Command(type=CommandType.HIDE_CG, data={})

    def _parse_choice(self, lines: List[str], start: int) -> Command:
        data = {"choices": []}
        # Check for prompt on the @choice line
        line = lines[start].strip()
        rest = line[7:].strip()  # Remove "@choice "
        if rest and not rest.startswith("-"):
            data["prompt"] = rest

        # Collect choice options from following lines
        j = start + 1
        while j < len(lines):
            cline = lines[j].strip()
            if not cline:
                j += 1
                continue
            if cline.startswith("- "):
                choice_text = cline[2:]
                if "=>" in choice_text:
                    text_part, target_part = choice_text.split("=>", 1)
                    target_part = target_part.strip()
                    target = target_part.split()[0] if target_part.split() else ""
                    # Extract flags
                    flags = {}
                    flag_parts = target_part.split()[1:] if len(target_part.split()) > 1 else []
                    for fp in flag_parts:
                        if "=" in fp:
                            k, v = fp.split("=", 1)
                            try:
                                flags[k] = float(v)
                            except ValueError:
                                flags[k] = v
                    data["choices"].append({
                        "text": text_part.strip(),
                        "next": target,
                        "set_flags": flags if flags else None
                    })
                j += 1
            elif cline.startswith("@"):
                break
            else:
                j += 1

        if not data["choices"]:
            data["choices"].append({"text": "Continue", "next": ""})

        return Command(type=CommandType.CHOICE, data=data)

    def _parse_jump(self, args_str: str) -> Command:
        return Command(type=CommandType.JUMP, data={"target": args_str})

    def _parse_set_flag(self, args_str: str) -> Command:
        """Parse @set flag_name=value or @set flag_name+=value"""
        flags = {}
        if "=" in args_str:
            key, val = args_str.split("=", 1)
            key = key.strip()
            val = val.strip()
            try:
                flags[key] = float(val)
            except ValueError:
                flags[key] = val
        return Command(type=CommandType.SET_FLAG, data={"flags": flags})

    def _parse_conditional(self, lines: List[str], start: int) -> Command:
        """Parse @if ... @else ... @endif blocks."""
        line = lines[start].strip()
        condition = line[3:].strip()  # Remove "@if "
        data = {"condition": condition, "true_branch": [], "false_branch": []}

        i = start + 1
        current_branch = data["true_branch"]
        while i < len(lines):
            cline = lines[i].strip()
            if cline == "@else":
                current_branch = data["false_branch"]
                i += 1
                continue
            if cline == "@endif":
                break
            if cline.startswith("@"):
                cmd, consumed = self._parse_command_line(lines, i)
                if cmd:
                    current_branch.append({"type": cmd.type.name.lower(), **cmd.data})
                    i += consumed
                else:
                    i += 1
            else:
                if cline:
                    current_branch.append({"type": "narration", "text": cline})
                i += 1

        return Command(type=CommandType.CONDITIONAL, data=data)

    def _parse_wait(self, args_str: str) -> Command:
        return Command(type=CommandType.WAIT, data={"duration": float(args_str)})

    def _parse_transition(self, args_str: str) -> Command:
        parts = args_str.split()
        data = {"effect": parts[0]} if parts else {}
        if len(parts) > 1:
            data["duration"] = float(parts[1])
        return Command(type=CommandType.TRANSITION, data=data)

    def _parse_label(self, args_str: str) -> Command:
        return Command(type=CommandType.LABEL, data={"name": args_str})

    def _parse_call(self, args_str: str) -> Command:
        return Command(type=CommandType.CALL_SCENE, data={"scene_id": args_str})

    def _parse_return(self, args_str: str) -> Command:
        data = {}
        if args_str:
            data["target"] = args_str
        return Command(type=CommandType.RETURN, data=data)

    def _parse_end_scene(self, args_str: str) -> Command:
        data = {}
        if args_str:
            data["next_scene"] = args_str
        return Command(type=CommandType.END_SCENE, data=data)
