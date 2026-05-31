"""
Settings System

Manages game settings:
- Text settings (color, size, speed)
- Audio settings (master, BGM, SFX, voice, per-character voice volumes)
- Key bindings (customizable keyboard shortcuts)
"""

from typing import Optional, Dict, List, Any, Callable
from dataclasses import dataclass, field
from enum import Enum


class SettingsTab(Enum):
    """Settings tabs/sections."""
    TEXT = "text"
    AUDIO = "audio"
    CONTROLS = "controls"
    SYSTEM = "system"


@dataclass
class TextSettings:
    """Text display settings."""
    text_speed: float = 30.0        # Characters per second
    text_color: str = "#FFFFFF"
    text_size: int = 24
    font_name: str = "default"
    auto_read_speed: float = 2.0    # Seconds per line in auto mode
    skip_unread: bool = False       # Whether skip mode skips unread text
    show_page_indicator: bool = True
    name_display_mode: str = "full"  # "full", "abbreviated", "none"


@dataclass
class AudioSettings:
    """Audio volume settings."""
    master_volume: float = 1.0
    bgm_volume: float = 0.8
    sfx_volume: float = 0.8
    voice_volume: float = 0.9
    mute_when_unfocused: bool = False
    audio_device: str = "default"
    # Per-character voice volumes
    character_volumes: Dict[str, float] = field(default_factory=dict)


@dataclass
class KeyBinding:
    """A single key binding."""
    action: str         # Action identifier
    label: str          # Display name
    default_key: str    # Default key
    current_key: str    # Currently assigned key
    category: str = "general"  # "general", "dialogue", "navigation", "system"


@dataclass
class ControlSettings:
    """Keyboard/mouse control settings."""
    key_bindings: Dict[str, KeyBinding] = field(default_factory=dict)
    mouse_sensitivity: float = 1.0
    invert_scroll: bool = False
    touch_mode: bool = False  # Enable touch-friendly UI


@dataclass
class SystemSettings:
    """System/general settings."""
    language: str = "zh-CN"
    window_mode: str = "fullscreen"  # "fullscreen", "windowed", "borderless"
    resolution: str = "1280x720"
    vsync: bool = True
    fps_limit: int = 60
    skip_splash: bool = False       # Skip splash screens on launch
    confirm_on_quit: bool = True
    auto_save_on_choice: bool = True
    auto_save_interval: int = 0     # 0 = disabled, seconds


