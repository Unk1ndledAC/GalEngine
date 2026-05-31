"""
GalEngine Build System

Compiles a game project into a distributable game package.
Output: standalone executable + data pack files.
"""

import os
import json
import zlib
import struct
import shutil
from typing import Optional, List, Dict, Any
from pathlib import Path


# GPKG format constants
GPKG_MAGIC = 0x4750474B  # "GPKG"
GPKG_VERSION = 1
HEADER_SIZE = 64
FILE_ENTRY_SIZE = 128

# Flags
FLAG_ENCRYPTED = 0x01
FLAG_PATCH = 0x02
FLAG_COMPRESSED = 0x04


class GameCompiler:
    """
    Compiles a GalEngine game project into a distributable game package.

    Usage:
        compiler = GameCompiler("path/to/game/project")
        compiler.compile(output_dir="path/to/build")
    """

    def __init__(self, project_root: str):
        self.project_root = os.path.abspath(project_root)
        self.settings: Dict[str, Any] = {}
        self._file_list: List[Dict] = []

    def compile(self, output_dir: str) -> bool:
        """
        Compile the game project.

        Steps:
        1. Load and validate settings.json
        2. Collect all asset files
        3. Compile scene scripts
        4. Package into .gpk data packs
        5. Copy engine runtime
        6. Create executable entry point

        Args:
            output_dir: Directory to output the compiled game.

        Returns:
            True if compilation succeeded.
        """
        output_dir = os.path.abspath(output_dir)
        os.makedirs(output_dir, exist_ok=True)

        # 1. Load settings
        settings_path = os.path.join(self.project_root, "settings.json")
        if not os.path.isfile(settings_path):
            print("ERROR: settings.json not found.")
            return False

        with open(settings_path, "r", encoding="utf-8") as f:
            self.settings = json.load(f)

        compilation = self.settings.get("compilation", {})
        output_name = compilation.get("executable_name", "game")
        compression = compilation.get("compression", "zlib")

        # 2. Collect assets
        self._collect_assets()

        # 3. Build the main data pack
        data_pack_path = os.path.join(output_dir, "data.gpk")
        if not self._build_data_pack(data_pack_path, compression):
            return False

        # 4. Copy engine runtime (minimal wrapper)
        self._copy_runtime(output_dir, output_name)

        print(f"Build complete! Output: {output_dir}")
        print(f"  - {output_name}.exe (game launcher)")
        print(f"  - data.gpk (game data)")
        return True

    def compile_patch(self, output_dir: str, patch_name: str, scene_ids: List[str]) -> bool:
        """
        Compile a subset of scenes as a patch/DLC data pack.

        Args:
            output_dir: Output directory.
            patch_name: Name for the patch file (without extension).
            scene_ids: List of scene IDs to include in the patch.

        Returns:
            True if compilation succeeded.
        """
        output_dir = os.path.abspath(output_dir)
        os.makedirs(output_dir, exist_ok=True)

        # Load settings
        settings_path = os.path.join(self.project_root, "settings.json")
        with open(settings_path, "r", encoding="utf-8") as f:
            self.settings = json.load(f)

        # Collect only specified scenes
        self._file_list = []
        assets = self.settings.get("assets", {})
        scripts_dir = assets.get("scripts", "scripts")

        for sid in scene_ids:
            script_path = os.path.join(self.project_root, scripts_dir, f"{sid}.json")
            md_path = os.path.join(self.project_root, scripts_dir, f"{sid}.md")
            if os.path.isfile(script_path):
                self._add_file(script_path, f"scripts/{sid}.json")
            elif os.path.isfile(md_path):
                self._add_file(md_path, f"scripts/{sid}.md")

        # Build patch
        patch_path = os.path.join(output_dir, f"{patch_name}.gpk")
        if not self._build_data_pack(patch_path, "zlib", is_patch=True):
            return False

        print(f"Patch built: {patch_path}")
        return True

    def _collect_assets(self) -> None:
        """Recursively collect all asset and script files."""
        assets = self.settings.get("assets", {})
        exclude = set(self.settings.get("compilation", {}).get("exclude_patterns", []))

        for asset_type, rel_dir in assets.items():
            full_dir = os.path.join(self.project_root, rel_dir)
            if not os.path.isdir(full_dir):
                continue
            for root, dirs, files in os.walk(full_dir):
                for filename in files:
                    filepath = os.path.join(root, filename)
                    rel_path = os.path.relpath(filepath, self.project_root)

                    # Check exclude patterns
                    skip = False
                    for pattern in exclude:
                        if Path(rel_path).match(pattern):
                            skip = True
                            break
                    if skip:
                        continue

                    self._add_file(filepath, rel_path)

        # Always include settings.json
        if os.path.isfile(os.path.join(self.project_root, "settings.json")):
            self._add_file(
                os.path.join(self.project_root, "settings.json"),
                "settings.json",
            )

    def _add_file(self, filepath: str, archive_path: str) -> None:
        """Add a file to the collection list."""
        self._file_list.append({
            "filepath": filepath,
            "archive_path": archive_path.replace("\\", "/"),
        })

    def _build_data_pack(self, output_path: str, compression: str, is_patch: bool = False) -> bool:
        """
        Build a .gpk data pack file.

        See schemas/gpk-format-spec.md for the format specification.
        """
        try:
            # Prepare metadata
            metadata = {
                "pack_id": f"{self.settings.get('project', {}).get('name', 'unknown')}.data",
                "version": self.settings.get("project", {}).get("version", "0.1.0"),
                "type": "patch" if is_patch else "game",
                "engine_version": "0.1.0",
                "title": self.settings.get("project", {}).get("name", "Untitled"),
                "author": self.settings.get("project", {}).get("author", "Unknown"),
                "scenes": list(self.settings.get("scenes", {}).keys()),
                "languages": self.settings.get("project", {}).get("supported_languages", ["zh-CN"]),
            }
            meta_json = json.dumps(metadata, ensure_ascii=False)
            meta_compressed = zlib.compress(meta_json.encode("utf-8"))

            # Build file index and asset data
            index_entries = []
            asset_data = bytearray()
            current_offset = 0

            for entry in self._file_list:
                with open(entry["filepath"], "rb") as f:
                    raw_data = f.read()

                raw_size = len(raw_data)
                compressed_data = zlib.compress(raw_data) if compression != "none" else raw_data
                compressed_size = len(compressed_data)

                # Write to asset block
                asset_data.extend(compressed_data)

                # Build index entry
                filename_bytes = entry["archive_path"].encode("utf-8")[:63].ljust(64, b"\x00")
                entry_data = bytearray(FILE_ENTRY_SIZE)
                struct.pack_into("<64s Q Q Q I I 32s", entry_data, 0,
                    filename_bytes,
                    current_offset,
                    raw_size,
                    compressed_size if compression != "none" else 0,
                    zlib.crc32(raw_data),
                    1 if compression != "none" else 0,  # 0=raw, 1=zlib
                    b"\x00" * 32,
                )
                index_entries.append(bytes(entry_data))
                current_offset += compressed_size

            # Calculate offsets
            index_offset = HEADER_SIZE
            index_size = len(index_entries) * FILE_ENTRY_SIZE
            meta_offset = index_offset + index_size
            meta_size = len(meta_compressed)
            assets_offset = meta_offset + meta_size

            # Build header
            flags = 0
            if is_patch:
                flags |= FLAG_PATCH
            header = bytearray(HEADER_SIZE)
            struct.pack_into("<I H H Q Q Q Q Q Q 8s", header, 0,
                GPKG_MAGIC,
                GPKG_VERSION,
                flags,
                index_offset,
                index_size,
                meta_offset,
                meta_size,
                assets_offset,
                len(asset_data),
                b"\x00" * 8,
            )

            # Write file
            with open(output_path, "wb") as f:
                f.write(header)
                for entry in index_entries:
                    f.write(entry)
                f.write(meta_compressed)
                f.write(asset_data)

            return True

        except Exception as e:
            print(f"ERROR: Failed to build data pack: {e}")
            return False

    def _copy_runtime(self, output_dir: str, exe_name: str) -> None:
        """
        Copy/reference the engine runtime to the output directory.
        In a full implementation, this would bundle the actual engine executable.
        For now, creates a placeholder launcher script.
        """
        # Create a launcher batch file (for Windows)
        launcher_content = f"""@echo off
echo GalEngine Game Launcher
echo ======================
echo Game: {self.settings.get("project", {}).get("name", "Untitled")}
echo Version: {self.settings.get("project", {}).get("version", "0.0.0")}
echo.
echo Starting game...
echo.
echo [In production, this would launch the compiled game through the GalEngine runtime]
echo [Place the GalEngine runtime (galengine_runtime.exe) in this directory]
echo [and the game data (data.gpk) will be loaded automatically.]
echo.
pause
"""
        with open(os.path.join(output_dir, f"{exe_name}.bat"), "w", encoding="utf-8") as f:
            f.write(launcher_content)

        # Also write a JSON manifest
        manifest = {
            "format": "galengine-game",
            "version": "1.0",
            "data_pack": "data.gpk",
            "engine_required": ">=0.1.0",
            "entry_scene": self.settings.get("startup", {}).get("first_scene", ""),
        }
        with open(os.path.join(output_dir, "game.manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
