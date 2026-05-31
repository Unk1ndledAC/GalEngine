"""
GalEngine Core Configuration

Defines engine-wide constants, default settings, and configuration management.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Optional

# Engine version
ENGINE_VERSION = "0.1.0"

# Default window settings
DEFAULT_WINDOW_WIDTH = 1280
DEFAULT_WINDOW_HEIGHT = 720
DEFAULT_FPS = 60

# Dialogue defaults
DEFAULT_TEXT_SPEED = 40  # characters per second for typewriter effect
DEFAULT_TEXT_COLOR = (255, 255, 255, 255)
DEFAULT_TEXT_SIZE = 24
DEFAULT_NAME_COLOR = (200, 200, 255, 255)

# Audio defaults
DEFAULT_BGM_VOLUME = 0.8
DEFAULT_SFX_VOLUME = 1.0
DEFAULT_VOICE_VOLUME = 1.0
DEFAULT_MASTER_VOLUME = 1.0

# Save system
MAX_SAVE_SLOTS = 100
QUICK_SAVE_SLOT = -1  # Special slot ID for quick save
SAVE_FILE_EXTENSION = ".gsav"

# Data pack
DATA_PACK_EXTENSION = ".gpk"
DATA_PACK_DIR = "patches"

# Supported asset formats
SUPPORTED_IMAGE_FORMATS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
SUPPORTED_AUDIO_FORMATS = {".wav", ".mp3", ".ogg", ".flac"}
SUPPORTED_FONT_FORMATS = {".ttf", ".otf"}


@dataclass
class EngineConfig:
    """Runtime configuration for the GalEngine instance."""

    # Window
    window_width: int = DEFAULT_WINDOW_WIDTH
    window_height: int = DEFAULT_WINDOW_HEIGHT
    fullscreen: bool = False
    fps: int = DEFAULT_FPS

    # Text
    text_speed: float = DEFAULT_TEXT_SPEED
    text_color: tuple = field(default_factory=lambda: DEFAULT_TEXT_COLOR)
    text_size: int = DEFAULT_TEXT_SIZE
    text_font: Optional[str] = None
    name_color: tuple = field(default_factory=lambda: DEFAULT_NAME_COLOR)

    # Audio
    master_volume: float = DEFAULT_MASTER_VOLUME
    bgm_volume: float = DEFAULT_BGM_VOLUME
    sfx_volume: float = DEFAULT_SFX_VOLUME
    voice_volume: float = DEFAULT_VOICE_VOLUME
    character_voice_volumes: dict = field(default_factory=dict)

    # Gameplay
    skip_read: bool = True
    skip_unread: bool = False
    auto_mode: bool = False
    auto_delay: float = 2.0  # seconds between auto-advances

    # Key bindings (default)
    key_confirm: int = 13  # Enter
    key_cancel: int = 27   # Escape
    key_skip: int = 32     # Space
    key_auto: int = 97     # A
    key_save: int = 115    # S
    key_load: int = 108    # L
    key_quick_save: int = 282  # F5
    key_quick_load: int = 286  # F9
    key_history: int = 104     # H
    key_hide_ui: int = 118     # V

    def to_dict(self) -> dict:
        """Serialize config to a JSON-compatible dict."""
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, tuple):
                result[key] = list(value)
            else:
                result[key] = value
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "EngineConfig":
        """Deserialize config from a dict."""
        valid_keys = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        # Convert list back to tuple for color values
        for key in ("text_color", "name_color"):
            if key in filtered and isinstance(filtered[key], list):
                filtered[key] = tuple(filtered[key])
        return cls(**filtered)

    def save(self, filepath: str) -> None:
        """Save config to a JSON file."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)

    @classmethod
    def load(cls, filepath: str) -> "EngineConfig":
        """Load config from a JSON file. Returns defaults if file doesn't exist."""
        if not os.path.exists(filepath):
            return cls()
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)
