"""
Game HUD (Heads-Up Display)

Manages in-game UI elements:
- Text box with character name display
- Quick menu / shortcut button bar
- Choice/option buttons
"""

from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field


@dataclass
class TextBoxConfig:
    """Configuration for the dialogue text box."""
    x: int = 0
    y: int = 540
    width: int = 1280
    height: int = 180
    background_color: str = "rgba(0, 0, 0, 0.7)"
    background_image: Optional[str] = None
    text_color: str = "#FFFFFF"
    text_size: int = 24
    font_name: str = "default"
    name_color: str = "#FFD700"
    name_size: int = 22
    name_box_height: int = 40
    padding_x: int = 40
    padding_y: int = 20
    corner_radius: int = 0
    show_name_box: bool = True
    name_box_position: str = "top"  # "top", "left", "none"


@dataclass
class ChoiceButtonStyle:
    """Style configuration for choice buttons."""
    background_color: str = "rgba(50, 50, 80, 0.85)"
    hover_color: str = "rgba(80, 80, 120, 0.9)"
    text_color: str = "#FFFFFF"
    text_size: int = 22
    font_name: str = "default"
    corner_radius: int = 8
    padding_x: int = 20
    padding_y: int = 12
    spacing: int = 10
    width: int = 600
    height: int = 50


@dataclass
class QuickMenuButton:
    """A button in the quick menu bar."""
    action: str
    icon: str = ""
    tooltip: str = ""
    shortcut_key: str = ""
    enabled: bool = True


