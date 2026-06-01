"""
GalEngine Editor - Compile Manager (PyQt5)

Handles game compilation and .gpkg packaging.

Python: 3.8.20  |  PyQt5: 5.x
"""
import os
import json
from typing import List, Dict


class CompileManager:
    """
    Compile a GalEngine project into a distributable .gpkg file.

    Steps:
      1. Validate project (settings.json, assets)
      2. Collect all scene scripts (.json / .md)
      3. Package into .gpkg (plain .zip with custom extension)
      4. Generate standalone executable (via PyInstaller, optional)
    """

    def compile(self, project_path: str, parent_widget=None) -> bool:
        """
        Compile the project.  Shows a progress dialog.

        Returns True on success.
        """
        if not project_path or not os.path.isdir(project_path):
            self._show_error("No project loaded.", parent_widget)
            return False

        settings_path = os.path.join(project_path, "settings.json")
        if not os.path.isfile(settings_path):
            self._show_error("settings.json not found.", parent_widget)
            return False

        try:
            with open(settings_path, "r", encoding="utf-8") as f:
                settings = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            self._show_error(f"Invalid settings.json:\n{e}", parent_widget)
            return False

        # --- Validate ---
        scenes = settings.get("scenes", {})
        if not scenes:
            self._show_error("No scenes defined in settings.json.", parent_widget)
            return False

        missing = self._check_missing_assets(project_path, settings)
        if missing:
            msg = "Missing assets:\n" + "\n".join(f"  - {a}" for a in missing[:10])
            if len(missing) > 10:
                msg += f"\n  ...and {len(missing) - 10} more"
            self._show_warning(msg, parent_widget)

        # --- Package (.gpkg = .zip) ---
        gpkg_path = self._package(project_path, settings, parent_widget)
        if gpkg_path:
            self._show_info(f"Compiled successfully!\n\nOutput: {gpkg_path}", parent_widget)
            return True
        return False

    # ----------------------------------------------------------------- #
    #  Internal
    # ----------------------------------------------------------------- #

    def _check_missing_assets(self, project_path: str, settings: dict) -> List[str]:
        """Return a list of asset paths referenced but missing."""
        missing = []
        assets_cfg = settings.get("assets", {})

        for key, rel_dir in assets_cfg.items():
            abs_dir = os.path.join(project_path, rel_dir)
            if not os.path.isdir(abs_dir):
                missing.append(f"{key}/ (directory missing)")
                continue
            # Check scene-referenced assets
            for scene_id, scene_rel in settings.get("scenes", {}).items():
                scene_path = os.path.join(project_path, scene_rel)
                if not os.path.isfile(scene_path):
                    continue
                try:
                    with open(scene_path, "r", encoding="utf-8") as f:
                        if scene_rel.endswith(".json"):
                            scene_data = json.load(f)
                            # Check background / sprite / audio references
                            for cmd in scene_data.get("commands", []):
                                d = cmd.get("data", {})
                                if cmd.get("type") == "background":
                                    bg = d.get("image", "")
                                    if bg and not os.path.isfile(os.path.join(abs_dir, bg)):
                                        missing.append(f"bg: {bg}")
                                if cmd.get("type") == "show_sprite":
                                    sp = d.get("sprite", "")
                                    if sp and not os.path.isfile(os.path.join(abs_dir, sp)):
                                        missing.append(f"sprite: {sp}")
                                if cmd.get("type") == "bgm":
                                    af = d.get("file", "")
                                    if af and not os.path.isfile(os.path.join(abs_dir, af)):
                                        missing.append(f"audio: {af}")
                        elif scene_rel.endswith(".md"):
                            pass  # Markdown scenes: skip deep check
                except Exception:
                    pass
        return missing

    def _package(self, project_path: str, settings: dict, parent_widget) -> str:
        """
        Package the project into a .gpkg file (ZIP format).
        Returns the output path, or empty string on failure.
        """
        import tempfile, zipfile

        out_dir = os.path.join(project_path, "build")
        os.makedirs(out_dir, exist_ok=True)

        project_name = settings.get("project", {}).get("name", "galengine_game")
        safe_name = "".join(c for c in project_name if c.isalnum() or c in " _-").strip()
        gpkg_path = os.path.join(out_dir, f"{safe_name}.gpkg")

        try:
            with zipfile.ZipFile(gpkg_path, "w", zipfile.ZIP_DEFLATED) as zf:
                # Add settings.json
                zf.write(
                    os.path.join(project_path, "settings.json"),
                    arcname="settings.json",
                )
                # Add scripts/
                scripts_dir = os.path.join(project_path, "scripts")
                if os.path.isdir(scripts_dir):
                    for root, _, files in os.walk(scripts_dir):
                        for fname in files:
                            fpath = os.path.join(root, fname)
                            arc = os.path.relpath(fpath, project_path)
                            zf.write(fpath, arcname=arc)

                # Add assets/ (only referenced)
                for key in ["backgrounds", "sprites", "cgs", "audio", "ui", "fonts"]:
                    rel_dir = settings.get("assets", {}).get(key, "")
                    abs_dir = os.path.join(project_path, rel_dir)
                    if os.path.isdir(abs_dir):
                        for fname in os.listdir(abs_dir):
                            fpath = os.path.join(abs_dir, fname)
                            if os.path.isfile(fpath):
                                arc = os.path.relpath(fpath, project_path)
                                zf.write(fpath, arcname=arc)
            return gpkg_path
        except OSError as e:
            self._show_error(f"Packaging failed:\n{e}", parent_widget)
            return ""

    # ----------------------------------------------------------------- #
    #  UI Helpers (optional - use PyQt5 message boxes when available)
    # ----------------------------------------------------------------- #

    def _show_error(self, msg: str, parent):
        if parent is not None:
            from PyQt5.QtWidgets import QMessageBox
            QMessageBox.critical(parent, "Compile Error", msg)
        else:
            print(f"[Compile] ERROR: {msg}")

    def _show_warning(self, msg: str, parent):
        if parent is not None:
            from PyQt5.QtWidgets import QMessageBox
            QMessageBox.warning(parent, "Missing Assets", msg)
        else:
            print(f"[Compile] WARNING: {msg}")

    def _show_info(self, msg: str, parent):
        if parent is not None:
            from PyQt5.QtWidgets import QMessageBox
            QMessageBox.information(parent, "Compile Complete", msg)
        else:
            print(f"[Compile] INFO: {msg}")
