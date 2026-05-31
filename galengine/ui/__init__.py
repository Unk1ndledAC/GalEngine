"""
UI management subpackage.
"""

from galengine.ui.ui_manager import UIManager
from galengine.ui.components.dialog import ConfirmDialog, MessageDialog
from galengine.ui.components.slider import Slider, SliderSnapshot
from galengine.ui.components.layout import (
    UILayout,
    UIElement,
    UIStyle,
    UIRect,
    Anchor,
    SizeMode,
)
from galengine.ui.screens.hud import GameHUD, TextBoxConfig, ChoiceButtonStyle, QuickMenuButton
from galengine.ui.screens.main_menu import MainMenu, MainMenuConfig, TitleScreenConfig, MenuState
from galengine.ui.screens.settings import Settings, TextSettings, AudioSettings, ControlSettings, SystemSettings, SettingsTab, KeyBinding
from galengine.ui.screens.gallery import Gallery, GalleryTab, SceneEntry as GallerySceneEntry, CGEntry as GalleryCGEntry, MusicEntry
from galengine.ui.screens.after_story import AfterStory, CharacterRoute, AfterStoryContent

__all__ = [
    "UIManager",
    "ConfirmDialog",
    "MessageDialog",
    "Slider",
    "SliderSnapshot",
    "UILayout",
    "UIElement",
    "UIStyle",
    "UIRect",
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
    "ControlSettings",
    "SystemSettings",
    "SettingsTab",
    "KeyBinding",
    "Gallery",
    "GalleryTab",
    "GallerySceneEntry",
    "GalleryCGEntry",
    "MusicEntry",
    "AfterStory",
    "CharacterRoute",
    "AfterStoryContent",
]
