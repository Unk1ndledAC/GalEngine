"""
Main Menu System

Handles:
- Title screen with background and BGM
- Main menu with New Game / Continue / Load / Gallery / Settings / Quit
- Opening animation (splash screens, disclaimer text scroll)
- Character route announcement voice lines
"""

from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field
from enum import Enum


class MenuState(Enum):
    """Current state of the main menu."""
    SPLASH = "splash"           # Showing logo/splash screens
    DISCLAIMER = "disclaimer"   # Scrolling disclaimer text
    TITLE = "title"             # Title screen (press any key)
    MAIN_MENU = "main_menu"     # Main menu options
    TRANSITION = "transition"   # Transitioning between states


@dataclass
class MenuItem:
    """A single item in the main menu."""
    action: str         # "new_game", "continue", "load", "gallery", "after_story", "settings", "quit"
    text: str           # Display text
    enabled: bool = True
    visible: bool = True
    icon: str = ""      # Optional icon path
    shortcut_key: str = ""  # Optional keyboard shortcut
    tooltip: str = ""


@dataclass
class SplashScreen:
    """A splash/logo screen to display during startup."""
    image: str                     # Image file path
    duration: float = 2.0          # Display duration in seconds
    fade_in: float = 0.5           # Fade-in duration
    fade_out: float = 0.5          # Fade-out duration
    bgm: Optional[str] = None      # BGM to play during this splash
    skip_on_click: bool = True     # Whether click skips this splash


@dataclass
class TitleScreenConfig:
    """Configuration for the title screen."""
    background: Optional[str] = None       # Background image path
    backgrounds: List[str] = field(default_factory=list)  # Multiple backgrounds (differential)
    bgm: Optional[str] = None              # Title screen BGM
    logo: Optional[str] = None             # Game logo image
    press_any_key_text: str = "Press any key"
    press_any_key_color: str = "#FFFFFF"
    press_any_key_size: int = 20
    game_title: str = ""
    title_color: str = "#FFFFFF"
    title_size: int = 48
    version_text: str = ""


@dataclass
class MainMenuConfig:
    """Configuration for the main menu screen."""
    background: Optional[str] = None
    bgm: Optional[str] = None
    items: List[MenuItem] = field(default_factory=list)
    cursor_memory: bool = True  # Remember last selected item
    show_version: bool = True