class Settings:
    """
    Manages all game settings with save/load support.

    Settings are persisted to:
        {user_data_dir}/settings.json
    """

    def __init__(self):
        self.text = TextSettings()
        self.audio = AudioSettings()
        self.controls = ControlSettings()
        self.system = SystemSettings()

        self._on_changed: Optional[Callable[[SettingsTab, str, Any], None]] = None
        self._init_default_keybindings()

    def _init_default_keybindings(self) -> None:
        """Set up default key bindings."""
        default_bindings = [
            KeyBinding("advance", "Advance Text", "Space", "Space", "dialogue"),
            KeyBinding("advance_alt", "Advance (Alt)", "Enter", "Enter", "dialogue"),
            KeyBinding("advance_click", "Advance (Click)", "Mouse Left", "Mouse Left", "dialogue"),
            KeyBinding("skip", "Skip Mode", "Left Ctrl", "Left Ctrl", "dialogue"),
            KeyBinding("auto_mode", "Auto Mode", "A", "A", "dialogue"),
            KeyBinding("save", "Save", "S", "S", "system"),
            KeyBinding("load", "Load", "L", "L", "system"),
            KeyBinding("quick_save", "Quick Save", "F5", "F5", "system"),
            KeyBinding("quick_load", "Quick Load", "F9", "F9", "system"),
            KeyBinding("settings", "Settings", "Escape", "Escape", "system"),
            KeyBinding("history", "History / Backlog", "H", "H", "dialogue"),
            KeyBinding("history_scroll_up", "Scroll History Up", "Up", "Up", "dialogue"),
            KeyBinding("history_scroll_down", "Scroll History Down", "Down", "Down", "dialogue"),
            KeyBinding("hide_ui", "Hide UI", "F12", "F12", "system"),
            KeyBinding("screenshot", "Screenshot", "F11", "F11", "system"),
            KeyBinding("fullscreen", "Toggle Fullscreen", "F", "F", "system"),
            KeyBinding("back_to_menu", "Back to Menu", "Backspace", "Backspace", "system"),
            KeyBinding("menu_up", "Menu Up", "Up", "Up", "navigation"),
            KeyBinding("menu_down", "Menu Down", "Down", "Down", "navigation"),
            KeyBinding("menu_confirm", "Menu Confirm", "Space", "Space", "navigation"),
            KeyBinding("menu_cancel", "Menu Cancel", "Escape", "Escape", "navigation"),
        ]
        for kb in default_bindings:
            self.controls.key_bindings[kb.action] = kb

    # ---- Text ----

    def set_text_speed(self, speed: float) -> None:
        self.text.text_speed = max(1.0, min(300.0, speed))
        self._notify_change(SettingsTab.TEXT, "text_speed", self.text.text_speed)

    def set_text_color(self, color: str) -> None:
        self.text.text_color = color
        self._notify_change(SettingsTab.TEXT, "text_color", color)

    def set_text_size(self, size: int) -> None:
        self.text.text_size = max(12, min(48, size))
        self._notify_change(SettingsTab.TEXT, "text_size", self.text.text_size)

    def set_font(self, font_name: str) -> None:
        self.text.font_name = font_name
        self._notify_change(SettingsTab.TEXT, "font_name", font_name)

    def set_auto_read_speed(self, speed: float) -> None:
        self.text.auto_read_speed = max(0.5, min(10.0, speed))
        self._notify_change(SettingsTab.TEXT, "auto_read_speed", self.text.auto_read_speed)

    # ---- Audio ----

    def set_master_volume(self, volume: float) -> None:
        self.audio.master_volume = max(0.0, min(1.0, volume))
        self._notify_change(SettingsTab.AUDIO, "master_volume", self.audio.master_volume)

    def set_bgm_volume(self, volume: float) -> None:
        self.audio.bgm_volume = max(0.0, min(1.0, volume))
        self._notify_change(SettingsTab.AUDIO, "bgm_volume", self.audio.bgm_volume)

    def set_sfx_volume(self, volume: float) -> None:
        self.audio.sfx_volume = max(0.0, min(1.0, volume))
        self._notify_change(SettingsTab.AUDIO, "sfx_volume", self.audio.sfx_volume)

    def set_voice_volume(self, volume: float) -> None:
        self.audio.voice_volume = max(0.0, min(1.0, volume))
        self._notify_change(SettingsTab.AUDIO, "voice_volume", self.audio.voice_volume)

    def set_character_voice_volume(self, character: str, volume: float) -> None:
        self.audio.character_volumes[character] = max(0.0, min(1.0, volume))
        self._notify_change(SettingsTab.AUDIO, f"char_voice_{character}", volume)

    def get_character_voice_volume(self, character: str) -> float:
        return self.audio.character_volumes.get(character, 1.0)

    def set_mute_when_unfocused(self, enabled: bool) -> None:
        self.audio.mute_when_unfocused = enabled
        self._notify_change(SettingsTab.AUDIO, "mute_when_unfocused", enabled)

    # ---- Controls ----

    def get_keybinding(self, action: str) -> Optional[KeyBinding]:
        """Get a key binding by action name."""
        return self.controls.key_bindings.get(action)

    def set_keybinding(self, action: str, new_key: str) -> bool:
        """
        Change a key binding.

        Returns:
            False if the key is already assigned to another action (conflict).
        """
        if action not in self.controls.key_bindings:
            return False

        # Check for conflicts
        for other_action, kb in self.controls.key_bindings.items():
            if other_action != action and kb.current_key == new_key:
                return False

        self.controls.key_bindings[action].current_key = new_key
        self._notify_change(SettingsTab.CONTROLS, f"key_{action}", new_key)
        return True

    def reset_keybinding(self, action: str) -> None:
        """Reset a key binding to its default."""
        if action in self.controls.key_bindings:
            kb = self.controls.key_bindings[action]
            kb.current_key = kb.default_key
            self._notify_change(SettingsTab.CONTROLS, f"key_{action}", kb.default_key)

    def reset_all_keybindings(self) -> None:
        """Reset all key bindings to defaults."""
        for kb in self.controls.key_bindings.values():
            kb.current_key = kb.default_key
        self._notify_change(SettingsTab.CONTROLS, "keybindings_reset", True)

    def get_keybindings_by_category(self, category: str) -> List[KeyBinding]:
        """Get key bindings filtered by category."""
        return [
            kb for kb in self.controls.key_bindings.values()
            if kb.category == category
        ]

    def get_all_keybindings(self) -> List[KeyBinding]:
        return list(self.controls.key_bindings.values())

    # ---- System ----

    def set_language(self, lang: str) -> None:
        self.system.language = lang
        self._notify_change(SettingsTab.SYSTEM, "language", lang)

    def set_window_mode(self, mode: str) -> None:
        self.system.window_mode = mode
        self._notify_change(SettingsTab.SYSTEM, "window_mode", mode)

    def set_resolution(self, resolution: str) -> None:
        self.system.resolution = resolution
        self._notify_change(SettingsTab.SYSTEM, "resolution", resolution)

    # ---- Persistence ----

    def to_dict(self) -> Dict[str, Any]:
        """Serialize all settings to a dictionary."""
        return {
            "text": {
                "text_speed": self.text.text_speed,
                "text_color": self.text.text_color,
                "text_size": self.text.text_size,
                "font_name": self.text.font_name,
                "auto_read_speed": self.text.auto_read_speed,
                "skip_unread": self.text.skip_unread,
            },
            "audio": {
                "master_volume": self.audio.master_volume,
                "bgm_volume": self.audio.bgm_volume,
                "sfx_volume": self.audio.sfx_volume,
                "voice_volume": self.audio.voice_volume,
                "mute_when_unfocused": self.audio.mute_when_unfocused,
                "character_volumes": self.audio.character_volumes,
            },
            "controls": {
                "key_bindings": {
                    action: kb.current_key
                    for action, kb in self.controls.key_bindings.items()
                },
            },
            "system": {
                "language": self.system.language,
                "window_mode": self.system.window_mode,
                "resolution": self.system.resolution,
                "vsync": self.system.vsync,
                "fps_limit": self.system.fps_limit,
                "skip_splash": self.system.skip_splash,
                "confirm_on_quit": self.system.confirm_on_quit,
            },
        }

    def from_dict(self, data: Dict[str, Any]) -> None:
        """Load settings from a dictionary."""
        text_data = data.get("text", {})
        self.text.text_speed = text_data.get("text_speed", 30.0)
        self.text.text_color = text_data.get("text_color", "#FFFFFF")
        self.text.text_size = text_data.get("text_size", 24)
        self.text.font_name = text_data.get("font_name", "default")
        self.text.auto_read_speed = text_data.get("auto_read_speed", 2.0)
        self.text.skip_unread = text_data.get("skip_unread", False)

        audio_data = data.get("audio", {})
        self.audio.master_volume = audio_data.get("master_volume", 1.0)
        self.audio.bgm_volume = audio_data.get("bgm_volume", 0.8)
        self.audio.sfx_volume = audio_data.get("sfx_volume", 0.8)
        self.audio.voice_volume = audio_data.get("voice_volume", 0.9)
        self.audio.mute_when_unfocused = audio_data.get("mute_when_unfocused", False)
        self.audio.character_volumes = audio_data.get("character_volumes", {})

        controls_data = data.get("controls", {})
        kb_data = controls_data.get("key_bindings", {})
        for action, key in kb_data.items():
            if action in self.controls.key_bindings:
                self.controls.key_bindings[action].current_key = key

        sys_data = data.get("system", {})
        self.system.language = sys_data.get("language", "zh-CN")
        self.system.window_mode = sys_data.get("window_mode", "fullscreen")
        self.system.resolution = sys_data.get("resolution", "1280x720")
        self.system.vsync = sys_data.get("vsync", True)
        self.system.fps_limit = sys_data.get("fps_limit", 60)
        self.system.skip_splash = sys_data.get("skip_splash", False)
        self.system.confirm_on_quit = sys_data.get("confirm_on_quit", True)

    def save_to_file(self, filepath: str) -> bool:
        """Save settings to a JSON file."""
        import json
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"ERROR: Failed to save settings: {e}")
            return False

    def load_from_file(self, filepath: str) -> bool:
        """Load settings from a JSON file."""
        import json, os
        if not os.path.isfile(filepath):
            return False
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.from_dict(data)
            return True
        except Exception as e:
            print(f"ERROR: Failed to load settings: {e}")
            return False

    # ---- Callbacks ----

    def on_changed(self, callback: Callable[[SettingsTab, str, Any], None]) -> None:
        """Set callback for any setting change."""
        self._on_changed = callback

    def _notify_change(self, tab: SettingsTab, key: str, value: Any) -> None:
        if self._on_changed:
            self._on_changed(tab, key, value)
