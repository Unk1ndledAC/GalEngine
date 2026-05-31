"""
GalEngine Core Engine

Main engine class that coordinates all subsystems.
"""

import os
import sys
from typing import Optional, Dict, Any

from galengine.core.config import EngineConfig
from galengine.loader.project_loader import ProjectLoader
from galengine.parser.json_parser import SceneParser
from galengine.scene.scene_manager import SceneManager
from galengine.scene.sprite_manager import SpriteManager
from galengine.scene.transitions import TransitionManager
from galengine.scene.cg_mode import CGMode
from galengine.dialogue.dialogue_system import DialogueSystem
from galengine.dialogue.special_features import (
    DialogueHistory, SkipManager, VoiceCollection
)
from galengine.audio.audio_manager import AudioManager
from galengine.save.save_manager import SaveManager
from galengine.ui.ui_manager import UIManager
from galengine.ui.components.dialog import ConfirmDialog, MessageDialog
from galengine.ui.components.slider import Slider
from galengine.ui.components.layout import UILayout
from galengine.ui.screens.hud import GameHUD
from galengine.ui.screens.main_menu import MainMenu, MenuState
from galengine.ui.screens.settings import Settings
from galengine.ui.screens.gallery import Gallery, GalleryTab
from galengine.ui.screens.after_story import AfterStory
from galengine.flowchart.flowchart import Flowchart
from galengine.build.patch_manager import PatchManager


