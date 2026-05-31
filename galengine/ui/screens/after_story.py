"""
After Story / Epilogue System

Manages post-game content unlocked after completing character routes:
- Unlock additional scenes/stories for completed character routes
- Support for patch/DLC extension content
- Character route tracking
"""

from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class CharacterRoute:
    """A character route/storyline."""
    character_id: str
    character_name: str
    completed: bool = False
    ending_type: str = ""  # "good", "normal", "bad", "true"
    completion_date: Optional[str] = None
    play_count: int = 0


@dataclass
class AfterStoryContent:
    """A piece of after-story content (additional episode, side story, etc.)."""
    content_id: str
    display_name: str
    description: str = ""
    scene_id: str = ""              # Scene to play for this content
    required_route: str = ""        # Character route that must be completed
    required_ending: str = ""       # Specific ending type required ("" = any)
    required_flags: Dict[str, Any] = field(default_factory=dict)  # Additional flag requirements
    unlocked: bool = False
    is_patch_content: bool = False  # Content added via a patch/DLC
    patch_id: str = ""
    play_count: int = 0
    category: str = "after_story"   # "after_story", "side_story", "extra", "patch"


class AfterStory:
    """
    Manages after-story / post-game content.

    Players unlock additional content by completing character routes.
    Content can be extended via patches/DLC.

    Features:
    - Track character route completion
    - Unlock additional scenes based on completed routes
    - Support patch/DLC content that extends the base game
    - Show available/unavailable after-story content
    """

    def __init__(self):
        self._routes: Dict[str, CharacterRoute] = {}
        self._contents: Dict[str, AfterStoryContent] = {}
        self._current_selection: int = 0
        self._view_category: str = "all"  # Current filter category

    # ---- Route Management ----

    def register_route(
        self,
        character_id: str,
        character_name: str,
    ) -> None:
        """Register a character route."""
        self._routes[character_id] = CharacterRoute(
            character_id=character_id,
            character_name=character_name,
        )

    def complete_route(
        self,
        character_id: str,
        ending_type: str = "normal",
    ) -> bool:
        """
        Mark a character route as completed.

        Args:
            character_id: Character ID.
            ending_type: Type of ending achieved.

        Returns:
            True if the route was found and marked.
        """
        import time
        if character_id not in self._routes:
            return False

        route = self._routes[character_id]
        route.completed = True
        route.ending_type = ending_type
        route.completion_date = time.strftime("%Y-%m-%d %H:%M:%S")
        route.play_count += 1

        # Check for newly unlockable content
        self._check_unlocks()

        return True

    def has_completed_route(self, character_id: str) -> bool:
        """Check if a character route has been completed."""
        route = self._routes.get(character_id)
        return route is not None and route.completed

    def get_routes(self) -> List[CharacterRoute]:
        """Get all registered character routes."""
        return list(self._routes.values())

    def get_completed_routes(self) -> List[CharacterRoute]:
        """Get completed character routes."""
        return [r for r in self._routes.values() if r.completed]

    def get_available_routes(self) -> List[CharacterRoute]:
        """Get routes that have not been completed."""
        return [r for r in self._routes.values() if not r.completed]

    # ---- Content Management ----

    def register_content(
        self,
        content_id: str,
        display_name: str,
        scene_id: str,
        description: str = "",
        required_route: str = "",
        required_ending: str = "",
        required_flags: Optional[Dict[str, Any]] = None,
        is_patch: bool = False,
        patch_id: str = "",
        category: str = "after_story",
    ) -> None:
        """
        Register an after-story content piece.

        Args:
            content_id: Unique content identifier.
            display_name: Display name in the menu.
            scene_id: Scene to play when selected.
            description: Description text.
            required_route: Character route required to unlock.
            required_ending: Specific ending type required (empty = any).
            required_flags: Additional flag requirements.
            is_patch: Whether this content came from a patch/DLC.
            patch_id: Patch identifier (if is_patch).
            category: Content category for organization.
        """
        self._contents[content_id] = AfterStoryContent(
            content_id=content_id,
            display_name=display_name,
            description=description,
            scene_id=scene_id,
            required_route=required_route,
            required_ending=required_ending,
            required_flags=required_flags or {},
            is_patch_content=is_patch,
            patch_id=patch_id,
            category=category,
        )

        # Check if already unlockable based on current route state
        self._check_unlock(content_id)

    def _check_unlock(self, content_id: str) -> None:
        """Check if a specific content should be unlocked."""
        content = self._contents.get(content_id)
        if not content or content.unlocked:
            return

        if content.required_route:
            route = self._routes.get(content.required_route)
            if not route or not route.completed:
                return
            if content.required_ending and route.ending_type != content.required_ending:
                return

        content.unlocked = True

    def _check_unlocks(self) -> List[str]:
        """Check all registered content for new unlocks. Returns newly unlocked IDs."""
        newly_unlocked = []
        for cid in self._contents:
            if not self._contents[cid].unlocked:
                self._check_unlock(cid)
                if self._contents[cid].unlocked:
                    newly_unlocked.append(cid)
        return newly_unlocked

    def get_contents(
        self,
        category: Optional[str] = None,
        unlocked_only: bool = True,
        include_patch: bool = True,
    ) -> List[AfterStoryContent]:
        """
        Get after-story content, optionally filtered.

        Args:
            category: Filter by category ("after_story", "side_story", etc.).
            unlocked_only: Only show unlocked content.
            include_patch: Include content from patches/DLCs.

        Returns:
            Sorted list of AfterStoryContent.
        """
        contents = list(self._contents.values())

        if not include_patch:
            contents = [c for c in contents if not c.is_patch_content]

        if category and category != "all":
            contents = [c for c in contents if c.category == category]

        if unlocked_only:
            contents = [c for c in contents if c.unlocked]

        return sorted(contents, key=lambda c: (c.category, c.display_name))

    def get_available_content(self, character_id: str) -> List[AfterStoryContent]:
        """Get content available for a specific character's route."""
        return [
            c for c in self._contents.values()
            if c.required_route == character_id
        ]

    def get_patch_contents(self) -> List[AfterStoryContent]:
        """Get all content from patches/DLCs."""
        return [c for c in self._contents.values() if c.is_patch_content]

    def get_categories(self) -> List[str]:
        """Get all content categories."""
        return sorted(set(c.category for c in self._contents.values()))

    # ---- Navigation ----

    def set_category_filter(self, category: str) -> None:
        self._view_category = category
        self._current_selection = 0

    def select_next(self) -> None:
        items = self.get_contents(category=self._view_category, unlocked_only=True)
        if items:
            self._current_selection = (self._current_selection + 1) % len(items)

    def select_previous(self) -> None:
        items = self.get_contents(category=self._view_category, unlocked_only=True)
        if items:
            self._current_selection = (self._current_selection - 1) % len(items)

    def get_selected_content(self) -> Optional[AfterStoryContent]:
        items = self.get_contents(category=self._view_category, unlocked_only=True)
        if 0 <= self._current_selection < len(items):
            return items[self._current_selection]
        return None

    # ---- Statistics ----

    def get_stats(self) -> Dict[str, Any]:
        """Get after-story completion statistics."""
        total_routes = len(self._routes)
        completed_routes = len([r for r in self._routes.values() if r.completed])
        total_contents = len(self._contents)
        unlocked_contents = len([c for c in self._contents.values() if c.unlocked])
        patch_contents = len([c for c in self._contents.values() if c.is_patch_content])

        return {
            "routes": {"total": total_routes, "completed": completed_routes},
            "contents": {"total": total_contents, "unlocked": unlocked_contents},
            "patch_contents": patch_contents,
        }

    def get_overall_completion(self) -> float:
        """Get overall after-story completion percentage (0.0-1.0)."""
        route_completion = 0.0
        if self._routes:
            route_completion = len([r for r in self._routes.values() if r.completed]) / len(self._routes)

        content_completion = 0.0
        if self._contents:
            content_completion = len([c for c in self._contents.values() if c.unlocked]) / len(self._contents)

        return (route_completion + content_completion) / 2.0

    # ---- Serialization ----

    def get_state_dict(self) -> Dict[str, Any]:
        """Get state for save/load."""
        return {
            "routes": {
                cid: {
                    "completed": r.completed,
                    "ending_type": r.ending_type,
                    "completion_date": r.completion_date,
                    "play_count": r.play_count,
                }
                for cid, r in self._routes.items()
            },
            "contents": {
                cid: {"unlocked": c.unlocked, "play_count": c.play_count}
                for cid, c in self._contents.items()
            },
        }

    def restore_from_dict(self, data: Dict[str, Any]) -> None:
        """Restore state from save data."""
        for cid, rdata in data.get("routes", {}).items():
            if cid in self._routes:
                r = self._routes[cid]
                r.completed = rdata.get("completed", False)
                r.ending_type = rdata.get("ending_type", "")
                r.completion_date = rdata.get("completion_date")
                r.play_count = rdata.get("play_count", 0)

        for cid, cdata in data.get("contents", {}).items():
            if cid in self._contents:
                self._contents[cid].unlocked = cdata.get("unlocked", False)
                self._contents[cid].play_count = cdata.get("play_count", 0)

    @property
    def current_selection(self) -> int:
        return self._current_selection

    @property
    def view_category(self) -> str:
        return self._view_category
