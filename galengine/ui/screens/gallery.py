"""
Gallery System

Manages unlockable content galleries:
- Scene Gallery: Replay unlocked scene dialogues with CGs
- CG Gallery: Browse unlocked CG illustrations
- Music Gallery: Play unlocked BGM tracks and voice collections
"""

from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field
from enum import Enum


class GalleryTab(Enum):
    """Gallery sub-tabs."""
    SCENE = "scene"     # Scene replay
    CG = "cg"           # CG illustrations
    MUSIC = "music"     # BGM and voice collection


@dataclass
class SceneEntry:
    """A scene entry in the scene gallery."""
    scene_id: str
    display_name: str
    chapter: str = ""
    route: Optional[str] = None
    description: str = ""
    thumbnail: Optional[str] = None  # Thumbnail image path
    unlocked: bool = False
    play_count: int = 0
    unlock_condition: Optional[str] = None


@dataclass
class CGEntry:
    """A CG entry in the CG gallery."""
    cg_id: str
    filepath: str
    display_name: str
    description: str = ""
    category: str = "general"
    thumbnail: Optional[str] = None
    unlocked: bool = False
    unlock_condition: Optional[str] = None
    scene_ids: List[str] = field(default_factory=list)  # Scenes where this CG appears


@dataclass
class MusicEntry:
    """A music/BGM entry in the music gallery."""
    track_id: str
    filepath: str
    display_name: str
    artist: str = ""
    category: str = "bgm"  # "bgm", "song", "voice"
    duration: float = 0.0   # Duration in seconds
    unlocked: bool = False
    unlock_condition: Optional[str] = None
    loop: bool = True
    # For voice tracks
    character: Optional[str] = None
    text: str = ""  # Associated dialogue text


