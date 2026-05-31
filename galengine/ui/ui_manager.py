"""
UI Manager

Manages game UI elements: text boxes, quick menu, choice menus,
save/load screens, settings, main menu, etc.
Supports developer-customizable JSON layouts.
"""

from typing import Optional, Dict, Any, List, TYPE_CHECKING

from galengine.core.config import EngineConfig

if TYPE_CHECKING:
    from galengine.loader.project_loader import ProjectLoader


class UIManager:
    """
    Manages all game UI state and rendering.

    UI is configured via the developer's ui-layout.json file,
    allowing full customization of positions, styles, and visibility.
    """

    def __init__(self, project_loader: "ProjectLoader", config: EngineConfig):
        self._loader = project_loader
        self.config = config
        self._layout: Dict[str, Any] = {}
        self._state: Dict[str, Any] = {
            "current_screen": "game",  # game, menu, settings, save, load, flowchart, gallery
            "show_textbox": True,
            "show_quick_menu": True,
            "showing_choices": False,
            "choices": [],
            "choice_prompt": "",
        }
        self._load_layout()

    def _load_layout(self) -> None:
        """Load UI layout configuration from project."""
        layout_config = self._loader.project_data.get("ui", {})
        layout_path = layout_config.get("layout")
        if layout_path:
            import json, os
            full_path = os.path.join(self._loader.project_root, layout_path)
            if os.path.isfile(full_path):
                with open(full_path, "r", encoding="utf-8") as f:
                    self._layout = json.load(f)

    # ---- Splash Screen ----

    def show_splash(self, image_path: str, duration: float, fade_in: float, fade_out: float) -> None:
        """Display a splash/logo screen."""
        # Stub: in real impl, renderer shows image with transitions
        pass

    # ---- Text Box ----

    def get_textbox_rect(self) -> tuple:
        """Get the text box position and size: (x, y, width, height)."""
        tb = self._layout.get("textbox", {})
        return (
            tb.get("x", 0),
            tb.get("y", 540),
            tb.get("width", 1280),
            tb.get("height", 180),
        )

    def show_textbox(self) -> None:
        self._state["show_textbox"] = True

    def hide_textbox(self) -> None:
        self._state["show_textbox"] = False

    # ---- Quick Menu ----

    def get_quick_menu_buttons(self) -> List[Dict]:
        """Get the configured quick menu buttons."""
        qm = self._layout.get("quick_menu", {})
        if not qm.get("visible", True):
            return []
        return qm.get("buttons", [
            {"action": "save", "icon": "", "tooltip": "Save"},
            {"action": "load", "icon": "", "tooltip": "Load"},
            {"action": "quick_save", "icon": "", "tooltip": "Quick Save"},
            {"action": "quick_load", "icon": "", "tooltip": "Quick Load"},
            {"action": "settings", "icon": "", "tooltip": "Settings"},
            {"action": "flowchart", "icon": "", "tooltip": "Flowchart"},
            {"action": "history", "icon": "", "tooltip": "History"},
            {"action": "skip", "icon": "", "tooltip": "Skip"},
            {"action": "auto", "icon": "", "tooltip": "Auto"},
            {"action": "back_to_menu", "icon": "", "tooltip": "Main Menu"},
        ])

    def show_quick_menu(self) -> None:
        self._state["show_quick_menu"] = True

    def hide_quick_menu(self) -> None:
        self._state["show_quick_menu"] = False

    # ---- Choices ----

    def show_choices(self, prompt: str, choices: list) -> None:
        """Display a choice menu."""
        self._state["showing_choices"] = True
        self._state["choices"] = choices
        self._state["choice_prompt"] = prompt

    def hide_choices(self) -> None:
        self._state["showing_choices"] = False
        self._state["choices"] = []

    # ---- Screen Navigation ----

    def go_to_main_menu(self) -> None:
        self._state["current_screen"] = "menu"

    def go_to_game(self) -> None:
        self._state["current_screen"] = "game"

    def go_to_settings(self) -> None:
        self._state["current_screen"] = "settings"

    def go_to_save(self) -> None:
        self._state["current_screen"] = "save"

    def go_to_load(self) -> None:
        self._state["current_screen"] = "load"

    def go_to_flowchart(self) -> None:
        self._state["current_screen"] = "flowchart"

    def go_to_gallery(self, gallery_type: str = "scene") -> None:
        """Open gallery: 'scene', 'cg', or 'music'."""
        self._state["current_screen"] = f"gallery_{gallery_type}"

    def go_to_after_story(self) -> None:
        self._state["current_screen"] = "after_story"

    # ---- Main Menu ----

    def get_main_menu_items(self) -> List[Dict]:
        """Get configured main menu items."""
        mm = self._layout.get("main_menu", {})
        return mm.get("menu_items", [
            {"action": "new_game", "text": "New Game"},
            {"action": "continue", "text": "Continue"},
            {"action": "load", "text": "Load Game"},
            {"action": "gallery", "text": "Gallery"},
            {"action": "after_story", "text": "After Story"},
            {"action": "settings", "text": "Settings"},
            {"action": "quit", "text": "Quit"},
        ])

    # ---- Confirm Dialog ----

    def show_confirm(self, message: str, on_yes=None, on_no=None) -> None:
        """Show a confirmation dialog."""
        self._state["confirm_message"] = message
        self._state["confirm_visible"] = True
        self._state["confirm_on_yes"] = on_yes
        self._state["confirm_on_no"] = on_no

    def hide_confirm(self) -> None:
        self._state["confirm_visible"] = False
