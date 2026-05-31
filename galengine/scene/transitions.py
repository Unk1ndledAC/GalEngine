"""
Visual Transitions

Manages scene transition effects between background changes, sprite changes,
and scene switches. Supports multiple transition types.
"""

from enum import Enum
from typing import Optional, Tuple
from dataclasses import dataclass


class TransitionType(Enum):
    """Available visual transition effects."""
    NONE = "none"
    FADE = "fade"
    FADE_TO_BLACK = "fade_to_black"
    FADE_TO_WHITE = "fade_to_white"
    CROSSFADE = "crossfade"
    DISSOLVE = "dissolve"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    SLIDE_UP = "slide_up"
    SLIDE_DOWN = "slide_down"
    BLINDS = "blinds"          # Venetian blinds effect
    IRIS_IN = "iris_in"        # Circle closing in
    IRIS_OUT = "iris_out"      # Circle opening out
    WIPE_LEFT = "wipe_left"
    WIPE_RIGHT = "wipe_right"
    PIXELATE = "pixelate"      # Pixel dissolve
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    ROTATE = "rotate"


@dataclass
class Transition:
    """A single transition effect in progress."""
    effect: TransitionType
    duration: float
    elapsed: float = 0.0
    completed: bool = False
    callback: Optional[callable] = None
    from_surface: Optional[object] = None  # pygame.Surface
    to_surface: Optional[object] = None    # pygame.Surface
    # Type-specific parameters
    direction: int = 0     # Direction for wipe effects
    strips: int = 8        # Number of strips for blinds effect
    progress: float = 0.0  # 0.0 -> 1.0


class TransitionManager:
    """
    Manages visual transition effects for scene changes.

    Supports a wide range of transition types:
    - Fade: Simple opacity morph
    - Crossfade: Blend two images
    - Slide: Move images in/out from edges
    - Dissolve: Random pixel replacement
    - Blinds: Venetian blinds horizontal strips
    - Iris: Circle-based reveal
    - Wipe: Directional reveal
    - Pixelate: Block-based dissolve

    The actual rendering is handled by the renderer in the pygame implementation.
    This module provides the data model, timing, and effect selection logic.
    """

    def __init__(self):
        self._active_transition: Optional[Transition] = None
        self._queue: list = []  # Queued transitions

    # ---- Transition Control ----

    def start(
        self,
        effect: str = "fade",
        duration: float = 1.0,
        callback: Optional[callable] = None,
    ) -> None:
        """
        Start a new transition effect.

        Args:
            effect: Transition type name (see TransitionType for options).
            duration: Duration in seconds.
            callback: Called when the transition completes.
        """
        try:
            ttype = TransitionType(effect)
        except ValueError:
            print(f"WARNING: Unknown transition effect '{effect}', falling back to 'fade'")
            ttype = TransitionType.FADE

        transition = Transition(
            effect=ttype,
            duration=max(0.01, duration),
            callback=callback,
        )

        # If a transition is already active, queue the new one
        if self._active_transition and not self._active_transition.completed:
            self._queue.append(transition)
        else:
            self._active_transition = transition

    def update(self, dt: float) -> None:
        """
        Update the current transition.

        Args:
            dt: Delta time in seconds.
        """
        if not self._active_transition or self._active_transition.completed:
            return

        transition = self._active_transition
        transition.elapsed += dt
        transition.progress = min(1.0, transition.elapsed / transition.duration)

        if transition.progress >= 1.0:
            transition.completed = True
            if transition.callback:
                transition.callback()
            # Start next queued transition
            if self._queue:
                self._active_transition = self._queue.pop(0)
            else:
                self._active_transition = None

    def is_active(self) -> bool:
        """Check if a transition is currently in progress."""
        return self._active_transition is not None and not self._active_transition.completed

    def get_progress(self) -> float:
        """Get current transition progress (0.0-1.0)."""
        if not self._active_transition:
            return 1.0
        return self._active_transition.progress

    def skip_current(self) -> None:
        """Instantly complete the current transition."""
        if self._active_transition:
            self._active_transition.elapsed = self._active_transition.duration
            self._active_transition.progress = 1.0
            self._active_transition.completed = True
            if self._active_transition.callback:
                self._active_transition.callback()
            if self._queue:
                self._active_transition = self._queue.pop(0)
            else:
                self._active_transition = None

    def skip_all(self) -> None:
        """Skip all queued transitions."""
        while self._active_transition:
            self.skip_current()
        self._queue.clear()

    def clear(self) -> None:
        """Cancel current transition and clear queue."""
        self._active_transition = None
        self._queue.clear()

    # ---- Effect Helpers ----

    def fade_in(self, duration: float = 0.5, callback: Optional[callable] = None) -> None:
        """Convenience: fade from black to scene."""
        self.start("fade", duration, callback)

    def fade_out(self, duration: float = 0.5, callback: Optional[callable] = None) -> None:
        """Convenience: fade to black."""
        self.start("fade_to_black", duration, callback)

    def fade_between(
        self,
        duration: float = 1.0,
        between_callback: Optional[callable] = None,
    ) -> None:
        """
        Standard fade-out-then-fade-in sequence for scene transitions.
        Calls between_callback at the halfway point (when fully black).
        """
        half = duration / 2.0

        def _on_blackout():
            if between_callback:
                between_callback()
            self.fade_in(half)

        self.fade_out(half, _on_blackout)

    def crossfade(self, duration: float = 0.8, callback: Optional[callable] = None) -> None:
        """Convenience: crossfade between scenes."""
        self.start("crossfade", duration, callback)

    @staticmethod
    def get_available_effects() -> list:
        """Get list of all available transition effect names."""
        return [t.value for t in TransitionType]

    @staticmethod
    def get_effect_category(effect_name: str) -> str:
        """Get the category of a transition effect."""
        fades = {"none", "fade", "fade_to_black", "fade_to_white", "crossfade"}
        slides = {"slide_left", "slide_right", "slide_up", "slide_down"}
        wipes = {"wipe_left", "wipe_right"}
        special = {"dissolve", "blinds", "iris_in", "iris_out", "pixelate", "zoom_in", "zoom_out", "rotate"}

        if effect_name in fades:
            return "fade"
        elif effect_name in slides:
            return "slide"
        elif effect_name in wipes:
            return "wipe"
        elif effect_name in special:
            return "special"
        return "unknown"
