"""
Dialogue System

Handles dialogue text display, typewriter effect, name tags,
and narration display.
"""

from typing import Optional, Tuple
from dataclasses import dataclass, field

from galengine.core.config import EngineConfig


@dataclass
class DialogueState:
    """Current state of the dialogue display."""
    character: Optional[str] = None
    display_name: Optional[str] = None
    text: str = ""
    full_text: str = ""
    displayed_chars: int = 0
    is_typing: bool = False
    is_narration: bool = False
    voice_file: Optional[str] = None


class DialogueSystem:
    """
    Manages dialogue text rendering with typewriter effect.

    Supports:
    - Character name display with optional overrides
    - Narration mode (no name box)
    - Typewriter text reveal
    - Text speed control
    """

    def __init__(self, config: EngineConfig):
        self.config = config
        self.state = DialogueState()
        self._history: list = []  # Dialogue history for back-log

    def show_dialogue(
        self,
        character: Optional[str],
        text: str,
        display_name: Optional[str] = None,
    ) -> None:
        """
        Display a dialogue line.

        Args:
            character: Character ID (null for narration).
            text: The dialogue text.
            display_name: Override displayed name (e.g., "???").
        """
        self.state.character = character
        self.state.display_name = display_name
        self.state.text = text
        self.state.full_text = text
        self.state.displayed_chars = 0
        self.state.is_typing = True
        self.state.is_narration = False
        self._history.append({
            "character": character,
            "display_name": display_name or character,
            "text": text,
        })

    def show_narration(self, text: str) -> None:
        """Display narration text (no character name)."""
        self.state.character = None
        self.state.display_name = None
        self.state.text = text
        self.state.full_text = text
        self.state.displayed_chars = 0
        self.state.is_typing = True
        self.state.is_narration = True
        self._history.append({
            "character": None,
            "display_name": None,
            "text": text,
        })

    def update(self, dt: float) -> None:
        """
        Update the typewriter effect.

        Args:
            dt: Delta time in seconds.
        """
        if not self.state.is_typing:
            return

        chars_to_add = int(self.config.text_speed * dt)
        if chars_to_add <= 0:
            chars_to_add = 1  # Always advance at least 1 character

        self.state.displayed_chars += chars_to_add
        if self.state.displayed_chars >= len(self.state.full_text):
            self.state.displayed_chars = len(self.state.full_text)
            self.state.is_typing = False

    def skip_to_end(self) -> None:
        """Instantly show all text (skip typewriter effect)."""
        self.state.displayed_chars = len(self.state.full_text)
        self.state.is_typing = False

    def get_visible_text(self) -> str:
        """Get the currently visible portion of text (typewriter effect)."""
        return self.state.full_text[: self.state.displayed_chars]

    def get_speaker_name(self) -> str:
        """Get the display name for the current speaker."""
        if self.state.is_narration:
            return ""
        return self.state.display_name or self.state.character or ""

    def is_finished(self) -> bool:
        """Whether the typewriter effect has completed."""
        return not self.state.is_typing

    def get_history(self, count: int = 50) -> list:
        """Get recent dialogue history."""
        return self._history[-count:]

    def clear(self) -> None:
        """Clear current dialogue state."""
        self.state = DialogueState()
