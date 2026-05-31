"""
Special Gameplay Features

Implements:
- Dialogue history / back-log viewer
- Skip read text (auto-fast-forward through previously seen content)
- Skip all text (force fast-forward)
- Jump to next choice
- Voice line collection/favorites
"""

from typing import Optional, List, Dict, Set
from dataclasses import dataclass, field


@dataclass
class DialogueHistoryEntry:
    """A single entry in the dialogue history/log."""
    index: int
    character: Optional[str] = None
    display_name: Optional[str] = None
    text: str = ""
    is_narration: bool = False
    voice_file: Optional[str] = None
    scene_id: str = ""
    timestamp: float = 0.0


class DialogueHistory:
    """
    Manages the dialogue back-log / history viewer.

    Supports:
    - Recording all dialogue/narration lines
    - Scrolling through history during gameplay
    - Voice replay from history
    """

    MAX_HISTORY = 500

    def __init__(self):
        self._entries: List[DialogueHistoryEntry] = []
        self._viewing: bool = False
        self._view_index: int = -1
        self._index_counter: int = 0

    def record(
        self,
        character: Optional[str],
        text: str,
        display_name: Optional[str] = None,
        is_narration: bool = False,
        voice_file: Optional[str] = None,
        scene_id: str = "",
    ) -> None:
        """Record a dialogue/narration entry."""
        import time
        entry = DialogueHistoryEntry(
            index=self._index_counter,
            character=character,
            display_name=display_name or character,
            text=text,
            is_narration=is_narration,
            voice_file=voice_file,
            scene_id=scene_id,
            timestamp=time.time(),
        )
        self._index_counter += 1
        self._entries.append(entry)

        # Trim old entries if exceeding max
        if len(self._entries) > self.MAX_HISTORY:
            overflow = len(self._entries) - self.MAX_HISTORY
            self._entries = self._entries[overflow:]

    def open_viewer(self) -> None:
        """Open the dialogue history viewer."""
        if self._entries:
            self._viewing = True
            self._view_index = len(self._entries) - 1  # Start at most recent

    def close_viewer(self) -> None:
        """Close the dialogue history viewer."""
        self._viewing = False
        self._view_index = -1

    def scroll_up(self, lines: int = 1) -> None:
        """Scroll backward in history."""
        if self._viewing:
            self._view_index = max(0, self._view_index - lines)

    def scroll_down(self, lines: int = 1) -> None:
        """Scroll forward in history."""
        if self._viewing:
            self._view_index = min(len(self._entries) - 1, self._view_index + lines)

    def scroll_to_end(self) -> None:
        """Jump to the most recent entry."""
        if self._entries:
            self._view_index = len(self._entries) - 1

    def scroll_to_beginning(self) -> None:
        """Jump to the first entry."""
        if self._entries:
            self._view_index = 0

    def get_current_entry(self) -> Optional[DialogueHistoryEntry]:
        """Get the currently viewed history entry."""
        if not self._viewing or self._view_index < 0:
            return None
        if 0 <= self._view_index < len(self._entries):
            return self._entries[self._view_index]
        return None

    def get_visible_window(self, window_size: int = 10) -> List[DialogueHistoryEntry]:
        """
        Get a window of entries around the current view position.
        Used for rendering the log screen.
        """
        if not self._entries:
            return []

        if not self._viewing:
            # Show last N entries by default
            start = max(0, len(self._entries) - window_size)
            return self._entries[start:]

        # Show entries around view_index
        half = window_size // 2
        start = max(0, self._view_index - half)
        end = min(len(self._entries), start + window_size)
        return self._entries[start:end]

    def get_recent_entries(self, count: int = 10) -> List[DialogueHistoryEntry]:
        """Get the most recent history entries."""
        return self._entries[-count:] if self._entries else []

    @property
    def is_viewing(self) -> bool:
        return self._viewing

    @property
    def current_index(self) -> int:
        return self._view_index

    @property
    def total_entries(self) -> int:
        return len(self._entries)

    def clear(self) -> None:
        """Clear all history entries."""
        self._entries.clear()
        self._viewing = False
        self._view_index = -1
        self._index_counter = 0

    def get_state_dict(self) -> dict:
        """Serialize history state for save/load."""
        return {
            "entries": [
                {
                    "index": e.index,
                    "character": e.character,
                    "display_name": e.display_name,
                    "text": e.text,
                    "is_narration": e.is_narration,
                    "voice_file": e.voice_file,
                    "scene_id": e.scene_id,
                    "timestamp": e.timestamp,
                }
                for e in self._entries[-100:]  # Only save last 100 entries
            ],
            "index_counter": self._index_counter,
        }

    def restore_from_dict(self, data: dict) -> None:
        """Restore history from saved data."""
        self._entries = [
            DialogueHistoryEntry(
                index=e.get("index", 0),
                character=e.get("character"),
                display_name=e.get("display_name"),
                text=e.get("text", ""),
                is_narration=e.get("is_narration", False),
                voice_file=e.get("voice_file"),
                scene_id=e.get("scene_id", ""),
                timestamp=e.get("timestamp", 0.0),
            )
            for e in data.get("entries", [])
        ]
        self._index_counter = data.get("index_counter", 0)
        self._viewing = False
        self._view_index = -1