class GalEngine:
    """
    Main engine class for the visual novel runtime.

    Architecture:
    ┌──────────────────────────────────────────────────────────────┐
    │                        GalEngine                             │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
    │  │ Project  │ │  Scene   │ │ Sprite   │ │  Transition   │  │
    │  │ Loader   │ │ Manager  │ │ Manager  │ │   Manager     │  │
    │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
    │  │ Dialogue │ │  Audio   │ │   Save   │ │     UI        │  │
    │  │ System   │ │ Manager  │ │ Manager  │ │   Manager     │  │
    │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
    │  │  CG Mode │ │ History  │ │   Skip   │ │   Voice       │  │
    │  │          │ │          │ │ Manager  │ │  Collection   │  │
    │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
    │  │ Game HUD │ │   Main   │ │ Settings │ │   Gallery /   │  │
    │  │          │ │   Menu   │ │          │ │  After Story  │  │
    │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
    └──────────────────────────────────────────────────────────────┘
    """

    def __init__(self):
        # Core components
        self.config = EngineConfig()
        self.project_loader: Optional[ProjectLoader] = None
        self.scene_manager: Optional[SceneManager] = None

        # Visual components
        self.sprite_manager: Optional[SpriteManager] = None
        self.transition_manager: Optional[TransitionManager] = None
        self.cg_mode: Optional[CGMode] = None

        # Dialogue
        self.dialogue_system: Optional[DialogueSystem] = None
        self.dialogue_history: Optional[DialogueHistory] = None
        self.skip_manager: Optional[SkipManager] = None
        self.voice_collection: Optional[VoiceCollection] = None

        # Audio
        self.audio_manager: Optional[AudioManager] = None

        # Save
        self.save_manager: Optional[SaveManager] = None

        # UI
        self.ui_manager: Optional[UIManager] = None
        self.ui_layout: Optional[UILayout] = None
        self.hud: Optional[GameHUD] = None
        self.main_menu: Optional[MainMenu] = None
        self.settings: Optional[Settings] = None
        self.gallery: Optional[Gallery] = None
        self.after_story: Optional[AfterStory] = None

        # Dialogs
        self.confirm_dialog: Optional[ConfirmDialog] = None
        self.message_dialog: Optional[MessageDialog] = None

        # Flowchart
        self.flowchart: Optional[Flowchart] = None

        # Patch management
        self.patch_manager: Optional[PatchManager] = None

        # State
        self._project_root: Optional[str] = None
        self._running: bool = False
        self._initialized: bool = False

    def load_project(self, project_root: str) -> bool:
        """
        Load a game project from the given directory.

        Args:
            project_root: Absolute path to the game project directory
                          (must contain settings.json).

        Returns:
            True if loaded successfully, False otherwise.
        """
        project_root = os.path.abspath(project_root)
        self._project_root = project_root

        user_dir = self._get_user_dir()

        # Load engine config
        config_path = os.path.join(user_dir, "config.json")
        self.config = EngineConfig.load(config_path) if os.path.isfile(config_path) else EngineConfig()

        # Initialize all subsystems
        self.project_loader = ProjectLoader(project_root)
        self.scene_manager = SceneManager(self.project_loader)

        # Visual
        self.sprite_manager = SpriteManager()
        self.sprite_manager.set_asset_directory(project_root)
        self.transition_manager = TransitionManager()
        self.cg_mode = CGMode()

        # Dialogue
        self.dialogue_system = DialogueSystem(self.config)
        self.dialogue_history = DialogueHistory()
        self.skip_manager = SkipManager()
        self.voice_collection = VoiceCollection()

        # Audio
        self.audio_manager = AudioManager(self.config)

        # Save
        self.save_manager = SaveManager(user_dir)

        # UI
        self.ui_manager = UIManager(self.project_loader, self.config)
        self.ui_layout = UILayout()
        self.hud = GameHUD()
        self.main_menu = MainMenu()
        self.settings = Settings()
        self.gallery = Gallery()
        self.after_story = AfterStory()

        # Dialogs
        self.confirm_dialog = ConfirmDialog()
        self.message_dialog = MessageDialog()

        # Flowchart (built from project data after load)
        self.flowchart = Flowchart()

        # Patch manager (scan patches at startup)
        game_ver = self.project_loader.get_version()
        engine_ver = "0.1.0"  # Engine version constant
        self.patch_manager = PatchManager(game_ver, engine_ver)
        patches_dir = os.path.join(self._project_root, PatchManager.PATCH_DIR_NAME)
        if os.path.isdir(patches_dir):
            discovered = self.patch_manager.scan_patches(self._project_root)
            compat = self.patch_manager.get_compatible_patches()
            if compat:
                print(f"[Patch] {len(compat)} compatible patch(es) found, loading...")
                self.patch_manager.load_all_compatible()
                applied = self.patch_manager.apply_patches(
                    self.scene_manager, self.project_loader
                )
                print(f"[Patch] Applied {applied} scene(s) from patches.")
            incompat = self.patch_manager.get_incompatible_patches()
            if incompat:
                for p in incompat:
                    print(f"[Patch] WARNING: Incompatible patch '{p.patch_name}': {p.compatibility_error}")

        # Load and validate project
        if not self.project_loader.load():
            print(f"ERROR: Failed to load project at {project_root}")
            return False

        # Build flowchart from loaded project data
        self.flowchart.build_from_project(
            self.project_loader.project_data,
            self.project_loader.get_scene_ids(),
        )

        # Load settings from user data
        settings_path = os.path.join(user_dir, "settings.json")
        if os.path.isfile(settings_path):
            self.settings.load_from_file(settings_path)

        # Apply project configurations
        self._apply_project_config()

        # Validate assets
        if not self.project_loader.validate_assets():
            print("WARNING: Some assets referenced in settings.json are missing.")

        self._initialized = True
        return True

    def _apply_project_config(self) -> None:
        """Apply project-level configuration to subsystems."""
        px = self.project_loader.project_data

        # Title screen
        title_cfg = px.get("title_screen", {})
        self.main_menu.set_title_config(title_cfg)

        # Main menu
        menu_cfg = px.get("main_menu", {})
        self.main_menu.set_menu_config(menu_cfg)

        # Splash screens
        splashes = px.get("startup", {}).get("splash_screens", [])
        self.main_menu.set_splash_screens(splashes)

        # Disclaimer
        disclaimer = px.get("startup", {}).get("disclaimer_text", "")
        self.main_menu.set_disclaimer(disclaimer)

        # UI Layout
        ui_config = px.get("ui", {})
        self._load_ui_layout(ui_config)

        # Register characters
        for char_data in px.get("characters", []):
            char_id = char_data.get("id", "")
            if char_id:
                self.sprite_manager.register_variants_from_directory(
                    char_id,
                    os.path.join(project_root, char_data.get("sprites_dir", f"assets/sprites/{char_id}"))
                )
                if char_data.get("has_route"):
                    self.after_story.register_route(char_id, char_data.get("display_name", char_id))

        # Register CGs
        for cg_data in px.get("cgs", []):
            self.cg_mode.register_cg(
                cg_id=cg_data.get("id", ""),
                filepath=self.project_loader.get_asset_path(cg_data.get("file", ""), "cgs"),
                display_name=cg_data.get("display_name", ""),
                description=cg_data.get("description", ""),
                category=cg_data.get("category", "general"),
                unlock_condition=cg_data.get("unlock_condition"),
            )
            self.gallery.register_cg(
                cg_id=cg_data.get("id", ""),
                filepath=self.project_loader.get_asset_path(cg_data.get("file", ""), "cgs"),
                display_name=cg_data.get("display_name", ""),
                description=cg_data.get("description", ""),
                category=cg_data.get("category", "general"),
                unlock_condition=cg_data.get("unlock_condition"),
            )

        # Register scenes to gallery
        for scene_id, scene_path in px.get("scenes", {}).items():
            scene_name = scene_id.replace("_", " ").title()
            self.gallery.register_scene(
                scene_id=scene_id,
                display_name=scene_name,
            )

        # Register BGM tracks to gallery
        for track_data in px.get("music_gallery", []):
            self.gallery.register_track(
                track_id=track_data.get("id", ""),
                filepath=self.project_loader.get_asset_path(track_data.get("file", ""), "audio"),
                display_name=track_data.get("display_name", ""),
                artist=track_data.get("artist", ""),
                category=track_data.get("category", "bgm"),
                unlock_condition=track_data.get("unlock_condition"),
                loop=track_data.get("loop", True),
            )

    def _load_ui_layout(self, ui_config: Dict[str, Any]) -> None:
        """Load UI layout from project configuration."""
        layout_path = ui_config.get("layout")
        if layout_path:
            full_path = os.path.join(self._project_root, layout_path)
            if os.path.isfile(full_path):
                self.ui_layout.load_from_file(full_path)
        else:
            elements = ui_config.get("elements")
            if elements:
                self.ui_layout.load_from_dict({"elements": elements})

    def run(self) -> None:
        """Start the engine main loop."""
        if not self._initialized:
            raise RuntimeError("Engine not initialized. Call load_project() first.")

        self._running = True
        self._startup_sequence()

        while self._running:
            self._main_loop()

        self._shutdown_sequence()

    def quit(self) -> None:
        """Request engine shutdown."""
        self._running = False

    def _startup_sequence(self) -> None:
        """Handle startup animations, disclaimers, etc."""
        # Apply system settings
        if self.settings.system.skip_splash:
            self.main_menu.go_to_main_menu()
            return

        self.main_menu.go_to_splash()

        # Play splash screens
        while True:
            splash = self.main_menu.get_current_splash()
            if not splash:
                break

            self.ui_manager.show_splash(
                self.project_loader.get_asset_path(splash.image, "ui"),
                splash.duration,
                splash.fade_in,
                splash.fade_out,
            )
            if splash.bgm:
                self.audio_manager.play_bgm(
                    self.project_loader.get_asset_path(splash.bgm, "audio")
                )

            self.main_menu.advance_splash()

        # Show disclaimer
        if self.main_menu.state == MenuState.DISCLAIMER:
            self._wait_for_click()
            self.main_menu.finish_disclaimer()

    def _main_loop(self) -> None:
        """Single iteration of the engine main loop."""
        # Check skip state
        self.scene_manager.execute_current_scene(self)

    def _shutdown_sequence(self) -> None:
        """Handle exit voice lines and cleanup."""
        self.audio_manager.stop_all()
        if self.save_manager:
            self.save_manager.cleanup()

        # Save settings
        settings_path = os.path.join(self._get_user_dir(), "settings.json")
        self.settings.save_to_file(settings_path)

    def create_save_data(self) -> Any:
        """Create a SaveData object from current engine state."""
        from galengine.save.save_manager import SaveData
        import time
        state = self.scene_manager.get_state() if self.scene_manager else {}
        data = SaveData(
            slot_id=0,
            timestamp=time.time(),
            date_string=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            scene_id=state.get("scene_id", ""),
            scene_name=state.get("scene_name", ""),
            command_index=state.get("command_index", 0),
            flags=self.scene_manager._global_flags.copy() if self.scene_manager else {},
            call_stack=self.scene_manager._call_stack.copy() if self.scene_manager else [],
            visited_scenes=self.scene_manager._visited_scenes.copy() if self.scene_manager else [],
            dialogue_history=self.dialogue_history.get_state_dict() if self.dialogue_history else {},
        )
        if self.audio_manager and self.audio_manager._current_bgm:
            data.bgm_file = self.audio_manager._current_bgm.filepath
        return data

    def restore_from_save(self, save_data: Any) -> None:
        """Restore engine state from save data."""
        if self.scene_manager and save_data.flags:
            self.scene_manager._global_flags = save_data.flags.copy()
            self.scene_manager._call_stack = save_data.call_stack.copy()
            self.scene_manager._visited_scenes = save_data.visited_scenes.copy()
            self.scene_manager.start_scene(save_data.scene_id)
        if self.dialogue_history and save_data.dialogue_history:
            self.dialogue_history.restore_from_dict(save_data.dialogue_history)

    def _wait_for_click(self) -> None:
        """Wait for user click/press to continue."""
        # In the actual Pygame implementation, this will be event-driven
        pass

    def _get_user_dir(self) -> str:
        """Get the user's GalEngine data directory for saves/config."""
        if sys.platform == "win32":
            base = os.environ.get("APPDATA", os.path.expanduser("~"))
        elif sys.platform == "darwin":
            base = os.path.join(os.path.expanduser("~"), "Library", "Application Support")
        else:
            base = os.environ.get("XDG_DATA_HOME", os.path.join(os.path.expanduser("~"), ".local", "share"))
        path = os.path.join(base, "GalEngine")
        os.makedirs(path, exist_ok=True)
        return path


# Global engine instance
_engine_instance: Optional[GalEngine] = None


def get_engine() -> GalEngine:
    """Get or create the global engine instance."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = GalEngine()
    return _engine_instance
