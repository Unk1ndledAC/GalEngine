"""
Scene Manager

Manages scene execution: loading, command execution, transitions,
and the scene call stack.
"""

from typing import Optional, Dict, Any, List, TYPE_CHECKING
from dataclasses import dataclass, field

from galengine.parser.json_parser import (
    SceneParser, MarkdownParser, ParsedScene, Command, CommandType
)

if TYPE_CHECKING:
    from galengine.core.engine import GalEngine


@dataclass
class SceneState:
    """Runtime state of a scene being executed."""
    scene: ParsedScene
    command_index: int = 0
    waiting_for_click: bool = False
    waiting_for_choice: bool = False
    is_cg_mode: bool = False


class SceneManager:
    """
    Manages scene loading, execution, and transitions.

    Maintains a call stack for scene calls (call_scene / return).
    """

    def __init__(self, project_loader):
        self._loader = project_loader
        self._parser = SceneParser()
        self._md_parser = MarkdownParser()
        self._scene_cache: Dict[str, ParsedScene] = {}
        self._call_stack: List[Dict[str, Any]] = []  # For call_scene/return
        self._current_state: Optional[SceneState] = None
        self._global_flags: Dict[str, Any] = {}
        self._visited_scenes: List[str] = []

    # ---- Scene Loading ----

    def load_scene(self, scene_id: str) -> Optional[ParsedScene]:
        """Load a scene by ID, using cache if available."""
        if scene_id in self._scene_cache:
            return self._scene_cache[scene_id]

        filepath = self._loader.get_scene_path(scene_id)
        if not filepath:
            print(f"ERROR: Scene '{scene_id}' not found in settings.json")
            return None

        import os
        if not os.path.isfile(filepath):
            print(f"ERROR: Scene file not found: {filepath}")
            return None

        try:
            if filepath.endswith(".md"):
                scene = self._md_parser.parse_file(filepath)
            else:
                scene = self._parser.parse_file(filepath)

            self._scene_cache[scene_id] = scene
            return scene
        except Exception as e:
            print(f"ERROR: Failed to parse scene '{scene_id}': {e}")
            return None

    # ---- Scene Execution ----

    def start_scene(self, scene_id: str) -> bool:
        """Begin executing a new scene."""
        scene = self.load_scene(scene_id)
        if not scene:
            return False

        self._current_state = SceneState(scene=scene)
        self._visited_scenes.append(scene_id)
        return True

    def execute_current_scene(self, engine: "GalEngine") -> None:
        """
        Execute the current scene one step at a time.
        This is called each frame by the engine main loop.
        """
        if not self._current_state:
            return

        state = self._current_state
        scene = state.scene

        if state.command_index >= len(scene.commands):
            # Scene ended naturally
            self._on_scene_end(engine)
            return

        cmd = scene.commands[state.command_index]
        self._execute_command(cmd, engine)
        state.command_index += 1

    def _execute_command(self, cmd: Command, engine: "GalEngine") -> None:
        """Execute a single command."""
        handler_map = {
            CommandType.DIALOGUE: self._cmd_dialogue,
            CommandType.NARRATION: self._cmd_narration,
            CommandType.SHOW_SPRITE: self._cmd_show_sprite,
            CommandType.HIDE_SPRITE: self._cmd_hide_sprite,
            CommandType.BACKGROUND: self._cmd_background,
            CommandType.BGM: self._cmd_bgm,
            CommandType.STOP_BGM: self._cmd_stop_bgm,
            CommandType.SFX: self._cmd_sfx,
            CommandType.VOICE: self._cmd_voice,
            CommandType.SHOW_CG: self._cmd_show_cg,
            CommandType.HIDE_CG: self._cmd_hide_cg,
            CommandType.CHOICE: self._cmd_choice,
            CommandType.JUMP: self._cmd_jump,
            CommandType.SET_FLAG: self._cmd_set_flag,
            CommandType.CONDITIONAL: self._cmd_conditional,
            CommandType.WAIT: self._cmd_wait,
            CommandType.TRANSITION: self._cmd_transition,
            CommandType.LABEL: lambda e: None,  # No-op, labels are pre-processed
            CommandType.CALL_SCENE: self._cmd_call_scene,
            CommandType.RETURN: self._cmd_return,
            CommandType.END_SCENE: self._cmd_end_scene,
        }

        handler = handler_map.get(cmd.type)
        if handler:
            handler(engine)

    # ---- Command Handlers ----

    def _cmd_dialogue(self, engine: "GalEngine") -> None:
        cmd = self._current_state.scene.commands[self._current_state.command_index]
        data = cmd.data
        character = data.get("character")
        display_name = data.get("display_name")
        text = data.get("text", "")
        voice = data.get("voice")

        engine.dialogue_system.show_dialogue(character, text, display_name)

        if voice:
            voice_path = engine.project_loader.get_asset_path(voice, "audio")
            engine.audio_manager.play_voice(voice_path, character)

    def _cmd_narration(self, engine: "GalEngine") -> None:
        cmd = self._current_state.scene.commands[self._current_state.command_index]
        engine.dialogue_system.show_narration(cmd.data.get("text", ""))

    def _cmd_show_sprite(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        char_id = data.get("character", "")
        sprite = data.get("sprite", "default")
        position = data.get("position", "center")
        transition = data.get("transition", "fade")
        duration = data.get("duration", 0.5)

        sprite_path = engine.project_loader.get_asset_path(
            f"sprites/{char_id}/{sprite}.png", "sprites"
        )
        # In real implementation: engine.renderer.show_sprite(char_id, sprite_path, position)

    def _cmd_hide_sprite(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        char_id = data.get("character", "")
        # In real implementation: engine.renderer.hide_sprite(char_id)

    def _cmd_background(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        image = data.get("image", "")
        path = engine.project_loader.get_asset_path(image, "backgrounds")
        # In real implementation: engine.renderer.set_background(path)

    def _cmd_bgm(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        file = data.get("file", "")
        path = engine.project_loader.get_asset_path(file, "audio")
        loop = data.get("loop", True)
        fade_in = data.get("fade_in", 1.0)
        engine.audio_manager.play_bgm(path, loop=loop, fade_ms=int(fade_in * 1000))

    def _cmd_stop_bgm(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        fade_out = data.get("fade_out", 1.0)
        engine.audio_manager.stop_bgm(fade_ms=int(fade_out * 1000))

    def _cmd_sfx(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        file = data.get("file", "")
        path = engine.project_loader.get_asset_path(file, "audio")
        engine.audio_manager.play_sfx(path)

    def _cmd_voice(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        file = data.get("file", "")
        path = engine.project_loader.get_asset_path(file, "audio")
        engine.audio_manager.play_voice(path)

    def _cmd_show_cg(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        image = data.get("image", "")
        path = engine.project_loader.get_asset_path(image, "cgs")
        self._current_state.is_cg_mode = True
        # In real implementation: engine.renderer.show_cg(path)

    def _cmd_hide_cg(self, engine: "GalEngine") -> None:
        self._current_state.is_cg_mode = False
        # In real implementation: engine.renderer.hide_cg()

    def _cmd_choice(self, engine: "GalEngine") -> None:
        cmd = self._current_state.scene.commands[self._current_state.command_index]
        data = cmd.data
        prompt = data.get("prompt", "")
        choices = data.get("choices", [])
        engine.ui_manager.show_choices(prompt, choices)

    def _cmd_jump(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        target = data.get("target", "")
        scene = self._current_state.scene
        if target in scene.labels:
            self._current_state.command_index = scene.labels[target]
        else:
            print(f"WARNING: Jump target '{target}' not found in scene '{scene.scene_id}'")

    def _cmd_set_flag(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        flags = data.get("flags", {})
        for key, value in flags.items():
            # Handle += operator
            if isinstance(value, str) and value.startswith("+="):
                try:
                    delta = float(value[2:].strip())
                    self._global_flags[key] = self._global_flags.get(key, 0) + delta
                    continue
                except ValueError:
                    pass
            self._global_flags[key] = value

    def _cmd_conditional(self, engine: "GalEngine") -> None:
        cmd = self._current_state.scene.commands[self._current_state.command_index]
        data = cmd.data
        condition = data.get("condition", "")
        result = self._evaluate_condition(condition)

        branch = data.get("true_branch" if result else "false_branch", [])
        for cmd_data in branch:
            # Execute sub-commands inline
            temp_parser = SceneParser()
            parsed = temp_parser.parse_data({"scene_id": "_inline", "commands": [cmd_data]})
            for sub_cmd in parsed.commands:
                # Hack: temporarily insert commands
                pass  # This is simplified; real impl would use a command queue

    def _cmd_wait(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        duration = data.get("duration", 1.0)
        # In real implementation: engine.clock.wait(duration)

    def _cmd_transition(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        effect = data.get("effect", "fade")
        duration = data.get("duration", 1.0)
        # In real implementation: engine.renderer.play_transition(effect, duration)

    def _cmd_call_scene(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        scene_id = data.get("scene_id", "")
        # Push current state and start new scene
        self._call_stack.append({
            "scene_id": self._current_state.scene.scene_id,
            "command_index": self._current_state.command_index + 1,
        })
        self.start_scene(scene_id)

    def _cmd_return(self, engine: "GalEngine") -> None:
        if self._call_stack:
            prev = self._call_stack.pop()
            self.start_scene(prev["scene_id"])
            self._current_state.command_index = prev["command_index"]

    def _cmd_end_scene(self, engine: "GalEngine") -> None:
        data = self._current_state.scene.commands[self._current_state.command_index].data
        next_scene = data.get("next_scene")
        if next_scene:
            self.start_scene(next_scene)

    # ---- Utility ----

    def _evaluate_condition(self, condition: str) -> bool:
        """Evaluate a simple flag condition expression."""
        if not condition:
            return True
        try:
            # Simple expression: flag_name >= value
            # Supports: ==, !=, >=, <=, >, <
            import re
            match = re.match(r'(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)', condition)
            if match:
                flag_name = match.group(1)
                op = match.group(2)
                target_str = match.group(3).strip()
                current = self._global_flags.get(flag_name, 0)
                try:
                    target = float(target_str)
                except ValueError:
                    target = target_str.strip('"\'')
                if op == "==":
                    return current == target
                elif op == "!=":
                    return current != target
                elif op == ">=":
                    return current >= target
                elif op == "<=":
                    return current <= target
                elif op == ">":
                    return current > target
                elif op == "<":
                    return current < target
            # Boolean check
            return bool(self._global_flags.get(condition, False))
        except Exception:
            return False

    def _on_scene_end(self, engine: "GalEngine") -> None:
        """Called when a scene finishes executing."""
        if self._call_stack:
            prev = self._call_stack.pop()
            self.start_scene(prev["scene_id"])
            self._current_state.command_index = prev["command_index"]
        # If no call stack, the game ends or goes to menu

    def get_state(self) -> Dict[str, Any]:
        """Get the current scene state for save/load."""
        if not self._current_state:
            return {
                "scene_id": "",
                "scene_name": "",
                "command_index": 0,
            }
        return {
            "scene_id": self._current_state.scene.scene_id,
            "scene_name": self._current_state.scene.scene_name or self._current_state.scene.scene_id,
            "command_index": self._current_state.command_index,
        }

    def get_flag(self, name: str, default: Any = 0) -> Any:
        """Get a global flag value."""
        return self._global_flags.get(name, default)

    def set_flag(self, name: str, value: Any) -> None:
        """Set a global flag value."""
        self._global_flags[name] = value

    def get_visited_scenes(self) -> List[str]:
        """Get list of visited scene IDs (for flowchart)."""
        return self._visited_scenes.copy()
