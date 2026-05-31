"""
UI Layout System

Provides a flexible JSON-driven layout system for UI elements.
Developers can define UI element positions, sizes, styles, and visibility
through a JSON configuration file (ui-layout.json).

Features:
- Grid and anchor-based positioning
- Nested layout containers
- Theme/style inheritance
- Conditional visibility based on game state
"""

import json
import os
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum


class Anchor(Enum):
    """Position anchoring points."""
    TOP_LEFT = "top_left"
    TOP_CENTER = "top_center"
    TOP_RIGHT = "top_right"
    CENTER_LEFT = "center_left"
    CENTER = "center"
    CENTER_RIGHT = "center_right"
    BOTTOM_LEFT = "bottom_left"
    BOTTOM_CENTER = "bottom_center"
    BOTTOM_RIGHT = "bottom_right"


class SizeMode(Enum):
    """Size calculation mode."""
    FIXED = "fixed"         # Use explicit width/height
    FILL = "fill"           # Fill available space in parent
    HUG_CONTENTS = "hug"    # Size to fit contents


@dataclass
class UIRect:
    """A rectangular region in screen coordinates."""
    x: float = 0.0
    y: float = 0.0
    width: float = 0.0
    height: float = 0.0

    def contains_point(self, px: float, py: float) -> bool:
        return self.x <= px <= self.x + self.width and self.y <= py <= self.y + self.height

    @property
    def center(self) -> Tuple[float, float]:
        return (self.x + self.width / 2, self.y + self.height / 2)


@dataclass
class UIStyle:
    """Visual style for a UI element."""
    background_color: Optional[str] = None
    background_image: Optional[str] = None
    text_color: str = "#FFFFFF"
    text_size: int = 24
    font_name: str = "default"
    border_color: Optional[str] = None
    border_width: int = 0
    corner_radius: int = 0
    padding: Tuple[int, int, int, int] = (8, 8, 8, 8)  # top, right, bottom, left
    opacity: float = 1.0
    visible: bool = True

    def merge(self, other: "UIStyle") -> "UIStyle":
        """Merge another style on top of this one (other takes priority)."""
        result = UIStyle(
            background_color=other.background_color or self.background_color,
            background_image=other.background_image or self.background_image,
            text_color=other.text_color if other.text_color != "#FFFFFF" else self.text_color,
            text_size=other.text_size if other.text_size != 24 else self.text_size,
            font_name=other.font_name if other.font_name != "default" else self.font_name,
            border_color=other.border_color or self.border_color,
            border_width=other.border_width if other.border_width != 0 else self.border_width,
            corner_radius=other.corner_radius if other.corner_radius != 0 else self.corner_radius,
            padding=other.padding if other.padding != (8, 8, 8, 8) else self.padding,
            opacity=other.opacity if other.opacity != 1.0 else self.opacity,
            visible=other.visible,
        )
        return result


@dataclass
class UIElement:
    """Definition of a single UI element."""
    element_id: str
    element_type: str  # "text", "button", "image", "panel", "slider", "choice_group"
    rect: UIRect = field(default_factory=UIRect)
    style: UIStyle = field(default_factory=UIStyle)
    anchor: Anchor = Anchor.TOP_LEFT
    size_mode: SizeMode = SizeMode.FIXED
    visible_condition: Optional[str] = None  # Flag condition
    action: Optional[str] = None
    text: str = ""
    children: List["UIElement"] = field(default_factory=list)
    parent_id: Optional[str] = None
    meta: Dict[str, Any] = field(default_factory=dict)


