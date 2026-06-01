"""
GalEngine Editor - Asset Manager (PyQt5)

Handles loading, caching, and providing asset paths.
Supports: backgrounds, sprites, CGs, audio, UI, fonts.

Python: 3.8.20  |  PyQt5: 5.x
"""
import os
import json
from typing import Dict, List, Optional


class AssetManager:
    """
    Loads and resolves assets for the editor.

    A "project" is any directory with settings.json.
    Assets are resolved relative to asset base dirs defined in settings.json.
    """

    def __init__(self, project_root: str = ""):
        self.project_root = project_root
        self.asset_paths: Dict[str, str] = {}   # e.g. "backgrounds": "C:/.../assets/backgrounds"
        self._cache: Dict[str, object] = {}

    # ----------------------------------------------------------------- #
    #  Public
    # ----------------------------------------------------------------- #

    def load_project(self, project_root: str) -> bool:
        """
        Load project and resolve asset directories.
        Returns True on success.
        """
        self.project_root = os.path.abspath(project_root)
        settings_path = os.path.join(self.project_root, "settings.json")
        if not os.path.isfile(settings_path):
            return False

        try:
            with open(settings_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            return False

        assets_cfg = data.get("assets", {})
        self.asset_paths.clear()
        for key, rel_path in assets_cfg.items():
            abs_path = os.path.join(self.project_root, rel_path)
            if os.path.isdir(abs_path):
                self.asset_paths[key] = abs_path

        return True

    def get_asset_path(self, file_name: str, asset_type: str) -> str:
        """
        Resolve an asset file to its absolute path.
        Returns empty string if not found.
        """
        base = self.asset_paths.get(asset_type, "")
        if not base:
            return ""
        path = os.path.join(base, file_name)
        return path if os.path.isfile(path) else ""

    def list_assets(self, asset_type: str) -> List[str]:
        """
        List all asset files of a given type.
        Supported types: backgrounds, sprites, cgs, audio, ui, fonts.
        """
        base = self.asset_paths.get(asset_type, "")
        if not base or not os.path.isdir(base):
            return []

        ext_map = {
            "backgrounds": (".png", ".jpg", ".jpeg", ".webp"),
            "sprites":     (".png", ".jpg", ".jpeg", ".webp"),
            "cgs":         (".png", ".jpg", ".jpeg", ".webp"),
            "audio":       (".ogg", ".mp3", ".wav"),
            "ui":          (".png", ".jpg", ".jpeg", ".webp"),
            "fonts":        (".ttf", ".otf"),
        }
        allowed = ext_map.get(asset_type, ())
        result = []
        for f in sorted(os.listdir(base)):
            if f.lower().endswith(allowed):
                result.append(f)
        return result

    def get_scene_ids(self) -> List[str]:
        """Return all scene IDs declared in settings.json."""
        settings_path = os.path.join(self.project_root, "settings.json")
        if not os.path.isfile(settings_path):
            return []
        with open(settings_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return list(data.get("scenes", {}).keys())

    # ----------------------------------------------------------------- #
    #  Pixmap Helpers (for QGraphicsPixmapItem etc.)
    # ----------------------------------------------------------------- #

    def load_pixmap(self, file_name: str, asset_type: str):
        """Load a QPixmap, with simple file-path caching."""
        from PyQt5.QtGui import QPixmap
        cache_key = f"{asset_type}/{file_name}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        path = self.get_asset_path(file_name, asset_type)
        if not path:
            return QPixmap()
        pm = QPixmap(path)
        self._cache[cache_key] = pm
        return pm