class SkipManager:
    """
    Manages text skipping behavior.

    Three modes:
    - Skip Read: Auto-advance through previously seen text, stop at unseen/choices.
    - Skip All: Force-advance through everything (including unseen text).
    - Jump to Choice: Skip until the next choice menu appears.
    """

    def __init__(self):
        self._seen_texts: Set[str] = set()  # Set of seen text hashes
        self._skip_read: bool = False       # Skip-read mode
        self._skip_all: bool = False        # Skip-all mode
        self._jump_to_choice: bool = False  # Jump-to-choice mode
        self._skip_speed: float = 0.02      # Seconds per click when skipping

    # ---- Marking Text as Seen ----

    def mark_as_seen(self, text: str) -> None:
        """Mark a line of text as having been seen by the player."""
        # Use a normalized hash to avoid minor differences
        normalized = text.strip().lower()
        self._seen_texts.add(normalized)

    def has_seen(self, text: str) -> bool:
        """Check if the player has seen this text before."""
        normalized = text.strip().lower()
        return normalized in self._seen_texts

    def clear_seen(self) -> None:
        """Clear all seen text records (e.g., on new game)."""
        self._seen_texts.clear()

    # ---- Skip Modes ----

    def toggle_skip_read(self) -> bool:
        """
        Toggle skip-read mode.
        Returns the new state.
        """
        self._skip_read = not self._skip_read
        if self._skip_read:
            self._skip_all = False
            self._jump_to_choice = False
        return self._skip_read

    def toggle_skip_all(self) -> bool:
        """
        Toggle skip-all mode.
        Returns the new state.
        """
        self._skip_all = not self._skip_all
        if self._skip_all:
            self._skip_read = False
            self._jump_to_choice = False
        return self._skip_all

    def start_jump_to_choice(self) -> None:
        """Start jumping to the next choice."""
        self._jump_to_choice = True
        self._skip_read = False
        self._skip_all = False

    def stop_jump_to_choice(self) -> None:
        """Stop jumping (arrived at a choice)."""
        self._jump_to_choice = False

    def stop_all_skip(self) -> None:
        """Stop all skip modes."""
        self._skip_read = False
        self._skip_all = False
        self._jump_to_choice = False

    # ---- Decision Logic ----

    def should_skip(self, text: str = "", is_choice: bool = False) -> bool:
        """
        Decide whether to skip the current text/command.

        Args:
            text: The current dialogue text (for read-skip check).
            is_choice: Whether the next command is a choice menu.

        Returns:
            True if the text should be skipped.
        """
        # Jump to choice: skip until we hit a choice
        if self._jump_to_choice:
            if is_choice:
                self.stop_jump_to_choice()
                return False
            return True

        # Skip all: always skip
        if self._skip_all:
            return True

        # Skip read: skip if text has been seen
        if self._skip_read:
            if is_choice:
                return False  # Always stop at choices
            return self.has_seen(text)

        return False

    def get_skip_delay(self) -> float:
        """Get the time to wait before advancing (in skip mode)."""
        return self._skip_speed

    @property
    def is_skipping(self) -> bool:
        return self._skip_read or self._skip_all or self._jump_to_choice

    @property
    def skip_mode_name(self) -> str:
        """Get the current skip mode display name."""
        if self._jump_to_choice:
            return "Jump to Choice"
        if self._skip_all:
            return "Skip All"
        if self._skip_read:
            return "Skip Read"
        return "None"

    def get_state_dict(self) -> dict:
        """Serialize skip state for save/load."""
        return {
            "seen_texts": list(self._seen_texts),
        }

    def restore_from_dict(self, data: dict) -> None:
        """Restore skip state from saved data."""
        self._seen_texts = set(data.get("seen_texts", []))