class UILayout:
    """
    Manages the UI layout defined in ui-layout.json.

    Resolves element positions based on anchors, the screen size,
    and parent containers. Supports nested layouts and conditional
    visibility.
    """

    def __init__(self, screen_width: int = 1280, screen_height: int = 720):
        self._screen_width = screen_width
        self._screen_height = screen_height
        self._elements: Dict[str, UIElement] = {}
        self._themes: Dict[str, UIStyle] = {}
        self._layouts: Dict[str, List[str]] = {}  # layout_name -> element_ids

        # Built-in default theme
        self._themes["default"] = UIStyle(
            text_color="#FFFFFF",
            text_size=24,
        )

    # ---- Loading ----

    def load_from_file(self, filepath: str) -> bool:
        """
        Load UI layout from a JSON file.

        Expected JSON structure:
        {
            "screen": {"width": 1280, "height": 720},
            "themes": {
                "default": { ... },
                "dark": { ... }
            },
            "layouts": {
                "game_hud": ["textbox", "quick_menu", "choice_panel"],
                "main_menu": ["title_bg", "menu_buttons", "version_text"]
            },
            "elements": [
                {
                    "id": "textbox",
                    "type": "panel",
                    "x": 0, "y": 540, "width": 1280, "height": 180,
                    "theme": "default",
                    "style": { "background_color": "rgba(0,0,0,0.7)" }
                },
                ...
            ]
        }
        """
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"ERROR: Failed to load UI layout: {e}")
            return False

        # Screen size
        screen = data.get("screen", {})
        self._screen_width = screen.get("width", 1280)
        self._screen_height = screen.get("height", 720)

        # Themes
        for theme_name, theme_data in data.get("themes", {}).items():
            self._themes[theme_name] = self._parse_style(theme_data)

        # Elements
        for elem_data in data.get("elements", []):
            element = self._parse_element(elem_data)
            self._elements[element.element_id] = element

        # Layouts (groups of elements)
        for layout_name, elem_ids in data.get("layouts", {}).items():
            self._layouts[layout_name] = elem_ids if isinstance(elem_ids, list) else []

        # Resolve parent-child relationships
        self._resolve_hierarchy()

        return True

    def load_from_dict(self, data: Dict[str, Any]) -> bool:
        """Load UI layout from a dictionary (same structure as JSON file)."""
        screen = data.get("screen", {})
        self._screen_width = screen.get("width", 1280)
        self._screen_height = screen.get("height", 720)

        for theme_name, theme_data in data.get("themes", {}).items():
            self._themes[theme_name] = self._parse_style(theme_data)

        for elem_data in data.get("elements", []):
            element = self._parse_element(elem_data)
            self._elements[element.element_id] = element

        for layout_name, elem_ids in data.get("layouts", {}).items():
            self._layouts[layout_name] = elem_ids if isinstance(elem_ids, list) else []

        self._resolve_hierarchy()
        return True

    # ---- Query ----

    def get_element(self, element_id: str) -> Optional[UIElement]:
        """Get a UI element by ID."""
        return self._elements.get(element_id)

    def get_elements(self, element_ids: List[str]) -> List[UIElement]:
        """Get multiple UI elements by ID."""
        return [self._elements[eid] for eid in element_ids if eid in self._elements]

    def get_layout(self, layout_name: str) -> List[UIElement]:
        """Get all elements in a named layout group."""
        elem_ids = self._layouts.get(layout_name, [])
        return self.get_elements(elem_ids)

    def get_visible_elements(
        self,
        layout_name: Optional[str] = None,
        flags: Optional[Dict[str, Any]] = None,
    ) -> List[UIElement]:
        """
        Get all visible elements in a layout, filtered by conditions.

        Args:
            layout_name: Optional layout group to query.
            flags: Current game flags for condition evaluation.

        Returns:
            List of visible UIElement objects.
        """
        if layout_name:
            elements = self.get_layout(layout_name)
        else:
            elements = list(self._elements.values())

        visible = []
        for elem in elements:
            if not elem.style.visible:
                continue
            if elem.visible_condition and flags:
                if not self._evaluate_condition(elem.visible_condition, flags):
                    continue
            visible.append(elem)

        return visible

    def get_all_elements(self) -> Dict[str, UIElement]:
        """Get all registered UI elements."""
        return self._elements.copy()

    def get_screen_size(self) -> Tuple[int, int]:
        return (self._screen_width, self._screen_height)

    # ---- Position Resolution ----

    def resolve_position(self, element: UIElement, parent_rect: Optional[UIRect] = None) -> UIRect:
        """
        Resolve an element's final on-screen rectangle.

        Takes into account the element's anchor, parent container,
        and the screen dimensions.
        """
        if parent_rect is None:
            # Root element: position relative to screen
            parent_rect = UIRect(0, 0, self._screen_width, self._screen_height)

        # Calculate anchor offset
        anchor_x, anchor_y = self._get_anchor_offset(element.anchor, parent_rect)

        # Calculate final position
        x = anchor_x + element.rect.x
        y = anchor_y + element.rect.y

        # Calculate size
        width = element.rect.width
        height = element.rect.height

        if element.size_mode == SizeMode.FILL:
            width = parent_rect.width - element.rect.x
            height = parent_rect.height - element.rect.y
        elif element.size_mode == SizeMode.HUG_CONTENTS:
            # In real implementation, calculate based on content
            pass

        return UIRect(x=x, y=y, width=width, height=height)

    def resolve_all_positions(
        self,
        layout_name: Optional[str] = None,
    ) -> Dict[str, UIRect]:
        """
        Resolve positions for all elements in a layout.

        Returns:
            Dict mapping element_id -> resolved UIRect.
        """
        elements = self.get_layout(layout_name) if layout_name else list(self._elements.values())
        resolved = {}

        for elem in elements:
            parent_rect = None
            if elem.parent_id and elem.parent_id in self._elements:
                parent = self._elements[elem.parent_id]
                parent_rect = self.resolve_position(parent)
            resolved[elem.element_id] = self.resolve_position(elem, parent_rect)

        return resolved

    # ---- Modification ----

    def set_element_style(self, element_id: str, **style_kwargs) -> bool:
        """
        Update style properties for an element.

        Example:
            layout.set_element_style("textbox", background_color="rgba(0,0,0,0.8)")
        """
        if element_id not in self._elements:
            return False

        element = self._elements[element_id]
        for key, value in style_kwargs.items():
            if hasattr(element.style, key):
                setattr(element.style, key, value)
        return True

    def set_element_visibility(self, element_id: str, visible: bool) -> bool:
        """Show or hide a UI element."""
        if element_id not in self._elements:
            return False
        self._elements[element_id].style.visible = visible
        return True

    def add_element(self, element: UIElement) -> None:
        """Add or replace a UI element."""
        self._elements[element.element_id] = element

    def remove_element(self, element_id: str) -> bool:
        """Remove a UI element."""
        if element_id in self._elements:
            del self._elements[element_id]
            return True
        return False

    # ---- Internal ----

    def _parse_element(self, data: Dict[str, Any]) -> UIElement:
        """Parse a UI element from JSON data."""
        element_id = data.get("id", "")
        element_type = data.get("type", "panel")

        rect = UIRect(
            x=data.get("x", 0),
            y=data.get("y", 0),
            width=data.get("width", 100),
            height=data.get("height", 100),
        )

        # Apply theme
        theme_name = data.get("theme", "default")
        base_style = self._themes.get(theme_name, self._themes.get("default", UIStyle()))
        element_style = self._parse_style(data.get("style", {}))
        style = base_style.merge(element_style)

        # Anchor
        anchor_str = data.get("anchor", "top_left")
        try:
            anchor = Anchor(anchor_str)
        except ValueError:
            anchor = Anchor.TOP_LEFT

        # Size mode
        size_mode_str = data.get("size_mode", "fixed")
        try:
            size_mode = SizeMode(size_mode_str)
        except ValueError:
            size_mode = SizeMode.FIXED

        # Children
        children = [self._parse_element(c) for c in data.get("children", [])]

        return UIElement(
            element_id=element_id,
            element_type=element_type,
            rect=rect,
            style=style,
            anchor=anchor,
            size_mode=size_mode,
            visible_condition=data.get("visible_condition"),
            action=data.get("action"),
            text=data.get("text", ""),
            children=children,
            parent_id=data.get("parent_id"),
            meta=data.get("meta", {}),
        )

    def _parse_style(self, data: Dict[str, Any]) -> UIStyle:
        """Parse style properties from JSON data."""
        padding_tuple = (8, 8, 8, 8)
        padding = data.get("padding")
        if isinstance(padding, list) and len(padding) == 4:
            padding_tuple = tuple(padding)
        elif isinstance(padding, (int, float)):
            padding_tuple = (int(padding),) * 4

        return UIStyle(
            background_color=data.get("background_color"),
            background_image=data.get("background_image"),
            text_color=data.get("text_color", "#FFFFFF"),
            text_size=data.get("text_size", 24),
            font_name=data.get("font_name", "default"),
            border_color=data.get("border_color"),
            border_width=data.get("border_width", 0),
            corner_radius=data.get("corner_radius", 0),
            padding=padding_tuple,
            opacity=data.get("opacity", 1.0),
            visible=data.get("visible", True),
        )

    def _resolve_hierarchy(self) -> None:
        """Resolve parent-child relationships between elements."""
        for element in self._elements.values():
            for child in element.children:
                child.parent_id = element.element_id
                if child.element_id not in self._elements:
                    self._elements[child.element_id] = child

    def _get_anchor_offset(self, anchor: Anchor, parent_rect: UIRect) -> Tuple[float, float]:
        """Get the (x, y) offset for an anchor point within a parent rect."""
        offsets = {
            Anchor.TOP_LEFT: (parent_rect.x, parent_rect.y),
            Anchor.TOP_CENTER: (parent_rect.x + parent_rect.width / 2, parent_rect.y),
            Anchor.TOP_RIGHT: (parent_rect.x + parent_rect.width, parent_rect.y),
            Anchor.CENTER_LEFT: (parent_rect.x, parent_rect.y + parent_rect.height / 2),
            Anchor.CENTER: (parent_rect.x + parent_rect.width / 2, parent_rect.y + parent_rect.height / 2),
            Anchor.CENTER_RIGHT: (parent_rect.x + parent_rect.width, parent_rect.y + parent_rect.height / 2),
            Anchor.BOTTOM_LEFT: (parent_rect.x, parent_rect.y + parent_rect.height),
            Anchor.BOTTOM_CENTER: (parent_rect.x + parent_rect.width / 2, parent_rect.y + parent_rect.height),
            Anchor.BOTTOM_RIGHT: (parent_rect.x + parent_rect.width, parent_rect.y + parent_rect.height),
        }
        return offsets.get(anchor, (parent_rect.x, parent_rect.y))

    def _evaluate_condition(self, condition: str, flags: Dict[str, Any]) -> bool:
        """Evaluate a simple flag condition."""
        if not condition:
            return True
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


# Convenience: Load layout from a project's ui-layout.json
def load_layout_from_project(project_loader, screen_width: int = 1280, screen_height: int = 720) -> Optional[UILayout]:
    """
    Load the UI layout from a project's ui-layout.json configuration.

    Args:
        project_loader: ProjectLoader instance.
        screen_width, screen_height: Default screen dimensions.
    """
    layout_config = project_loader.project_data.get("ui", {})
    layout_path = layout_config.get("layout")
    layout = UILayout(screen_width, screen_height)

    if layout_path:
        import os
        full_path = os.path.join(project_loader.project_root, layout_path)
        if os.path.isfile(full_path):
            layout.load_from_file(full_path)
            return layout

    # Load default layout from the built-in schema
    default_data = layout_config.get("elements")
    if default_data:
        layout.load_from_dict({"elements": default_data})
        return layout

    return layout
