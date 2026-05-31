"""
CG Display Mode

Manages full-screen CG (Computer Graphics / illustration) display.
Supports:
- Full-screen CG display with click-to-advance
- Multiple CG images in sequence
- Transitions between CGs
- CG gallery unlock tracking
"""

from typing import Optional, List, Callable
from dataclasses import dataclass


@dataclass
class CGEntry:
    """A single CG image with metadata for gallery."""
    cg_id: str
    filepath: str
    display_name: str = ""
    description: str = ""
    category: str = "general"  # general, ending, event, etc.
    unlocked: bool = False
    unlock_condition: Optional[str] = None  # Flag condition e.g., "sakura_ending >= 1"


class CGMode:
    """
    Manages CG display during gameplay and CG gallery.

    During gameplay, CGs are displayed full-screen with click-to-advance.
    In the gallery, CGs are browsable and filterable by category.
    """

    def __init__(self):
        self._is_active: bool = False
        self._current_cg: Optional[CGEntry] = None
        self._cg_sequence: List[CGEntry] = []  # For sequential CG display
        self._sequence_index: int = 0
        self._registered_cgs: dict = {}  # cg_id -> CGEntry
        self._on_advance: Optional[Callable] = None
        self._can_skip: bool = True

    # ---- Registration ----

    def register_cg(
        self,
        cg_id: str,
        filepath: str,
        display_name: str = "",
        description: str = "",
        category: str = "general",
        unlock_condition: Optional[str] = None,
    ) -> None:
        """
        Register a CG image for use in the game.

        Args:
            cg_id: Unique CG identifier.
            filepath: Path to the CG image file.
            display_name: Display name in gallery.
            description: Text description (shown in gallery).
            category: Gallery category for organization.
            unlock_condition: Flag condition to auto-unlock.
        """
        self._registered_cgs[cg_id] = CGEntry(
            cg_id=cg_id,
            filepath=filepath,
            display_name=display_name,
            description=description,
            category=category,
            unlock_condition=unlock_condition,
        )

    def get_registered_cgs(self, category: Optional[str] = None) -> List[CGEntry]:
        """Get registered CGs, optionally filtered by category."""
        cgs = list(self._registered_cgs.values())
        if category:
            cgs = [cg for cg in cgs if cg.category == category]
        return sorted(cgs, key=lambda c: c.cg_id)

    def get_cg(self, cg_id: str) -> Optional[CGEntry]:
        """Get a specific CG by ID."""
        return self._registered_cgs.get(cg_id)

    # ---- Display During Gameplay ----

    def show(
        self,
        cg_id: str,
        transition: str = "fade",
        duration: float = 0.8,
        can_skip: bool = True,
        on_advance: Optional[Callable] = None,
    ) -> bool:
        """
        Display a CG during gameplay.

        Args:
            cg_id: CG to display.
            transition: Transition effect name.
            duration: Transition duration.
            can_skip: Whether click advances to next scene.
            on_advance: Callback when player clicks to continue.

        Returns:
            True if the CG was found and displayed.
        """
        cg = self._registered_cgs.get(cg_id)
        if not cg:
            print(f"WARNING: CG '{cg_id}' not found")
            return False

        self._current_cg = cg
        self._is_active = True
        self._can_skip = can_skip
        self._on_advance = on_advance
        # Auto-unlock
        if not cg.unlocked:
            self.unlock(cg_id)
        return True

    def show_sequence(
        self,
        cg_ids: List[str],
        transition: str = "fade",
        duration: float = 0.5,
        can_skip: bool = True,
        on_complete: Optional[Callable] = None,
    ) -> bool:
        """
        Display a sequence of CGs (click to advance through them).

        Args:
            cg_ids: Ordered list of CG IDs to show.
            transition: Transition effect between each CG.
            duration: Transition duration.
            can_skip: Whether click advances.
            on_complete: Callback when the sequence finishes.

        Returns:
            True if at least one CG was found.
        """
        self._cg_sequence = []
        for cg_id in cg_ids:
            cg = self._registered_cgs.get(cg_id)
            if cg:
                self._cg_sequence.append(cg)
                if not cg.unlocked:
                    self.unlock(cg_id)
            else:
                print(f"WARNING: CG '{cg_id}' not found, skipping")

        if not self._cg_sequence:
            return False

        self._sequence_index = 0
        self._current_cg = self._cg_sequence[0]
        self._is_active = True
        self._can_skip = can_skip
        self._on_advance = self._sequence_advance
        return True

    def _sequence_advance(self) -> None:
        """Advance to the next CG in a sequence."""
        self._sequence_index += 1
        if self._sequence_index < len(self._cg_sequence):
            self._current_cg = self._cg_sequence[self._sequence_index]
        else:
            self.hide()

    def advance(self) -> None:
        """
        Handle click-to-advance when a CG is displayed.
        Returns True if the CG was advanced (or hidden if last/not sequence).
        """
        if not self._is_active or not self._can_skip:
            return

        if self._on_advance:
            self._on_advance()
        else:
            self.hide()

    def hide(self) -> None:
        """Hide the current CG display."""
        self._is_active = False
        self._current_cg = None
        self._cg_sequence.clear()
        self._sequence_index = 0
        self._on_advance = None

    # ---- Gallery ----

    def unlock(self, cg_id: str) -> bool:
        """
        Unlock a CG for the gallery.

        Args:
            cg_id: CG identifier.

        Returns:
            True if the CG was found and unlocked.
        """
        cg = self._registered_cgs.get(cg_id)
        if cg:
            cg.unlocked = True
            return True
        return False

    def unlock_by_category(self, category: str) -> int:
        """Unlock all CGs in a category. Returns count of unlocked CGs."""
        count = 0
        for cg in self._registered_cgs.values():
            if cg.category == category and not cg.unlocked:
                cg.unlocked = True
                count += 1
        return count

    def unlock_all(self) -> int:
        """Unlock all CGs. Returns count of newly unlocked CGs."""
        count = 0
        for cg in self._registered_cgs.values():
            if not cg.unlocked:
                cg.unlocked = True
                count += 1
        return count

    def get_unlocked_cgs(self, category: Optional[str] = None) -> List[CGEntry]:
        """Get all unlocked CGs, optionally filtered by category."""
        cgs = self.get_registered_cgs(category)
        return [cg for cg in cgs if cg.unlocked]

    def get_unlock_counts(self) -> dict:
        """Get unlock stats: total, unlocked per category."""
        all_cgs = list(self._registered_cgs.values())
        unlocked = [cg for cg in all_cgs if cg.unlocked]
        categories = {}
        for cg in all_cgs:
            cat = cg.category
            if cat not in categories:
                categories[cat] = {"total": 0, "unlocked": 0}
            categories[cat]["total"] += 1
            if cg.unlocked:
                categories[cat]["unlocked"] += 1
        return {
            "total": len(all_cgs),
            "unlocked": len(unlocked),
            "by_category": categories,
        }

    def check_unlock_conditions(self, flags: dict) -> List[str]:
        """
        Check flag conditions and auto-unlock CGs.

        Args:
            flags: Current global flag state.

        Returns:
            List of CG IDs that were just unlocked.
        """
        newly_unlocked = []
        for cg in self._registered_cgs.values():
            if cg.unlocked or not cg.unlock_condition:
                continue
            if self._evaluate_condition(cg.unlock_condition, flags):
                cg.unlocked = True
                newly_unlocked.append(cg.cg_id)
        return newly_unlocked

    def _evaluate_condition(self, condition: str, flags: dict) -> bool:
        """Evaluate a simple flag condition string."""
        import re
        match = re.match(r'(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)', condition)
        if match:
            flag_name = match.group(1)
            op = match.group(2)
            target_str = match.group(3).strip()
            current = flags.get(flag_name, 0)
            try:
                target = float(target_str)
            except ValueError:
                target = target_str.strip('"\'')
            if op == "==":
                return current == target
            elif op == "!=":
                return current != target
            elif op == ">=":
                return current >= target
            elif op == "<=":
                return current <= target
            elif op == ">":
                return current > target
            elif op == "<":
                return current < target
        return bool(flags.get(condition, False))

    # ---- State ----

    @property
    def is_active(self) -> bool:
        """Whether a CG is currently being displayed."""
        return self._is_active

    def get_current_cg(self) -> Optional[CGEntry]:
        """Get the currently displayed CG, if any."""
        return self._current_cg

    def get_state_dict(self) -> dict:
        """Get CG unlock state for save/load."""
        return {
            cg_id: cg.unlocked
            for cg_id, cg in self._registered_cgs.items()
        }

    def restore_unlocks(self, state: dict) -> None:
        """Restore CG unlock state from save data."""
        for cg_id, unlocked in state.items():
            if cg_id in self._registered_cgs:
                self._registered_cgs[cg_id].unlocked = unlocked
