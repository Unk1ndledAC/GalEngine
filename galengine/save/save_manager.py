"""
Save Manager

Handles game save/load functionality with:
- Multiple save slots with timestamps and preview screenshots
- Quick save/load (single slot, separate from regular saves)
- Save data serialization/deserialization
"""

import json
import os
import time
import zlib
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field


@dataclass
class SaveData:
    """Complete save data for a single save slot."""
    slot_id: int
    timestamp: float = field(default_factory=time.time)
    date_string: str = ""
    scene_id: str = ""
    scene_name: str = ""
    command_index: int = 0
    chapter: str = ""
    route: Optional[str] = None
    screenshot: Optional[bytes] = None  # PNG bytes of scene screenshot
    flags: Dict[str, Any] = field(default_factory=dict)
    call_stack: List[Dict] = field(default_factory=list)
    visited_scenes: List[str] = field(default_factory=list)
    bgm_file: Optional[str] = None
    dialogue_history: List[Dict] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    def get_display_text(self) -> str:
        """Get human-readable save slot display text."""
        parts = [self.date_string]
        if self.chapter:
            parts.append(self.chapter)
        if self.scene_name:
            parts.append(self.scene_name)
        return " | ".join(parts)


class SaveManager:
    """
    Manages game saves.

    Directory structure:
        {user_data_dir}/saves/
            slot_000.gsav
            slot_001.gsav
            ...
            quick_save.gsav
    """

    QUICK_SAVE_ID = -1
    MAX_SLOTS = 100

    def __init__(self, user_data_dir: str):
        self._save_dir = os.path.join(user_data_dir, "saves")
        os.makedirs(self._save_dir, exist_ok=True)

    # ---- Save ----

    def save(self, slot_id: int, data: SaveData, overwrite: bool = False) -> bool:
        """
        Save game state to a slot.

        Args:
            slot_id: Slot number (0-99 for regular, -1 for quick save).
            data: Save data to write.
            overwrite: If True, overwrite existing save without prompt.

        Returns:
            True if saved successfully, False otherwise.
        """
        filepath = self._get_slot_path(slot_id)

        if os.path.exists(filepath) and not overwrite:
            return False  # Caller should handle the overwrite prompt

        try:
            serialized = json.dumps(self._serialize(data), ensure_ascii=False)
            compressed = zlib.compress(serialized.encode("utf-8"))

            with open(filepath, "wb") as f:
                f.write(compressed)

            return True
        except Exception as e:
            print(f"ERROR: Failed to save to slot {slot_id}: {e}")
            return False

    def quick_save(self, data: SaveData) -> bool:
        """Quick save (single slot, always overwrites)."""
        return self.save(self.QUICK_SAVE_ID, data, overwrite=True)

    # ---- Load ----

    def load(self, slot_id: int) -> Optional[SaveData]:
        """
        Load game state from a save slot.

        Args:
            slot_id: Slot number to load.

        Returns:
            SaveData if loaded successfully, None otherwise.
        """
        filepath = self._get_slot_path(slot_id)
        if not os.path.exists(filepath):
            return None

        try:
            with open(filepath, "rb") as f:
                compressed = f.read()

            serialized = zlib.decompress(compressed).decode("utf-8")
            return self._deserialize(json.loads(serialized))
        except Exception as e:
            print(f"ERROR: Failed to load save slot {slot_id}: {e}")
            return None

    def quick_load(self) -> Optional[SaveData]:
        """Load from quick save slot."""
        return self.load(self.QUICK_SAVE_ID)

    # ---- Listing ----

    def list_saves(self) -> Dict[int, SaveData]:
        """
        List all available save slots with metadata.

        Returns:
            Dict mapping slot_id -> SaveData (with minimal data for display).
        """
        saves = {}
        for slot_id in range(self.MAX_SLOTS):
            filepath = self._get_slot_path(slot_id)
            if os.path.exists(filepath):
                try:
                    with open(filepath, "rb") as f:
                        data = json.loads(zlib.decompress(f.read()).decode("utf-8"))
                    saves[slot_id] = SaveData(
                        slot_id=slot_id,
                        timestamp=data.get("timestamp", 0),
                        date_string=data.get("date_string", ""),
                        scene_id=data.get("scene_id", ""),
                        scene_name=data.get("scene_name", ""),
                        chapter=data.get("chapter", ""),
                        route=data.get("route"),
                    )
                except Exception:
                    continue

        # Quick save
        qs_path = self._get_slot_path(self.QUICK_SAVE_ID)
        if os.path.exists(qs_path):
            try:
                with open(qs_path, "rb") as f:
                    data = json.loads(zlib.decompress(f.read()).decode("utf-8"))
                saves[self.QUICK_SAVE_ID] = SaveData(
                    slot_id=self.QUICK_SAVE_ID,
                    timestamp=data.get("timestamp", 0),
                    date_string=data.get("date_string", ""),
                )
            except Exception:
                pass

        return saves

    def has_quick_save(self) -> bool:
        """Check if a quick save exists."""
        return os.path.exists(self._get_slot_path(self.QUICK_SAVE_ID))

    def get_latest_save(self) -> Optional[SaveData]:
        """
        Get the most recent save (quick save takes priority, then regular saves).
        Used by "Continue" in the main menu.
        """
        # Quick save has priority
        if self.has_quick_save():
            return self.quick_load()

        saves = self.list_saves()
        if not saves:
            return None

        # Find most recent regular save
        latest_slot = max(saves.keys(), key=lambda k: saves[k].timestamp)
        return self.load(latest_slot)

    # ---- Delete ----

    def delete(self, slot_id: int) -> bool:
        """Delete a save slot."""
        filepath = self._get_slot_path(slot_id)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                return True
            except Exception as e:
                print(f"ERROR: Failed to delete save slot {slot_id}: {e}")
        return False

    # ---- Serialization ----

    def _serialize(self, data: SaveData) -> Dict[str, Any]:
        """Convert SaveData to a JSON-serializable dict."""
        result = {
            "slot_id": data.slot_id,
            "timestamp": data.timestamp,
            "date_string": data.date_string or time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(data.timestamp)),
            "scene_id": data.scene_id,
            "scene_name": data.scene_name,
            "command_index": data.command_index,
            "chapter": data.chapter,
            "route": data.route,
            "flags": data.flags,
            "call_stack": data.call_stack,
            "visited_scenes": data.visited_scenes,
            "bgm_file": data.bgm_file,
            "dialogue_history": data.dialogue_history,
            "meta": data.meta,
        }
        return result

    def _deserialize(self, data: Dict[str, Any]) -> SaveData:
        """Convert a dict back to SaveData."""
        return SaveData(
            slot_id=data.get("slot_id", 0),
            timestamp=data.get("timestamp", 0),
            date_string=data.get("date_string", ""),
            scene_id=data.get("scene_id", ""),
            scene_name=data.get("scene_name", ""),
            command_index=data.get("command_index", 0),
            chapter=data.get("chapter", ""),
            route=data.get("route"),
            flags=data.get("flags", {}),
            call_stack=data.get("call_stack", []),
            visited_scenes=data.get("visited_scenes", []),
            bgm_file=data.get("bgm_file"),
            dialogue_history=data.get("dialogue_history", []),
            meta=data.get("meta", {}),
        )

    # ---- Utility ----

    def _get_slot_path(self, slot_id: int) -> str:
        """Get the file path for a save slot."""
        if slot_id == self.QUICK_SAVE_ID:
            return os.path.join(self._save_dir, "quick_save.gsav")
        return os.path.join(self._save_dir, f"slot_{slot_id:03d}.gsav")

    def cleanup(self) -> None:
        """No cleanup needed for file-based saves."""
        pass