class VoiceCollection:
    """
    Manages favorited/collected voice lines.

    Players can mark voice lines as favorites during gameplay.
    Collected voices can be replayed in the gallery/music room.
    """

    def __init__(self):
        self._favorites: List[Dict] = []  # List of {filepath, character, text, label}
        self._favorite_set: Set[str] = set()  # For O(1) lookup

    def add_favorite(
        self,
        filepath: str,
        character: Optional[str] = None,
        text: str = "",
        label: str = "",
    ) -> bool:
        """
        Add a voice line to the favorites collection.

        Args:
            filepath: Path to the voice audio file.
            character: Character who spoke the line.
            text: The dialogue text associated with this voice.
            label: Custom label for the gallery.

        Returns:
            True if added, False if already in collection.
        """
        if filepath in self._favorite_set:
            return False

        import os
        display_label = label or os.path.basename(filepath)
        if text and not label:
            display_label = text[:50] + ("..." if len(text) > 50 else "")

        entry = {
            "filepath": filepath,
            "character": character,
            "text": text,
            "label": display_label,
        }
        self._favorites.append(entry)
        self._favorite_set.add(filepath)
        return True

    def remove_favorite(self, filepath: str) -> bool:
        """
        Remove a voice from favorites.

        Returns:
            True if removed, False if not found.
        """
        if filepath not in self._favorite_set:
            return False
        self._favorite_set.discard(filepath)
        self._favorites = [f for f in self._favorites if f["filepath"] != filepath]
        return True

    def is_favorite(self, filepath: str) -> bool:
        """Check if a voice file is in favorites."""
        return filepath in self._favorite_set

    def get_favorites(self, character: Optional[str] = None) -> List[Dict]:
        """
        Get favorited voice lines, optionally filtered by character.

        Returns list of {filepath, character, text, label}.
        """
        if character:
            return [f for f in self._favorites if f["character"] == character]
        return self._favorites.copy()

    def get_character_list(self) -> List[str]:
        """Get list of characters who have favorited voice lines."""
        return sorted(set(
            f["character"] for f in self._favorites if f["character"]
        ))

    def get_count(self) -> int:
        """Get total number of favorited voice lines."""
        return len(self._favorites)

    def clear(self) -> None:
        """Clear all favorites."""
        self._favorites.clear()
        self._favorite_set.clear()

    def get_state_dict(self) -> dict:
        """Serialize favorites for save/load."""
        return {
            "favorites": self._favorites,
        }

    def restore_from_dict(self, data: dict) -> None:
        """Restore favorites from saved data."""
        self._favorites = data.get("favorites", [])
        self._favorite_set = {f["filepath"] for f in self._favorites}