class MainMenu:
    """
    Manages the main menu system including the title screen,
    menu navigation, and startup sequence.
    """

    def __init__(self):
        self._state: MenuState = MenuState.TITLE
        self._previous_state: Optional[MenuState] = None

        # Splash screens
        self._splash_screens: List[SplashScreen] = []
        self._splash_index: int = 0

        # Title
        self._title_config: TitleScreenConfig = TitleScreenConfig()

        # Main menu
        self._menu_config: MainMenuConfig = MainMenuConfig()
        self._selected_index: int = 0
        self._hover_index: int = -1

        # Disclaimer
        self._disclaimer_text: str = ""
        self._disclaimer_scroll_pos: float = 0.0

        # Route announcement
        self._route_announcement_voice: Optional[str] = None

        # Callbacks
        self._on_action: Optional[Callable[[str], None]] = None
        self._on_state_change: Optional[Callable[[MenuState, MenuState], None]] = None

        self._init_default_menu()

    def _init_default_menu(self) -> None:
        """Set up the default main menu items."""
        self._menu_config.items = [
            MenuItem("new_game", "New Game", shortcut_key="N"),
            MenuItem("continue", "Continue", enabled=False, shortcut_key="C"),
            MenuItem("load", "Load Game", shortcut_key="L"),
            MenuItem("gallery", "Gallery", shortcut_key="G"),
            MenuItem("after_story", "After Story", enabled=False),
            MenuItem("settings", "Settings", shortcut_key="S"),
            MenuItem("quit", "Quit", shortcut_key="Q"),
        ]

    # ---- Configuration ----

    def set_title_config(self, config: Dict[str, Any]) -> None:
        """Set title screen configuration from project settings."""
        tc = self._title_config
        tc.background = config.get("background")
        tc.backgrounds = config.get("backgrounds", [])
        tc.bgm = config.get("bgm")
        tc.logo = config.get("logo")
        tc.press_any_key_text = config.get("press_any_key_text", "Press any key")
        tc.game_title = config.get("game_title", "")
        tc.version_text = config.get("version_text", "")

    def set_menu_config(self, config: Dict[str, Any]) -> None:
        """Set main menu configuration from project settings."""
        mc = self._menu_config
        mc.background = config.get("background")
        mc.bgm = config.get("bgm")
        if config.get("items"):
            mc.items = [
                MenuItem(
                    action=item.get("action", ""),
                    text=item.get("text", item.get("action", "")),
                    enabled=item.get("enabled", True),
                    visible=item.get("visible", True),
                    icon=item.get("icon", ""),
                    shortcut_key=item.get("shortcut_key", ""),
                    tooltip=item.get("tooltip", ""),
                )
                for item in config["items"]
            ]

    def set_splash_screens(self, splashes: List[Dict[str, Any]]) -> None:
        """Set splash screens from project settings."""
        self._splash_screens = [
            SplashScreen(
                image=s.get("image", ""),
                duration=s.get("duration", 2.0),
                fade_in=s.get("fade_in", 0.5),
                fade_out=s.get("fade_out", 0.5),
                bgm=s.get("bgm"),
                skip_on_click=s.get("skip_on_click", True),
            )
            for s in splashes
        ]

    def set_disclaimer(self, text: str) -> None:
        """Set the disclaimer text to display."""
        self._disclaimer_text = text

    # ---- State Management ----

    def set_state(self, new_state: MenuState) -> None:
        """Change the menu state."""
        old_state = self._state
        self._previous_state = old_state
        self._state = new_state
        if self._on_state_change:
            self._on_state_change(old_state, new_state)

    def go_to_title(self) -> None:
        """Go to the title screen."""
        self.set_state(MenuState.TITLE)

    def go_to_main_menu(self) -> None:
        """Go to the main menu."""
        self.set_state(MenuState.MAIN_MENU)

    def go_to_splash(self) -> None:
        """Start the splash screen sequence."""
        self._splash_index = 0
        self.set_state(MenuState.SPLASH)

    # ---- Splash Sequence ----

    def get_current_splash(self) -> Optional[SplashScreen]:
        """Get the currently displayed splash screen."""
        if self._state != MenuState.SPLASH or self._splash_index >= len(self._splash_screens):
            return None
        return self._splash_screens[self._splash_index]

    def advance_splash(self) -> bool:
        """
        Advance to the next splash screen.

        Returns:
            True if there are more splashes, False if we should go to disclaimer/title.
        """
        self._splash_index += 1
        if self._splash_index >= len(self._splash_screens):
            if self._disclaimer_text:
                self.set_state(MenuState.DISCLAIMER)
            else:
                self.go_to_title()
            return False
        return True

    # ---- Disclaimer ----

    def get_disclaimer_progress(self) -> float:
        """Get scroll progress (0.0-1.0) for the disclaimer text."""
        return self._disclaimer_scroll_pos

    def update_disclaimer_scroll(self, dt: float, speed: float = 30.0) -> None:
        """
        Update disclaimer scroll position.

        Args:
            dt: Delta time in seconds.
            speed: Scroll speed in pixels per second.
        """
        self._disclaimer_scroll_pos += speed * dt

    def finish_disclaimer(self) -> None:
        """Skip to end of disclaimer."""
        self.go_to_title()

    # ---- Menu Navigation ----

    def select_next(self) -> None:
        """Move selection to the next enabled menu item."""
        items = self._get_visible_items()
        if not items:
            return
        for i in range(1, len(items) + 1):
            idx = (self._selected_index + i) % len(items)
            if items[idx].enabled:
                self._selected_index = idx
                return

    def select_previous(self) -> None:
        """Move selection to the previous enabled menu item."""
        items = self._get_visible_items()
        if not items:
            return
        for i in range(1, len(items) + 1):
            idx = (self._selected_index - i) % len(items)
            if items[idx].enabled:
                self._selected_index = idx
                return

    def select_by_index(self, index: int) -> None:
        """Select a menu item by index (if enabled)."""
        items = self._get_visible_items()
        if 0 <= index < len(items) and items[index].enabled:
            self._selected_index = index

    def select_by_action(self, action: str) -> bool:
        """Select a menu item by action name."""
        items = self._get_visible_items()
        for i, item in enumerate(items):
            if item.action == action and item.enabled:
                self._selected_index = i
                return True
        return False

    def activate_selected(self) -> Optional[str]:
        """
        Activate the currently selected menu item.

        Returns:
            The action string, or None if nothing was activated.
        """
        items = self._get_visible_items()
        if not items or self._selected_index >= len(items):
            return None

        item = items[self._selected_index]
        if not item.enabled:
            return None

        if self._on_action:
            self._on_action(item.action)

        return item.action

    def hover_item(self, index: int) -> None:
        """Set the hovered item index (mouse interaction)."""
        self._hover_index = index

    # ---- Item Management ----

    def enable_item(self, action: str) -> None:
        """Enable a menu item by action name."""
        for item in self._menu_config.items:
            if item.action == action:
                item.enabled = True

    def disable_item(self, action: str) -> None:
        """Disable a menu item by action name."""
        for item in self._menu_config.items:
            if item.action == action:
                item.enabled = False

    def set_item_visibility(self, action: str, visible: bool) -> None:
        """Show/hide a menu item."""
        for item in self._menu_config.items:
            if item.action == action:
                item.visible = visible

    def get_item(self, action: str) -> Optional[MenuItem]:
        """Get a menu item by action name."""
        for item in self._menu_config.items:
            if item.action == action:
                return item
        return None

    def get_all_items(self) -> List[MenuItem]:
        return self._menu_config.items

    def _get_visible_items(self) -> List[MenuItem]:
        """Get all visible menu items."""
        return [item for item in self._menu_config.items if item.visible]

    def get_visible_enabled_items(self) -> List[MenuItem]:
        """Get visible and enabled menu items."""
        return [item for item in self._menu_config.items if item.visible and item.enabled]

    # ---- Route Announcement ----

    def set_route_announcement_voice(self, voice_file: str) -> None:
        """Set the voice line for character route announcement."""
        self._route_announcement_voice = voice_file

    def get_route_announcement_voice(self) -> Optional[str]:
        return self._route_announcement_voice

    def clear_route_announcement(self) -> None:
        self._route_announcement_voice = None

    # ---- Callbacks ----

    def on_action(self, callback: Callable[[str], None]) -> None:
        """Set callback for menu item activation."""
        self._on_action = callback

    def on_state_change(self, callback: Callable[[MenuState, MenuState], None]) -> None:
        """Set callback for menu state changes."""
        self._on_state_change = callback

    # ---- Queries ----

    @property
    def state(self) -> MenuState:
        return self._state

    @property
    def selected_index(self) -> int:
        return self._selected_index

    @property
    def hover_index(self) -> int:
        return self._hover_index

    @property
    def title_config(self) -> TitleScreenConfig:
        return self._title_config

    @property
    def menu_config(self) -> MainMenuConfig:
        return self._menu_config

    def get_selected_item(self) -> Optional[MenuItem]:
        items = self._get_visible_items()
        if 0 <= self._selected_index < len(items):
            return items[self._selected_index]
        return None

    def get_hovered_item(self) -> Optional[MenuItem]:
        items = self._get_visible_items()
        if 0 <= self._hover_index < len(items):
            return items[self._hover_index]
        return None

    def is_splash_sequence_complete(self) -> bool:
        return (
            self._state != MenuState.SPLASH
            or self._splash_index >= len(self._splash_screens)
        )
