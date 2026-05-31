"""
Project Loader

Loads and validates a GalEngine game project from its directory.
Parses settings.json and provides asset path resolution.
"""

import json
import os
from typing import Dict, Any, Optional, List


class ProjectLoader:
    """
    Handles loading a game project's settings.json and resolving asset paths.

    A game project is any directory containing a settings.json file.
    The project does NOT need to be inside the engine directory —
    any location on disk is supported.
    """

    def __init__(self, project_root: str):
        self.project_root = os.path.abspath(project_root)
        self.project_data: Dict[str, Any] = {}
        self._scene_cache: Dict[str, Any] = {}
        self._asset_paths: Dict[str, str] = {}

    def load(self) -> bool:
        """
        Load and parse the settings.json file.

        Returns:
            True if settings.json was found and valid, False otherwise.
        """
        settings_path = os.path.join(self.project_root, "settings.json")
        if not os.path.isfile(settings_path):
            print(f"ERROR: settings.json not found at {settings_path}")
            return False

        try:
            with open(settings_path, "r", encoding="utf-8") as f:
                self.project_data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in settings.json: {e}")
            return False
        except Exception as e:
            print(f"ERROR: Failed to read settings.json: {e}")
            return False

        # Resolve asset directory paths
        assets = self.project_data.get("assets", {})
        self._asset_paths = {
            key: os.path.join(self.project_root, path)
            for key, path in assets.items()
        }

        return True

    def get_asset_path(self, relative_path: str, asset_type: str = "scripts") -> str:
        """
        Resolve a relative asset path to an absolute path.

        Args:
            relative_path: Path relative to the asset type's base directory
                           or the project root.
            asset_type: One of 'backgrounds', 'sprites', 'cgs',
                        'audio', 'fonts', 'ui', 'videos', 'scripts'.

        Returns:
            Absolute path to the asset.
        """
        # If path is already absolute, return as-is
        if os.path.isabs(relative_path):
            return relative_path

        # If it starts with the asset type directory name, resolve from project root
        # Otherwise, resolve relative to the specific asset type directory
        base_dir = self._asset_paths.get(asset_type, self.project_root)
        return os.path.join(base_dir, relative_path)

    def get_scene_path(self, scene_id: str) -> Optional[str]:
        """
        Get the file path for a scene script.

        Args:
            scene_id: Scene identifier from settings.json.

        Returns:
            Absolute path to the scene script file, or None if not found.
        """
        scenes = self.project_data.get("scenes", {})
        scene_rel_path = scenes.get(scene_id)
        if not scene_rel_path:
            return None
        return os.path.join(self.project_root, scene_rel_path)

    def get_scene_ids(self) -> List[str]:
        """Get all scene IDs defined in the project."""
        return list(self.project_data.get("scenes", {}).keys())

    def get_branch_info(self, branch_id: str) -> Optional[Dict]:
        """Get branch/route configuration."""
        return self.project_data.get("branches", {}).get(branch_id)

    def validate_assets(self) -> bool:
        """
        Check that all assets referenced in settings.json exist on disk.

        Returns:
            True if all assets exist, False if any are missing.
        """
        all_valid = True
        assets = self.project_data.get("assets", {})

        for asset_type, rel_dir in assets.items():
            full_dir = os.path.join(self.project_root, rel_dir)
            if not os.path.isdir(full_dir):
                print(f"WARNING: Asset directory not found: {full_dir} ({asset_type})")
                all_valid = False

        # Check startup splash images
        for splash in self.project_data.get("startup", {}).get("splash_screens", []):
            img_path = self.get_asset_path(splash.get("image", ""), "ui")
            if splash.get("image") and not os.path.isfile(img_path):
                print(f"WARNING: Splash image not found: {img_path}")
                all_valid = False

        return all_valid

    def get_window_config(self) -> Dict[str, Any]:
        """Get the window configuration from project settings."""
        return self.project_data.get("window", {})

    def get_name(self) -> str:
        """Get the project/game name."""
        return self.project_data.get("project", {}).get("name", "Untitled Game")

    def get_version(self) -> str:
        """Get the project version."""
        return self.project_data.get("project", {}).get("version", "0.0.0")
