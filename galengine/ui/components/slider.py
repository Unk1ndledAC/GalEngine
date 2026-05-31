"""
UI Components - Slider control.

A generic slider widget for volume control, text speed, etc.
"""

from typing import Optional, Callable
from dataclasses import dataclass


@dataclass
class SliderSnapshot:
    """A snapshot of slider state for rendering."""
    value: float
    min_value: float
    max_value: float
    label: str
    percent: float  # 0.0 to 1.0


class Slider:
    """
    A generic slider control widget.

    Features:
    - Continuous value range with configurable min/max
    - Step size for discrete snapping
    - Keyboard and mouse interaction
    - Value change callback
    - Optional label and value display
    - Horizontal or vertical orientation

    Usage:
        vol_slider = Slider(0.0, 1.0, 0.7, step=0.05, label="BGM Volume")
        vol_slider.on_value_changed(lambda v: audio.set_bgm_volume(v))
    """

    def __init__(
        self,
        min_value: float = 0.0,
        max_value: float = 1.0,
        default_value: Optional[float] = None,
        step: float = 0.0,
        label: str = "",
        orientation: str = "horizontal",
        show_value: bool = True,
        value_format: str = "{:.0%}",  # Format string for value display
    ):
        """
        Create a slider.

        Args:
            min_value: Minimum value.
            max_value: Maximum value.
            default_value: Initial value (defaults to min_value).
            step: Step size for snapping (0 = continuous).
            label: Display label for the slider.
            orientation: "horizontal" or "vertical".
            show_value: Whether to display the current value text.
            value_format: Python format string for the value display.
        """
        self.min_value = min_value
        self.max_value = max_value
        self.step = max(0.0, step)
        self.label = label
        self.orientation = orientation
        self.show_value = show_value
        self.value_format = value_format

        self._value: float = default_value if default_value is not None else min_value
        self._value = self._clamp(self._value)

        self._focused: bool = False
        self._dragging: bool = False
        self._on_value_changed: Optional[Callable[[float], None]] = None
        self._on_commit: Optional[Callable[[float], None]] = None

    # ---- Value Control ----

    @property
    def value(self) -> float:
        return self._value

    @value.setter
    def value(self, new_value: float) -> None:
        old_value = self._value
        self._value = self._clamp(self._step_snap(new_value))
        if self._value != old_value and self._on_value_changed:
            self._on_value_changed(self._value)

    def set_value(self, value: float, trigger_callback: bool = True) -> None:
        """Set the slider value. If trigger_callback is False, no callback is fired."""
        if not trigger_callback:
            self._value = self._clamp(self._step_snap(value))
        else:
            self.value = value

    def get_percent(self) -> float:
        """Get the value as a percentage (0.0-1.0)."""
        if self.max_value == self.min_value:
            return 0.0
        return (self._value - self.min_value) / (self.max_value - self.min_value)

    def set_percent(self, percent: float) -> None:
        """Set the value from a percentage (0.0-1.0)."""
        pct = max(0.0, min(1.0, percent))
        self.value = self.min_value + pct * (self.max_value - self.min_value)

    # ---- Interaction ----

    def start_drag(self) -> None:
        """Called when the user starts dragging the slider handle."""
        self._dragging = True

    def end_drag(self) -> None:
        """Called when the user releases the slider handle."""
        self._dragging = False
        if self._on_commit:
            self._on_commit(self._value)

    def increment(self) -> None:
        """Increase value by one step."""
        step = self.step if self.step > 0 else (self.max_value - self.min_value) / 20.0
        self.value = self._value + step

    def decrement(self) -> None:
        """Decrease value by one step."""
        step = self.step if self.step > 0 else (self.max_value - self.min_value) / 20.0
        self.value = self._value - step

    def focus(self) -> None:
        self._focused = True

    def blur(self) -> None:
        self._focused = False

    # ---- Callbacks ----

    def on_value_changed(self, callback: Callable[[float], None]) -> None:
        """Register a callback for value changes (called during drag)."""
        self._on_value_changed = callback

    def on_commit(self, callback: Callable[[float], None]) -> None:
        """Register a callback for when the user commits a value (releases drag)."""
        self._on_commit = callback

    # ---- Display ----

    def get_snapshot(self) -> SliderSnapshot:
        """Get a snapshot of current state for rendering."""
        return SliderSnapshot(
            value=self._value,
            min_value=self.min_value,
            max_value=self.max_value,
            label=self.label,
            percent=self.get_percent(),
        )

    def get_display_value(self) -> str:
        """Get the formatted value string for display."""
        try:
            return self.value_format.format(self._value)
        except (ValueError, TypeError):
            return str(self._value)

    # ---- Internal ----

    def _clamp(self, value: float) -> float:
        return max(self.min_value, min(self.max_value, value))

    def _step_snap(self, value: float) -> float:
        if self.step <= 0:
            return value
        steps = round((value - self.min_value) / self.step)
        return self._clamp(self.min_value + steps * self.step)

    @property
    def is_dragging(self) -> bool:
        return self._dragging

    @property
    def is_focused(self) -> bool:
        return self._focused