class Gallery:
    """
    Manages all unlockable content galleries.

    Tracks what the player has unlocked and provides browsing
    and playback functionality.
    """

    def __init__(self):
        # Scene gallery
        self._scenes: Dict[str, SceneEntry] = {}

        # CG gallery
        self._cgs: Dict[str, CGEntry] = {}

        # Music gallery
        self._tracks: Dict[str, MusicEntry] = {}

        # Current state
        self._current_tab: GalleryTab = GalleryTab.SCENE
        self._current_category: str = "all"
        self._selected_index: int = 0

        # Playback state
        self._is_playing_scene: bool = False
        self._playing_scene_id: Optional[str] = None

        # Callbacks
        self._on_scene_select: Optional[Callable[[str], None]] = None
        self._on_music_select: Optional[Callable[[str], None]] = None

    # ---- Scene Gallery ----

    def register_scene(
        self,
        scene_id: str,
        display_name: str,
        chapter: str = "",
        route: Optional[str] = None,
        description: str = "",
        thumbnail: Optional[str] = None,
        unlock_condition: Optional[str] = None,
    ) -> None:
        """Register a scene in the gallery."""
        self._scenes[scene_id] = SceneEntry(
            scene_id=scene_id,
            display_name=display_name,
            chapter=chapter,
            route=route,
            description=description,
            thumbnail=thumbnail,
            unlock_condition=unlock_condition,
        )

    def get_scenes(
        self,
        chapter: Optional[str] = None,
        route: Optional[str] = None,
        unlocked_only: bool = True,
    ) -> List[SceneEntry]:
        """Get scene entries, optionally filtered."""
        scenes = list(self._scenes.values())
        if chapter:
            scenes = [s for s in scenes if s.chapter == chapter]
        if route:
            scenes = [s for s in scenes if s.route == route]
        if unlocked_only:
            scenes = [s for s in scenes if s.unlocked]
        return sorted(scenes, key=lambda s: (s.chapter, s.display_name))

    def unlock_scene(self, scene_id: str) -> bool:
        """Unlock a scene for the gallery."""
        if scene_id in self._scenes:
            self._scenes[scene_id].unlocked = True
            return True
        return False

    def get_scene_chapters(self) -> List[str]:
        """Get list of all chapters that have scenes."""
        return sorted(set(s.chapter for s in self._scenes.values() if s.chapter))

    def get_scene_routes(self) -> List[str]:
        """Get list of all routes that have scenes."""
        routes = set()
        for s in self._scenes.values():
            if s.route:
                routes.add(s.route)
        return sorted(routes)

    # ---- CG Gallery ----

    def register_cg(
        self,
        cg_id: str,
        filepath: str,
        display_name: str,
        description: str = "",
        category: str = "general",
        thumbnail: Optional[str] = None,
        unlock_condition: Optional[str] = None,
        scene_ids: Optional[List[str]] = None,
    ) -> None:
        """Register a CG in the gallery."""
        self._cgs[cg_id] = CGEntry(
            cg_id=cg_id,
            filepath=filepath,
            display_name=display_name,
            description=description,
            category=category,
            thumbnail=thumbnail,
            unlock_condition=unlock_condition,
            scene_ids=scene_ids or [],
        )

    def get_cgs(
        self,
        category: Optional[str] = None,
        unlocked_only: bool = True,
    ) -> List[CGEntry]:
        """Get CG entries, optionally filtered."""
        cgs = list(self._cgs.values())
        if category and category != "all":
            cgs = [cg for cg in cgs if cg.category == category]
        if unlocked_only:
            cgs = [cg for cg in cgs if cg.unlocked]
        return sorted(cgs, key=lambda c: c.display_name)

    def unlock_cg(self, cg_id: str) -> bool:
        """Unlock a CG for the gallery."""
        if cg_id in self._cgs:
            self._cgs[cg_id].unlocked = True
            return True
        return False

    def get_cg_categories(self) -> List[str]:
        """Get list of CG categories."""
        return sorted(set(cg.category for cg in self._cgs.values()))

    # ---- Music Gallery ----

    def register_track(
        self,
        track_id: str,
        filepath: str,
        display_name: str,
        artist: str = "",
        category: str = "bgm",
        duration: float = 0.0,
        unlock_condition: Optional[str] = None,
        loop: bool = True,
        character: Optional[str] = None,
        text: str = "",
    ) -> None:
        """Register a music track in the gallery."""
        self._tracks[track_id] = MusicEntry(
            track_id=track_id,
            filepath=filepath,
            display_name=display_name,
            artist=artist,
            category=category,
            duration=duration,
            unlock_condition=unlock_condition,
            loop=loop,
            character=character,
            text=text,
        )

    def get_tracks(
        self,
        category: Optional[str] = None,
        unlocked_only: bool = True,
    ) -> List[MusicEntry]:
        """Get music entries, optionally filtered."""
        tracks = list(self._tracks.values())
        if category and category != "all":
            tracks = [t for t in tracks if t.category == category]
        if unlocked_only:
            tracks = [t for t in tracks if t.unlocked]
        return sorted(tracks, key=lambda t: t.display_name)

    def unlock_track(self, track_id: str) -> bool:
        """Unlock a music track for the gallery."""
        if track_id in self._tracks:
            self._tracks[track_id].unlocked = True
            return True
        return False

    def get_track_categories(self) -> List[str]:
        """Get list of music categories."""
        return sorted(set(t.category for t in self._tracks.values()))

    # ---- Bulk Unlock ----

    def unlock_all(self) -> Dict[str, int]:
        """
        Unlock all content in all galleries.
        Returns counts of newly unlocked items.
        """
        counts = {"scenes": 0, "cgs": 0, "tracks": 0}
        for scene in self._scenes.values():
            if not scene.unlocked:
                scene.unlocked = True
                counts["scenes"] += 1
        for cg in self._cgs.values():
            if not cg.unlocked:
                cg.unlocked = True
                counts["cgs"] += 1
        for track in self._tracks.values():
            if not track.unlocked:
                track.unlocked = True
                counts["tracks"] += 1
        return counts

    def check_unlock_conditions(self, flags: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Check unlock conditions against current flags.
        Returns newly unlocked item IDs by type.
        """
        newly_unlocked = {"scenes": [], "cgs": [], "tracks": []}

        for sid, scene in self._scenes.items():
            if not scene.unlocked and scene.unlock_condition:
                if self._evaluate_condition(scene.unlock_condition, flags):
                    scene.unlocked = True
                    newly_unlocked["scenes"].append(sid)

        for cid, cg in self._cgs.items():
            if not cg.unlocked and cg.unlock_condition:
                if self._evaluate_condition(cg.unlock_condition, flags):
                    cg.unlocked = True
                    newly_unlocked["cgs"].append(cid)

        for tid, track in self._tracks.items():
            if not track.unlocked and track.unlock_condition:
                if self._evaluate_condition(track.unlock_condition, flags):
                    track.unlocked = True
                    newly_unlocked["tracks"].append(tid)

        return newly_unlocked

    # ---- Navigation ----

    def switch_tab(self, tab: GalleryTab) -> None:
        self._current_tab = tab
        self._selected_index = 0

    def set_category(self, category: str) -> None:
        self._current_category = category
        self._selected_index = 0

    def select_next(self) -> None:
        items = self._get_current_items()
        if items:
            self._selected_index = (self._selected_index + 1) % len(items)

    def select_previous(self) -> None:
        items = self._get_current_items()
        if items:
            self._selected_index = (self._selected_index - 1) % len(items)

    def select_item(self, index: int) -> bool:
        items = self._get_current_items()
        if 0 <= index < len(items):
            self._selected_index = index
            return True
        return False

    def get_selected_item(self) -> Optional[Any]:
        items = self._get_current_items()
        if 0 <= self._selected_index < len(items):
            return items[self._selected_index]
        return None

    def _get_current_items(self) -> List[Any]:
        """Get items for the current tab and category."""
        if self._current_tab == GalleryTab.SCENE:
            return self.get_scenes(category=None, unlocked_only=False)
        elif self._current_tab == GalleryTab.CG:
            cat = None if self._current_category == "all" else self._current_category
            return self.get_cgs(category=cat, unlocked_only=False)
        elif self._current_tab == GalleryTab.MUSIC:
            cat = None if self._current_category == "all" else self._current_category
            return self.get_tracks(category=cat, unlocked_only=False)
        return []

    # ---- Statistics ----

    def get_stats(self) -> Dict[str, Any]:
        """Get gallery completion statistics."""
        scene_total = len(self._scenes)
        scene_unlocked = len([s for s in self._scenes.values() if s.unlocked])
        cg_total = len(self._cgs)
        cg_unlocked = len([c for c in self._cgs.values() if c.unlocked])
        track_total = len(self._tracks)
        track_unlocked = len([t for t in self._tracks.values() if t.unlocked])

        return {
            "scenes": {"total": scene_total, "unlocked": scene_unlocked},
            "cgs": {"total": cg_total, "unlocked": cg_unlocked},
            "tracks": {"total": track_total, "unlocked": track_unlocked},
            "total": scene_total + cg_total + track_total,
            "total_unlocked": scene_unlocked + cg_unlocked + track_unlocked,
        }

    # ---- Serialization ----

    def get_state_dict(self) -> Dict[str, Any]:
        """Get unlock state for save/load."""
        return {
            "scenes": {sid: s.unlocked for sid, s in self._scenes.items()},
            "cgs": {cid: c.unlocked for cid, c in self._cgs.items()},
            "tracks": {tid: t.unlocked for tid, t in self._tracks.items()},
            "scene_play_counts": {sid: s.play_count for sid, s in self._scenes.items()},
        }

    def restore_from_dict(self, data: Dict[str, Any]) -> None:
        """Restore unlock state from save data."""
        for sid, unlocked in data.get("scenes", {}).items():
            if sid in self._scenes:
                self._scenes[sid].unlocked = unlocked

        for cid, unlocked in data.get("cgs", {}).items():
            if cid in self._cgs:
                self._cgs[cid].unlocked = unlocked

        for tid, unlocked in data.get("tracks", {}).items():
            if tid in self._tracks:
                self._tracks[tid].unlocked = unlocked

        for sid, count in data.get("scene_play_counts", {}).items():
            if sid in self._scenes:
                self._scenes[sid].play_count = count

    # ---- Internal ----

    def _evaluate_condition(self, condition: str, flags: Dict[str, Any]) -> bool:
        """Evaluate a simple flag condition."""
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

    # ---- Properties ----

    @property
    def current_tab(self) -> GalleryTab:
        return self._current_tab

    @property
    def current_category(self) -> str:
        return self._current_category

    @property
    def selected_index(self) -> int:
        return self._selected_index
