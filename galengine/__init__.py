"""
GalEngine - Visual Novel Game Engine

A Python-based visual novel (galgame) engine
with support for dialogue, sprites, CG, BGM/SFX/voice,
save/load, flowcharts, and a graphical editor.
"""

from galengine.core.config import EngineConfig
from galengine.core.engine import GalEngine, get_engine
from galengine.loader.project_loader import ProjectLoader
from galengine.parser.json_parser import SceneParser, MarkdownParser, ParsedScene, Command, CommandType
from galengine.scene.scene_manager import SceneManager, SceneState
from galengine.scene.sprite_manager import (
    SpriteManager, SpriteState, SpriteVariant, SpritePosition,
)
from galengine.scene.transitions import TransitionManager, TransitionType
from galengine.scene.cg_mode import CGMode, CGEntry
from galengine.dialogue.dialogue_system import DialogueSystem, DialogueState
from galengine.dialogue.special_features import (
    DialogueHistory, SkipManager, VoiceCollection,
)
from galengine.audio.audio_manager import AudioManager, AudioTrack
from galengine.save.save_manager import SaveManager, SaveData
from galengine.ui.ui_manager import UIManager
from galengine.ui.components.dialog import ConfirmDialog, MessageDialog
from galengine.ui.components.slider import Slider, SliderSnapshot
from galengine.ui.components.layout import UILayout, UIElement, UIStyle, Anchor, SizeMode
from galengine.ui.screens.hud import GameHUD, TextBoxConfig, ChoiceButtonStyle, QuickMenuButton
from galengine.ui.screens.main_menu import MainMenu, MainMenuConfig, TitleScreenConfig, MenuState
from galengine.ui.screens.settings import Settings, TextSettings, AudioSettings, SettingsTab
from galengine.ui.screens.gallery import Gallery, GalleryTab, SceneEntry, CGEntry as GalleryCGEntry, MusicEntry
from galengine.ui.screens.after_story import AfterStory, CharacterRoute, AfterStoryContent
from galengine.flowchart.flowchart import Flowchart
from galengine.build.compiler import GameCompiler
from galengine.build.patch_manager import PatchManager, PatchInfo

__version__ = "0.1.0"
__all__ = [
    # Core
    "EngineConfig",
    "GalEngine",
    "get_engine",
    # Loader
    "ProjectLoader",
    # Parser
    "SceneParser",
    "MarkdownParser",
    "ParsedScene",
    "Command",
    "CommandType",
    # Scene
    "SceneManager",
    "SceneState",
    "SpriteManager",
    "SpriteState",
    "SpriteVariant",
    "SpritePosition",
    "TransitionManager",
    "TransitionType",
    "CGMode",
    "CGEntry",
    # Dialogue
    "DialogueSystem",
    "DialogueState",
    "DialogueHistory",
    "SkipManager",
    "VoiceCollection",
    # Audio
    "AudioManager",
    "AudioTrack",
    # Save
    "SaveManager",
    "SaveData",
    # UI
    "UIManager",
    "ConfirmDialog",
    "MessageDialog",
    "Slider",
    "SliderSnapshot",
    "UILayout",
    "UIElement",
    "UIStyle",
    "Anchor",
    "SizeMode",
    "GameHUD",
    "TextBoxConfig",
    "ChoiceButtonStyle",
    "QuickMenuButton",
    "MainMenu",
    "MainMenuConfig",
    "TitleScreenConfig",
    "MenuState",
    "Settings",
    "TextSettings",
    "AudioSettings",
    "SettingsTab",
    "Gallery",
    "GalleryTab",
    "SceneEntry",
    "GalleryCGEntry",
    "MusicEntry",
    "AfterStory",
    "CharacterRoute",
    "AfterStoryContent",
    # Flowchart
    "Flowchart",
    # Build
    "GameCompiler",
    "PatchManager",
    "PatchInfo",
]
