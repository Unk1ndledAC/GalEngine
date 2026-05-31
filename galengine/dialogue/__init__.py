"""
Dialogue subpackage.
"""

from galengine.dialogue.dialogue_system import DialogueSystem, DialogueState
from galengine.dialogue.special_features import (
    DialogueHistory,
    DialogueHistoryEntry,
    SkipManager,
    VoiceCollection,
)

__all__ = [
    "DialogueSystem",
    "DialogueState",
    "DialogueHistory",
    "DialogueHistoryEntry",
    "SkipManager",
    "VoiceCollection",
]
