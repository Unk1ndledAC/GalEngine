"""
Scene management subpackage.
"""

from galengine.scene.scene_manager import SceneManager, SceneState
from galengine.scene.sprite_manager import (
    SpriteManager, SpriteState, SpriteVariant, SpritePosition,
)
from galengine.scene.transitions import TransitionManager, TransitionType
from galengine.scene.cg_mode import CGMode, CGEntry

__all__ = [
    "SceneManager",
    "SceneState",
    "SpriteManager",
    "SpriteState",
    "SpriteVariant",
    "SpritePosition",
    "TransitionManager",
    "TransitionType",
    "CGMode",
    "CGEntry",
]
