"""
Audio Manager

Manages background music (BGM), sound effects (SFX), and voice playback.
Supports independent volume control per channel and fade in/out.
"""

import os
from typing import Optional, Dict
from dataclasses import dataclass

from galengine.core.config import EngineConfig


@dataclass
class AudioTrack:
    """Represents an active audio track."""
    filepath: str
    volume: float = 1.0
    loop: bool = False
    is_playing: bool = False


class AudioManager:
    """
    Manages all audio playback for the engine.

    Volume hierarchy:
        master_volume -> bgm_volume / sfx_volume / voice_volume
                         └── character_voice_volumes[char_id]

    In the Pygame implementation, this wraps pygame.mixer.
    In the current reference implementation, it provides the interface
    and data model; actual audio playback is stubbed.
    """

    def __init__(self, config: EngineConfig):
        self.config = config
        self._current_bgm: Optional[AudioTrack] = None
        self._active_sfx: list = []
        self._active_voices: list = []
        self._voice_collection: list = []  # Favorited voice lines
        self._initialized: bool = False

    def init(self) -> bool:
        """Initialize the audio subsystem."""
        try:
            # In real pygame implementation:
            # pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)
            self._initialized = True
            return True
        except Exception as e:
            print(f"ERROR: Failed to initialize audio: {e}")
            return False

    # ---- BGM ----

    def play_bgm(self, filepath: str, loop: bool = True, fade_ms: int = 1000, volume: float = 1.0) -> None:
        """
        Play background music. Fades out current BGM if any.

        Args:
            filepath: Absolute path to audio file.
            loop: Whether to loop the BGM.
            fade_ms: Fade-in duration in milliseconds.
            volume: Relative volume (0.0-1.0). Multiplied by bgm_volume * master_volume.
        """
        if not self._initialized:
            return

        # Check file exists
        if not os.path.isfile(filepath):
            print(f"WARNING: BGM file not found: {filepath}")
            return

        # Stop current BGM
        self.stop_bgm(fade_ms=500)

        self._current_bgm = AudioTrack(
            filepath=filepath,
            volume=volume,
            loop=loop,
            is_playing=True,
        )

    def stop_bgm(self, fade_ms: int = 1000) -> None:
        """Stop background music with optional fade-out."""
        if self._current_bgm and self._current_bgm.is_playing:
            self._current_bgm.is_playing = False
            self._current_bgm = None

    def pause_bgm(self) -> None:
        """Pause the current BGM."""
        if self._current_bgm:
            self._current_bgm.is_playing = False

    def resume_bgm(self) -> None:
        """Resume paused BGM."""
        if self._current_bgm:
            self._current_bgm.is_playing = True

    def get_bgm_volume(self) -> float:
        """Get effective BGM volume (bgm_volume * master_volume)."""
        return self.config.bgm_volume * self.config.master_volume

    # ---- SFX ----

    def play_sfx(self, filepath: str, volume: float = 1.0, loop: bool = False) -> None:
        """
        Play a sound effect.

        Args:
            filepath: Absolute path to audio file.
            volume: Relative volume (0.0-1.0).
            loop: Whether to loop the SFX.
        """
        if not self._initialized:
            return
        if not os.path.isfile(filepath):
            print(f"WARNING: SFX file not found: {filepath}")
            return

        track = AudioTrack(filepath=filepath, volume=volume, loop=loop, is_playing=True)
        self._active_sfx.append(track)
        # Clean up finished tracks (simplified)
        self._active_sfx = [t for t in self._active_sfx if t.is_playing]

    def stop_all_sfx(self) -> None:
        """Stop all currently playing sound effects."""
        for track in self._active_sfx:
            track.is_playing = False
        self._active_sfx.clear()

    # ---- Voice ----

    def play_voice(self, filepath: str, character: Optional[str] = None) -> None:
        """
        Play a character voice line.

        Args:
            filepath: Absolute path to voice file.
            character: Character ID for per-character volume control.
        """
        if not self._initialized:
            return
        if not os.path.isfile(filepath):
            print(f"WARNING: Voice file not found: {filepath}")
            return

        # Stop any currently playing voice
        self.stop_all_voices()

        char_vol = 1.0
        if character and character in self.config.character_voice_volumes:
            char_vol = self.config.character_voice_volumes[character]

        track = AudioTrack(filepath=filepath, volume=char_vol, is_playing=True)
        self._active_voices.append(track)

    def stop_all_voices(self) -> None:
        """Stop all currently playing voice lines."""
        for track in self._active_voices:
            track.is_playing = False
        self._active_voices.clear()

    def collect_voice(self, filepath: str) -> None:
        """
        Add a voice line to the favorites/collection.

        Args:
            filepath: Voice file path to collect.
        """
        if filepath not in self._voice_collection:
            self._voice_collection.append(filepath)

    def get_voice_collection(self) -> list:
        """Get all collected voice file paths."""
        return self._voice_collection.copy()

    def is_voice_playing(self) -> bool:
        """Check if any voice is currently playing."""
        return any(t.is_playing for t in self._active_voices)

    # ---- Volume Control ----

    def set_master_volume(self, volume: float) -> None:
        """Set master volume (0.0-1.0)."""
        self.config.master_volume = max(0.0, min(1.0, volume))

    def set_bgm_volume(self, volume: float) -> None:
        """Set BGM volume (0.0-1.0)."""
        self.config.bgm_volume = max(0.0, min(1.0, volume))

    def set_sfx_volume(self, volume: float) -> None:
        """Set SFX volume (0.0-1.0)."""
        self.config.sfx_volume = max(0.0, min(1.0, volume))

    def set_voice_volume(self, volume: float) -> None:
        """Set voice volume (0.0-1.0)."""
        self.config.voice_volume = max(0.0, min(1.0, volume))

    def set_character_voice_volume(self, character: str, volume: float) -> None:
        """Set per-character voice volume (0.0-1.0)."""
        self.config.character_voice_volumes[character] = max(0.0, min(1.0, volume))

    # ---- Cleanup ----

    def stop_all(self) -> None:
        """Stop all audio playback."""
        self.stop_bgm(fade_ms=500)
        self.stop_all_sfx()
        self.stop_all_voices()

    def cleanup(self) -> None:
        """Clean up audio resources."""
        self.stop_all()
        self._initialized = False
