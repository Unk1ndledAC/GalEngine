"""
Sprite Manager

Manages character sprites on screen:
- Multi-character sprite loading with differential switching (expression/outfit)
- Position, scale, transparency control
- Z-ordering and layering
- Entrance/exit animations
"""

import os
from typing import Optional, Dict, Tuple, List
from dataclasses import dataclass, field
from enum import Enum


class SpritePosition(Enum):
    """Predefined sprite positions on screen."""
    LEFT = "left"
    LEFT_CENTER = "left_center"
    CENTER = "center"
    RIGHT_CENTER = "right_center"
    RIGHT = "right"
    CUSTOM = "custom"


@dataclass
class SpriteVariant:
    """A single sprite variant (e.g., a specific expression/outfit combo)."""
    variant_id: str
    filepath: str
    width: int = 0
    height: int = 0


@dataclass
class SpriteState:
    """Runtime state of a character's sprite on screen."""
    character_id: str
    current_variant: str = "default"
    position: SpritePosition = SpritePosition.CENTER
    x: float = 0.0
    y: float = 0.0
    scale_x: float = 1.0
    scale_y: float = 1.0
    opacity: float = 1.0
    z_order: int = 0
    visible: bool = False
    flipped: bool = False
    entrance_effect: str = "fade"
    entrance_duration: float = 0.5