class GameHUD:
    """
    Manages in-game HUD rendering state.

    Coordinates the text box, quick menu bar, and choice menu display.
    """

    def __init__(self):
        # Text box
        self.textbox = TextBoxConfig()
        self._show_textbox: bool = True
        self._current_speaker: str = ""
        self._current_text: str = ""
        self._displayed_text: str = ""

        # Quick menu
        self._show_quick_menu: bool = True
        self._quick_menu_buttons: List[QuickMenuButton] = self._default_quick_menu()

        # Choices
        self._show_choices: bool = False
        self._choices: List[Dict[str, Any]] = []
        self._choice_prompt: str = ""
        self._choice_style: ChoiceButtonStyle = ChoiceButtonStyle()
        self._hovered_choice: int = -1
        self._selected_choice: int = -1

        # General
        self._visible: bool = True
        self._on_choice_selected: Optional[Callable] = None

    # ---- Text Box ----

    def set_textbox_config(self, config: Dict[str, Any]) -> None:
        """Update text box configuration from a dict."""
        for key, value in config.items():
            if hasattr(self.textbox, key):
                setattr(self.textbox, key, value)

    def show_textbox(self) -> None:
        self._show_textbox = True

    def hide_textbox(self) -> None:
        self._show_textbox = False

    def update_dialogue(self, speaker: str, text: str, displayed: str = "") -> None:
        """
        Update the dialogue display.

        Args:
            speaker: Character name (empty for narration).
            text: Full dialogue text.
            displayed: Currently visible portion of the text (typewriter effect).
        """
        self._current_speaker = speaker
        self._current_text = text
        self._displayed_text = displayed if displayed else text

    def clear_dialogue(self) -> None:
        """Clear dialogue display."""
        self._current_speaker = ""
        self._current_text = ""
        self._displayed_text = ""

    # ---- Quick Menu ----

    def _default_quick_menu(self) -> List[QuickMenuButton]:
        """Create the default quick menu button set."""
        return [
            QuickMenuButton("save", tooltip="Save", shortcut_key="S"),
            QuickMenuButton("load", tooltip="Load", shortcut_key="L"),
            QuickMenuButton("quick_save", tooltip="Quick Save", shortcut_key="F5"),
            QuickMenuButton("quick_load", tooltip="Quick Load", shortcut_key="F9"),
            QuickMenuButton("settings", tooltip="Settings", shortcut_key="Esc"),
            QuickMenuButton("history", tooltip="History", shortcut_key="H"),
            QuickMenuButton("skip", tooltip="Skip", shortcut_key="Ctrl"),
            QuickMenuButton("auto", tooltip="Auto", shortcut_key="A"),
            QuickMenuButton("back_to_menu", tooltip="Main Menu"),
        ]

    def set_quick_menu_buttons(self, buttons: List[Dict[str, Any]]) -> None:
        """Set custom quick menu buttons from config."""
        self._quick_menu_buttons = []
        for btn in buttons:
            self._quick_menu_buttons.append(QuickMenuButton(
                action=btn.get("action", ""),
                icon=btn.get("icon", ""),
                tooltip=btn.get("tooltip", ""),
                shortcut_key=btn.get("shortcut_key", ""),
                enabled=btn.get("enabled", True),
            ))

    def get_quick_menu_buttons(self) -> List[QuickMenuButton]:
        return self._quick_menu_buttons

    def show_quick_menu(self) -> None:
        self._show_quick_menu = True

    def hide_quick_menu(self) -> None:
        self._show_quick_menu = False

    def enable_button(self, action: str, enabled: bool) -> None:
        """Enable or disable a quick menu button by action name."""
        for btn in self._quick_menu_buttons:
            if btn.action == action:
                btn.enabled = enabled

    # ---- Choices ----

    def set_choice_style(self, config: Dict[str, Any]) -> None:
        """Update choice button style from config."""
        for key, value in config.items():
            if hasattr(self._choice_style, key):
                setattr(self._choice_style, key, value)

    def show_choices(
        self,
        prompt: str,
        choices: List[Dict[str, Any]],
        on_choice: Optional[Callable] = None,
    ) -> None:
        """
        Show choice buttons.

        Args:
            prompt: The choice prompt text (e.g., "What should I do?").
            choices: List of {text: str, target: str, condition: Optional[str]} dicts.
            on_choice: Callback when a choice is selected (receives index and choice dict).
        """
        self._show_choices = True
        self._choice_prompt = prompt
        self._choices = choices
        self._hovered_choice = -1
        self._selected_choice = -1
        self._on_choice_selected = on_choice

    def hide_choices(self) -> None:
        """Hide the choice menu."""
        self._show_choices = False

    def select_choice(self, index: int) -> bool:
        """
        Select a choice by index.

        Returns:
            True if the choice was valid and selected.
        """
        if not self._show_choices or index < 0 or index >= len(self._choices):
            return False

        self._selected_choice = index
        if self._on_choice_selected:
            self._on_choice_selected(index, self._choices[index])
        return True

    def hover_choice(self, index: int) -> None:
        """Set the hovered choice index (for mouse interaction)."""
        self._hovered_choice = index

    def get_visible_choices(self) -> List[Dict[str, Any]]:
        """Get choices that should be visible (after condition filtering)."""
        return self._choices  # Condition filtering is done at scene level

    def get_choice_position(self, index: int) -> tuple:
        """
        Get the on-screen position for a choice button.
        Returns (x, y) for the center of the button.
        """
        if not self._choices:
            return (640, 400)

        total_height = (
            len(self._choices) * self._choice_style.height
            + (len(self._choices) - 1) * self._choice_style.spacing
        )
        start_y = 360 - total_height // 2  # Center vertically
        x = 640 - self._choice_style.width // 2  # Center horizontally

        y = start_y + index * (self._choice_style.height + self._choice_style.spacing)
        return (x, y)

    # ---- General ----

    def show(self) -> None:
        self._visible = True

    def hide(self) -> None:
        self._visible = False

    def toggle(self) -> bool:
        self._visible = not self._visible
        return self._visible

    def reset(self) -> None:
        """Reset HUD to default state."""
        self._show_textbox = True
        self._show_quick_menu = True
        self._show_choices = False
        self._choices = []
        self._choice_prompt = ""
        self._hovered_choice = -1
        self._selected_choice = -1
        self._visible = True

    # ---- Properties ----

    @property
    def is_visible(self) -> bool:
        return self._visible

    @property
    def show_textbox(self) -> bool:
        return self._show_textbox

    @property
    def show_quick_menu(self) -> bool:
        return self._show_quick_menu

    @property
    def is_showing_choices(self) -> bool:
        return self._show_choices

    @property
    def current_speaker(self) -> str:
        return self._current_speaker

    @property
    def displayed_text(self) -> str:
        return self._displayed_text

    @property
    def choice_count(self) -> int:
        return len(self._choices)

    @property
    def choice_prompt(self) -> str:
        return self._choice_prompt
