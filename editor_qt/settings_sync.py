"""
GalEngine Editor - Settings Sync (PyQt5)

Auto-sync property panel changes with settings.json.
Auto-generate settings.json from project directory structure.

Python: 3.8.20  |  PyQt5: 5.x
"""
import json
import os
from typing import Dict, Any, Optional


# Standard asset subdirectories in a GalEngine project.
ASSET_CATEGORIES = ["backgrounds", "sprites", "cgs", "audio", "ui", "fonts"]

# File extensions recognised per asset category.
ASSET_EXTENSIONS = {
    "backgrounds": (".png", ".jpg", ".jpeg", ".webp", ".bmp"),
    "sprites":     (".png", ".jpg", ".jpeg", ".webp", ".bmp"),
    "cgs":         (".png", ".jpg", ".jpeg", ".webp", ".bmp"),
    "audio":       (".ogg", ".mp3", ".wav", ".flac"),
    "ui":          (".png", ".jpg", ".jpeg", ".webp", ".bmp"),
    "fonts":       (".ttf", ".otf"),
}


class SettingsSync:
    """
    Handles syncing editor state with the project's settings.json.

    On load:  reads settings.json into memory.
    On save:  auto-generates settings.json from the project directory
              structure + any pending editor changes.
    """

    def __init__(self):
        self.project_path: Optional[str] = None
        self._pending_changes: Dict[str, Any] = {}

    # ----------------------------------------------------------------- #
    #  Public
    # ----------------------------------------------------------------- #

    def load(self, project_path: str) -> dict:
        """
        Load settings.json from a project.
        Returns parsed JSON dict (empty dict if missing/invalid).
        """
        self.project_path = project_path
        settings_path = os.path.join(project_path, "settings.json")
        if not os.path.isfile(settings_path):
            return {}

        try:
            with open(settings_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}

    def save(self, project_path: str) -> bool:
        """
        Auto-generate settings.json from the current project directory
        structure, merge any pending editor changes, then write.
        """
        if not project_path or not os.path.isdir(project_path):
            return False

        settings_path = os.path.join(project_path, "settings.json")

        # 1. Build base settings from directory scan
        data = self.auto_generate(project_path)

        # 2. Merge pending editor changes (they take priority)
        self._deep_update(data, self._pending_changes)
        self._pending_changes.clear()

        try:
            with open(settings_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except OSError:
            return False

    def queue_change(self, key: str, value: Any):
        """
        Queue a change to the settings.  Applied on next save().

        Supports dot-notation keys: "project.name", "window.width"
        """
        keys = key.split(".")
        target = self._pending_changes
        for k in keys[:-1]:
            target = target.setdefault(k, {})
        target[keys[-1]] = value

    def get_queued_changes(self) -> Dict[str, Any]:
        """Return a copy of pending changes."""
        return dict(self._pending_changes)

    # ----------------------------------------------------------------- #
    #  Auto-generation
    # ----------------------------------------------------------------- #

    @staticmethod
    def auto_generate(project_path: str) -> dict:
        """
        Scan the project directory and build a complete settings.json dict.

        The generated dict contains:
          - project   : metadata (name, version, resolution)
          - assets    : mapping of asset category → relative directory
          - scenes    : mapping of scene_id → relative script path
          - mappings  : per-category mapping of short-name → actual filename
                        (so developer filenames do not need to follow
                         strict naming conventions)

        Existing settings.json values are preserved where possible.
        """
        settings_path = os.path.join(project_path, "settings.json")
        existing = {}
        if os.path.isfile(settings_path):
            try:
                with open(settings_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except (json.JSONDecodeError, OSError):
                pass

        # --- project metadata ---
        project_name = os.path.basename(os.path.abspath(project_path))
        existing_project = existing.get("project", {})
        project = {
            "name": existing_project.get("name", project_name),
            "version": existing_project.get("version", "0.1.0"),
            "resolution": existing_project.get("resolution", [1280, 720]),
            "author": existing_project.get("author", ""),
        }

        # --- assets ---
        assets_dir = os.path.join(project_path, "assets")
        existing_assets = existing.get("assets", {})
        assets = {}
        for cat in ASSET_CATEGORIES:
            cat_path = os.path.join(assets_dir, cat)
            if os.path.isdir(cat_path):
                assets[cat] = existing_assets.get(cat, f"assets/{cat}")
        # Preserve any custom asset dirs from existing settings
        for k, v in existing_assets.items():
            if k not in assets:
                abs_v = os.path.join(project_path, v)
                if os.path.isdir(abs_v):
                    assets[k] = v

        # --- scenes ---
        scripts_dir = os.path.join(project_path, "scripts")
        existing_scenes = existing.get("scenes", {})
        scenes = {}
        if os.path.isdir(scripts_dir):
            for fname in sorted(os.listdir(scripts_dir)):
                if fname.endswith((".json", ".md")):
                    scene_id = os.path.splitext(fname)[0]
                    scenes[scene_id] = existing_scenes.get(scene_id, f"scripts/{fname}")
        # Preserve scenes from existing settings that still exist on disk
        for sid, rel in existing_scenes.items():
            if sid not in scenes:
                abs_path = os.path.join(project_path, rel)
                if os.path.isfile(abs_path):
                    scenes[sid] = rel

        # --- mappings (short-name → actual filename) ---
        existing_mappings = existing.get("mappings", {})
        mappings = {}
        for cat in ASSET_CATEGORIES:
            cat_path = os.path.join(assets_dir, cat)
            if not os.path.isdir(cat_path):
                continue
            cat_mappings = {}
            ext_list = ASSET_EXTENSIONS.get(cat, ())
            for fname in sorted(os.listdir(cat_path)):
                if fname.lower().endswith(ext_list) and not fname.startswith("."):
                    short_name = os.path.splitext(fname)[0]
                    cat_mappings[short_name] = fname
            # Merge existing mappings (preserve manual overrides)
            existing_cat = existing_mappings.get(cat, {})
            for sn, fn in existing_cat.items():
                if os.path.isfile(os.path.join(cat_path, fn)):
                    cat_mappings[sn] = fn
                elif sn not in cat_mappings:
                    # Keep stale mappings but mark as missing
                    cat_mappings[sn] = fn
            if cat_mappings:
                mappings[cat] = cat_mappings

        return {
            "project": project,
            "assets": assets,
            "scenes": scenes,
            "mappings": mappings,
        }

    # ----------------------------------------------------------------- #
    #  Internal
    # ----------------------------------------------------------------- #

    def _deep_update(self, target: dict, updates: dict):
        """Recursively merge updates into target."""
        for key, value in updates.items():
            if isinstance(value, dict) and key in target and isinstance(target[key], dict):
                self._deep_update(target[key], value)
            else:
                target[key] = value