class SpriteManager:
    """
    Manages all on-screen character sprites.

    Features:
    - Load sprite variants (expressions, outfits)
    - Switch between variants with transitions
    - Position, scale, and opacity control
    - Z-ordering for overlapping sprites
    - Multi-character simultaneous display
    """

    # Predefined positions as screen-relative coordinates (based on 1280x720)
    POSITION_PRESETS: Dict[SpritePosition, Tuple[float, float]] = {
        SpritePosition.LEFT: (200.0, 360.0),
        SpritePosition.LEFT_CENTER: (380.0, 360.0),
        SpritePosition.CENTER: (640.0, 360.0),
        SpritePosition.RIGHT_CENTER: (900.0, 360.0),
        SpritePosition.RIGHT: (1080.0, 360.0),
    }

    def __init__(self):
        self._sprites: Dict[str, SpriteState] = {}  # character_id -> state
        self._variants: Dict[str, Dict[str, SpriteVariant]] = {}  # char_id -> variant_id -> variant
        self._sprite_base_dir: str = ""

    def set_asset_directory(self, base_dir: str) -> None:
        """Set the base directory for sprite assets."""
        self._sprite_base_dir = base_dir

    # ---- Variant Loading ----

    def register_variant(
        self,
        character_id: str,
        variant_id: str,
        filepath: str,
        width: int = 0,
        height: int = 0,
    ) -> None:
        """
        Register a sprite variant for a character.

        Example: register_variant("sakura", "happy", "sprites/sakura/happy.png")
        """
        if character_id not in self._variants:
            self._variants[character_id] = {}

        full_path = filepath
        if not os.path.isabs(filepath) and self._sprite_base_dir:
            full_path = os.path.join(self._sprite_base_dir, filepath)

        self._variants[character_id][variant_id] = SpriteVariant(
            variant_id=variant_id,
            filepath=full_path,
            width=width,
            height=height,
        )

    def register_variants_from_directory(
        self,
        character_id: str,
        directory: str,
    ) -> List[str]:
        """
        Auto-register sprite variants from a character's directory.
        Each .png file becomes a variant (filename without extension = variant_id).

        Returns list of registered variant IDs.
        """
        if not os.path.isabs(directory):
            directory = os.path.join(self._sprite_base_dir, directory)

        if not os.path.isdir(directory):
            return []

        registered = []
        for filename in os.listdir(directory):
            if filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                variant_id = os.path.splitext(filename)[0]
                filepath = os.path.join(directory, filename)
                self.register_variant(character_id, variant_id, filepath)
                registered.append(variant_id)

        return registered

    def get_variant(self, character_id: str, variant_id: str) -> Optional[SpriteVariant]:
        """Get a registered sprite variant."""
        return self._variants.get(character_id, {}).get(variant_id)

    def get_available_variants(self, character_id: str) -> List[str]:
        """Get all registered variant IDs for a character."""
        return list(self._variants.get(character_id, {}).keys())

    # ---- Sprite Display ----

    def show_sprite(
        self,
        character_id: str,
        variant_id: str = "default",
        position: str = "center",
        x: Optional[float] = None,
        y: Optional[float] = None,
        scale: float = 1.0,
        opacity: float = 1.0,
        entrance_effect: str = "fade",
        entrance_duration: float = 0.5,
        z_order: int = 0,
        flipped: bool = False,
    ) -> bool:
        """
        Show or update a character sprite on screen.

        Args:
            character_id: Character identifier.
            variant_id: Sprite variant (expression/outfit).
            position: Predefined position name ("left", "center", "right", etc.).
            x, y: Custom position override (absolute coordinates).
            scale: Uniform scale factor.
            opacity: Opacity (0.0-1.0).
            entrance_effect: Entrance animation ("fade", "slide_left", "slide_right", "none").
            entrance_duration: Duration of entrance animation in seconds.
            z_order: Drawing order (higher = in front).
            flipped: Whether to flip the sprite horizontally.

        Returns:
            True if the sprite was successfully shown/updated.
        """
        # Validate variant exists
        variant = self._variants.get(character_id, {}).get(variant_id)
        if not variant:
            # Try fallback to "default" variant
            variant = self._variants.get(character_id, {}).get("default")
            if not variant:
                print(f"WARNING: No sprite variant '{variant_id}' for character '{character_id}'")
                return False

        # Get or create sprite state
        if character_id not in self._sprites:
            self._sprites[character_id] = SpriteState(character_id=character_id)

        state = self._sprites[character_id]

        # Resolve position
        try:
            pos_enum = SpritePosition(position)
            if pos_enum != SpritePosition.CUSTOM and x is None and y is None:
                resolved_x, resolved_y = self.POSITION_PRESETS.get(
                    pos_enum, self.POSITION_PRESETS[SpritePosition.CENTER]
                )
            else:
                resolved_x = x if x is not None else state.x
                resolved_y = y if y is not None else state.y
        except ValueError:
            resolved_x = x if x is not None else state.x
            resolved_y = y if y is not None else state.y

        # Update state
        state.current_variant = variant_id
        state.position = SpritePosition(position) if position in [p.value for p in SpritePosition] else SpritePosition.CUSTOM
        state.x = resolved_x
        state.y = resolved_y
        state.scale_x = scale
        state.scale_y = scale
        state.opacity = max(0.0, min(1.0, opacity))
        state.z_order = z_order
        state.visible = True
        state.flipped = flipped
        state.entrance_effect = entrance_effect
        state.entrance_duration = entrance_duration

        return True

    def switch_variant(
        self,
        character_id: str,
        variant_id: str,
        transition: str = "crossfade",
        duration: float = 0.3,
    ) -> bool:
        """
        Switch a sprite to a different variant with a transition effect.

        Args:
            character_id: Character identifier.
            variant_id: Target variant ID.
            transition: Transition type ("crossfade", "instant", "slide").
            duration: Transition duration in seconds.

        Returns:
            True if the switch was successful.
        """
        if character_id not in self._sprites:
            # Auto-show if not already on screen
            return self.show_sprite(character_id, variant_id)

        variant = self._variants.get(character_id, {}).get(variant_id)
        if not variant:
            print(f"WARNING: Variant '{variant_id}' not found for '{character_id}'")
            return False

        self._sprites[character_id].current_variant = variant_id
        # In real implementation, trigger transition animation
        return True

    def hide_sprite(
        self,
        character_id: str,
        exit_effect: str = "fade",
        exit_duration: float = 0.5,
    ) -> None:
        """
        Hide a character's sprite from screen.

        Args:
            character_id: Character identifier.
            exit_effect: Exit animation ("fade", "slide_left", "slide_right", "none").
            exit_duration: Duration of exit animation in seconds.
        """
        if character_id in self._sprites:
            self._sprites[character_id].visible = False
            self._sprites[character_id].entrance_effect = exit_effect
            self._sprites[character_id].entrance_duration = exit_duration

    def hide_all(self) -> None:
        """Hide all sprites."""
        for state in self._sprites.values():
            state.visible = False

    # ---- Query ----

    def get_sprite_state(self, character_id: str) -> Optional[SpriteState]:
        """Get the current state of a character's sprite."""
        return self._sprites.get(character_id)

    def get_visible_sprites(self) -> List[SpriteState]:
        """Get all currently visible sprites, sorted by z_order."""
        visible = [s for s in self._sprites.values() if s.visible]
        return sorted(visible, key=lambda s: s.z_order)

    def is_sprite_visible(self, character_id: str) -> bool:
        """Check if a character's sprite is currently visible."""
        return character_id in self._sprites and self._sprites[character_id].visible

    def get_active_characters(self) -> List[str]:
        """Get list of character IDs currently on screen."""
        return [cid for cid, state in self._sprites.items() if state.visible]

    # ---- Transform ----

    def set_position(
        self,
        character_id: str,
        x: Optional[float] = None,
        y: Optional[float] = None,
        position: Optional[str] = None,
        duration: float = 0.3,
    ) -> bool:
        """
        Move a sprite to a new position.

        Args:
            character_id: Character identifier.
            x, y: Absolute coordinates (overrides predefined position).
            position: Predefined position name.
            duration: Movement duration in seconds.

        Returns:
            True if the sprite was found and updated.
        """
        if character_id not in self._sprites:
            return False

        state = self._sprites[character_id]
        if position:
            try:
                pos_enum = SpritePosition(position)
                preset_x, preset_y = self.POSITION_PRESETS.get(
                    pos_enum, self.POSITION_PRESETS[SpritePosition.CENTER]
                )
                state.position = pos_enum
                state.x = x if x is not None else preset_x
                state.y = y if y is not None else preset_y
            except ValueError:
                pass
        else:
            if x is not None:
                state.x = x
            if y is not None:
                state.y = y

        return True

    def set_opacity(self, character_id: str, opacity: float, duration: float = 0.3) -> bool:
        """
        Fade a sprite to a new opacity.

        Args:
            character_id: Character identifier.
            opacity: Target opacity (0.0-1.0).
            duration: Fade duration in seconds.
        """
        if character_id not in self._sprites:
            return False
        self._sprites[character_id].opacity = max(0.0, min(1.0, opacity))
        return True

    def set_scale(self, character_id: str, scale: float, duration: float = 0.3) -> bool:
        """
        Scale a sprite.

        Args:
            character_id: Character identifier.
            scale: Target scale factor.
            duration: Scale animation duration in seconds.
        """
        if character_id not in self._sprites:
            return False
        state = self._sprites[character_id]
        state.scale_x = scale
        state.scale_y = scale
        return True

    def flip_sprite(self, character_id: str) -> None:
        """Toggle horizontal flip for a sprite."""
        if character_id in self._sprites:
            self._sprites[character_id].flipped = not self._sprites[character_id].flipped

    # ---- Clear ----

    def remove_sprite(self, character_id: str) -> None:
        """Remove a sprite completely (cleanup)."""
        self._sprites.pop(character_id, None)

    def clear_all(self) -> None:
        """Remove all sprites."""
        self._sprites.clear()

    def get_state_dict(self) -> Dict:
        """Get all sprite states as a dictionary (for save/load)."""
        return {
            char_id: {
                "current_variant": s.current_variant,
                "position": s.position.value,
                "x": s.x,
                "y": s.y,
                "scale_x": s.scale_x,
                "scale_y": s.scale_y,
                "opacity": s.opacity,
                "z_order": s.z_order,
                "visible": s.visible,
                "flipped": s.flipped,
            }
            for char_id, s in self._sprites.items()
        }

    def restore_from_dict(self, data: Dict) -> None:
        """Restore sprite states from dictionary."""
        self._sprites.clear()
        for char_id, sdata in data.items():
            state = SpriteState(character_id=char_id)
            state.current_variant = sdata.get("current_variant", "default")
            state.x = sdata.get("x", 0.0)
            state.y = sdata.get("y", 0.0)
            state.scale_x = sdata.get("scale_x", 1.0)
            state.scale_y = sdata.get("scale_y", 1.0)
            state.opacity = sdata.get("opacity", 1.0)
            state.z_order = sdata.get("z_order", 0)
            state.visible = sdata.get("visible", False)
            state.flipped = sdata.get("flipped", False)
            self._sprites[char_id] = state

    def get_current_variant_filepath(self, character_id: str) -> Optional[str]:
        """Get the filepath for the currently displayed variant."""
        state = self._sprites.get(character_id)
        if not state or not state.visible:
            return None
        variant = self._variants.get(character_id, {}).get(state.current_variant)
        return variant.filepath if variant else None
