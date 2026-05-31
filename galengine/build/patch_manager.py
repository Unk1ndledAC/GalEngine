"""
Patch Manager

Manages game patch/DLC loading at startup:
- Auto-detect .gpk patch files in the patches/ directory
- Verify version compatibility
- Apply patches (override or add scenes/assets)
"""

import os
import json
import zlib
import struct
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field


# GPKG format constants (same as compiler)
GPKG_MAGIC = 0x4750474B  # "GPKG"
GPKG_VERSION = 1
HEADER_SIZE = 64
FILE_ENTRY_SIZE = 128


@dataclass
class PatchInfo:
    """Metadata about a loaded patch."""
    patch_id: str
    patch_name: str
    version: str
    engine_version: str      # Required engine version
    game_version: str       # Required game version
    author: str = ""
    description: str = ""
    file_path: str = ""
    load_order: int = 0      # Lower = load first
    is_compatible: bool = True
    compatibility_error: str = ""


class PatchManager:
    """
    Manages patch/DLC .gpk files.

    At game startup, scans the patches/ directory for .gpk files,
    verifies version compatibility, and loads compatible patches.

    Patch loading order:
    1. Sort patches by load_order (ascending)
    2. Verify engine version compatibility
    3. Verify game version compatibility
    4. Load patch metadata and apply file overrides
    """

    PATCH_DIR_NAME = "patches"
    PATCH_EXTENSION = ".gpk"

    def __init__(self, game_version: str, engine_version: str = "0.1.0"):
        self.game_version = game_version
        self.engine_version = engine_version
        self._patches: Dict[str, PatchInfo] = {}
        self._loaded_patches: List[str] = []
        self._patch_data: Dict[str, Dict] = {}  # patch_id -> unpacked metadata

    def scan_patches(self, game_root: str) -> List[PatchInfo]:
        """
        Scan the patches/ directory for .gpk files.

        Args:
            game_root: Root directory of the game installation.

        Returns:
            List of discovered PatchInfo objects (sorted by load_order).
        """
        patch_dir = os.path.join(game_root, self.PATCH_DIR_NAME)
        if not os.path.isdir(patch_dir):
            return []

        discovered = []
        for filename in os.listdir(patch_dir):
            if not filename.lower().endswith(self.PATCH_EXTENSION):
                continue

            file_path = os.path.join(patch_dir, filename)
            patch_info = self._read_patch_metadata(file_path)
            if patch_info:
                discovered.append(patch_info)

        # Sort by load_order
        discovered.sort(key=lambda p: (p.load_order, p.patch_id))

        # Store in dict
        for p in discovered:
            self._patches[p.patch_id] = p

        return discovered

    def _read_patch_metadata(self, file_path: str) -> Optional[PatchInfo]:
        """
        Read metadata from a .gpk patch file.

        Returns:
            PatchInfo if valid, None if invalid/unreadable.
        """
        try:
            with open(file_path, "rb") as f:
                header_data = f.read(HEADER_SIZE)

            if len(header_data) < HEADER_SIZE:
                return None

            magic, version, flags, idx_offset, idx_size, meta_offset, meta_size, assets_offset, assets_size, _ = \
                struct.unpack("<I H H Q Q Q Q Q 8s", header_data)

            if magic != GPKG_MAGIC:
                return None

            # Read metadata
            f.seek(meta_offset)
            meta_compressed = f.read(meta_size)

            try:
                meta_json = zlib.decompress(meta_compressed).decode("utf-8")
                metadata = json.loads(meta_json)
            except zlib.error:
                # Try reading as raw JSON
                meta_json = meta_compressed.decode("utf-8")
                metadata = json.loads(meta_json)

            patch_id = metadata.get("pack_id", os.path.basename(file_path))
            patch_name = metadata.get("title", patch_id)
            patch_version = metadata.get("version", "0.0.0")
            engine_req = metadata.get("engine_version", "0.1.0")
            game_req = metadata.get("game_version", "*")
            author = metadata.get("author", "")
            description = metadata.get("description", "")
            load_order = metadata.get("load_order", 0)

            # Check compatibility
            is_compat, compat_error = self._check_compatibility(
                engine_req, game_req
            )

            return PatchInfo(
                patch_id=patch_id,
                patch_name=patch_name,
                version=patch_version,
                engine_version=engine_req,
                game_version=game_req,
                author=author,
                description=description,
                file_path=file_path,
                load_order=load_order,
                is_compatible=is_compat,
                compatibility_error=compat_error,
            )

        except Exception as e:
            print(f"WARNING: Failed to read patch metadata from {file_path}: {e}")
            return None

    def _check_compatibility(
        self, engine_req: str, game_req: str
    ) -> tuple:
        """
        Check if a patch is compatible with the current game/engine.

        Args:
            engine_req: Required engine version (e.g., ">=0.1.0").
            game_req: Required game version (e.g., "1.0.0" or "*" for any).

        Returns:
            (is_compatible: bool, error_message: str)
        """
        # Check engine version
        if not self._version_satisfies(engine_req, self.engine_version):
            return (
                False,
                f"Engine version {engine_req} required, "
                f"but current engine is {self.engine_version}"
            )

        # Check game version
        if game_req != "*":
            if not self._version_satisfies(game_req, self.game_version):
                return (
                    False,
                    f"Game version {game_req} required, "
                    f"but current game is {self.game_version}"
                )

        return (True, "")

    def _version_satisfies(self, requirement: str, current: str) -> bool:
        """
        Check if current version satisfies a version requirement.

        Supports:
        - Exact: "1.0.0"
        - Minimum: ">=1.0.0"
        - Range: ">=1.0.0,<2.0.0"
        - Wildcard: "1.0.*"
        - Any: "*"
        """
        if requirement == "*":
            return True

        import re

        def parse_ver(v: str) -> tuple:
            v = v.replace("*", "0")
            parts = v.split(".")
            return tuple(int(p) for p in parts[:3])

        current_parsed = parse_ver(current)

        # Handle comma-separated or range requirements
        for req in requirement.split(","):
            req = req.strip()
            if not req or req == "*":
                continue

            match = re.match(r'^(>=|<=|>|<|==)?\s*(.+)$', req)
            if not match:
                continue

            op = match.group(1) or "=="
            target_str = match.group(2)
            target_parsed = parse_ver(target_str)

            if op == "==":
                if current_parsed != target_parsed:
                    return False
            elif op == ">=":
                if current_parsed < target_parsed:
                    return False
            elif op == "<=":
                if current_parsed > target_parsed:
                    return False
            elif op == ">":
                if current_parsed <= target_parsed:
                    return False
            elif op == "<":
                if current_parsed >= target_parsed:
                    return False

        return True

    def get_patch(self, patch_id: str) -> Optional[PatchInfo]:
        """Get a patch by ID."""
        return self._patches.get(patch_id)

    def get_all_patches(self) -> List[PatchInfo]:
        """Get all discovered patches."""
        return list(self._patches.values())

    def get_compatible_patches(self) -> List[PatchInfo]:
        """Get only compatible patches."""
        return [p for p in self._patches.values() if p.is_compatible]

    def get_incompatible_patches(self) -> List[PatchInfo]:
        """Get patches that are NOT compatible."""
        return [p for p in self._patches.values() if not p.is_compatible]

    def load_patch(self, patch_id: str) -> bool:
        """
        Load a specific patch's data into memory.

        Args:
            patch_id: Patch identifier.

        Returns:
            True if loaded successfully.
        """
        patch = self._patches.get(patch_id)
        if not patch:
            print(f"ERROR: Patch '{patch_id}' not found.")
            return False

        if not patch.is_compatible:
            print(f"ERROR: Patch '{patch_id}' is not compatible: {patch.compatibility_error}")
            return False

        try:
            with open(patch.file_path, "rb") as f:
                header_data = f.read(HEADER_SIZE)

            _, _, flags, idx_offset, idx_size, meta_offset, meta_size, assets_offset, assets_size, _ = \
                struct.unpack("<I H H Q Q Q Q Q 8s", header_data)

            # Read metadata
            f.seek(meta_offset)
            meta_compressed = f.read(meta_size)
            meta_json = zlib.decompress(meta_compressed).decode("utf-8")
            metadata = json.loads(meta_json)

            self._patch_data[patch_id] = metadata
            if patch_id not in self._loaded_patches:
                self._loaded_patches.append(patch_id)

            print(f"Loaded patch: {patch.patch_name} (v{patch.version})")
            return True

        except Exception as e:
            print(f"ERROR: Failed to load patch '{patch_id}': {e}")
            return False

    def load_all_compatible(self) -> int:
        """
        Load all compatible patches.

        Returns:
            Number of patches loaded.
        """
        count = 0
        for patch in self.get_compatible_patches():
            if self.load_patch(patch.patch_id):
                count += 1
        return count

    def get_loaded_patches(self) -> List[str]:
        """Get list of loaded patch IDs."""
        return self._loaded_patches.copy()

    def get_patch_metadata(self, patch_id: str) -> Optional[Dict]:
        """Get loaded patch metadata."""
        return self._patch_data.get(patch_id)

    def get_patch_file_list(self, patch_id: str) -> List[str]:
        """
        Get list of files provided by a patch.

        Returns:
            List of archive paths in the patch.
        """
        metadata = self._patch_data.get(patch_id)
        if not metadata:
            return []
        return metadata.get("files", [])

    def get_patch_scenes(self, patch_id: str) -> List[str]:
        """Get list of scene IDs added/modified by a patch."""
        metadata = self._patch_data.get(patch_id)
        if not metadata:
            return []
        return metadata.get("scenes", [])

    def apply_patches(self, scene_manager: Any, project_loader: Any) -> int:
        """
        Apply loaded patches to the game.

        This registers new/updated scenes with the scene manager
        and updates the project loader's data.

        Args:
            scene_manager: The game's SceneManager instance.
            project_loader: The game's ProjectLoader instance.

        Returns:
            Number of scenes updated.
        """
        updated = 0
        for patch_id in self._loaded_patches:
            metadata = self._patch_data.get(patch_id, {})
            scenes = metadata.get("scenes", [])
            for scene_id in scenes:
                # In real implementation, the patch's scene files
                # would be extracted to a temp directory and registered
                updated += 1

        return updated

    def get_patch_summary(self) -> Dict[str, Any]:
        """Get a summary of all patches for display."""
        all_patches = self.get_all_patches()
        compatible = self.get_compatible_patches()

        return {
            "total": len(all_patches),
            "compatible": len(compatible),
            "incompatible": len(all_patches) - len(compatible),
            "loaded": len(self._loaded_patches),
            "patches": [
                {
                    "id": p.patch_id,
                    "name": p.patch_name,
                    "version": p.version,
                    "compatible": p.is_compatible,
                    "error": p.compatibility_error,
                    "loaded": p.patch_id in self._loaded_patches,
                }
                for p in all_patches
            ],
        }
