"""
Flowchart System

Manages the game flowchart data model and rendering.
The flowchart is a tree structure representing chapters, scenes, and branches.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class NodeType(Enum):
    CHAPTER = "chapter"
    SCENE = "scene"
    CHOICE = "choice"
    BRANCH_START = "branch_start"
    BRANCH_END = "branch_end"
    ENDING = "ending"


class NodeStatus(Enum):
    LOCKED = "locked"
    UNLOCKED = "unlocked"
    CURRENT = "current"
    COMPLETED = "completed"


@dataclass
class FlowchartNode:
    """A single node in the flowchart tree."""
    id: str
    name: str
    type: NodeType
    scene_id: Optional[str] = None
    status: NodeStatus = NodeStatus.LOCKED
    children: List["FlowchartNode"] = field(default_factory=list)
    parent: Optional["FlowchartNode"] = None
    position: tuple = (0, 0)  # (x, y) in layout coordinates
    metadata: Dict[str, Any] = field(default_factory=dict)


class Flowchart:
    """
    Builds and manages the game flowchart structure.

    The flowchart is constructed from:
    - settings.json: branches structure
    - scene scripts: labels and choices
    - runtime state: visited scenes, current position
    """

    def __init__(self, orientation: str = "vertical"):
        self.orientation = orientation  # "vertical" or "horizontal"
        self.root: Optional[FlowchartNode] = None
        self._node_map: Dict[str, FlowchartNode] = {}
        self._route_flowcharts: Dict[str, FlowchartNode] = {}  # Per-character sub-flowcharts

    def build_from_project(self, project_data: dict, scene_ids: List[str]) -> None:
        """
        Build the flowchart tree from project configuration.

        Args:
            project_data: The full settings.json data.
            scene_ids: List of all scene IDs.
        """
        self.root = FlowchartNode(
            id="root",
            name="Game Start",
            type=NodeType.CHAPTER,
            status=NodeStatus.UNLOCKED,
        )
        self._node_map["root"] = self.root

        branches = project_data.get("branches", {})
        common_scenes = [
            sid for sid in scene_ids
            if sid not in {
                b.get("entry_scene", "")
                for b in branches.values()
            }
        ]

        # Build common route
        common_root = FlowchartNode(
            id="common_route",
            name="Common Route",
            type=NodeType.CHAPTER,
            status=NodeStatus.UNLOCKED,
            parent=self.root,
        )
        self.root.children.append(common_root)
        self._node_map["common_route"] = common_root

        # Add scenes to common route (simplified - real impl would parse scene flow)
        for sid in common_scenes[:5]:  # Limit for display
            node = FlowchartNode(
                id=f"scene_{sid}",
                name=sid,
                type=NodeType.SCENE,
                scene_id=sid,
                status=NodeStatus.LOCKED,
                parent=common_root,
            )
            common_root.children.append(node)
            self._node_map[f"scene_{sid}"] = node

        # Build character routes
        for route_id, route_data in branches.items():
            route_node = FlowchartNode(
                id=f"route_{route_id}",
                name=route_data.get("name", route_id),
                type=NodeType.BRANCH_START,
                status=NodeStatus.LOCKED,
                parent=common_root,
            )
            common_root.children.append(route_node)
            self._node_map[f"route_{route_id}"] = route_node
            self._route_flowcharts[route_id] = route_node

    def update_node_status(self, node_id: str, status: NodeStatus) -> None:
        """Update the status of a flowchart node."""
        if node_id in self._node_map:
            self._node_map[node_id].status = status

    def mark_scene_visited(self, scene_id: str) -> None:
        """Mark a scene as visited/completed."""
        node_id = f"scene_{scene_id}"
        if node_id in self._node_map:
            self._node_map[node_id].status = NodeStatus.COMPLETED

    def set_current_scene(self, scene_id: str) -> None:
        """Set the current scene node."""
        node_id = f"scene_{scene_id}"
        if node_id in self._node_map:
            self._node_map[node_id].status = NodeStatus.CURRENT

    def get_route_flowchart(self, route_id: str) -> Optional[FlowchartNode]:
        """Get the sub-flowchart for a specific character route."""
        return self._route_flowcharts.get(route_id)

    def to_dict(self) -> dict:
        """Convert the flowchart to a dict for serialization/rendering."""
        def node_to_dict(node: FlowchartNode) -> dict:
            return {
                "id": node.id,
                "name": node.name,
                "type": node.type.value,
                "scene_id": node.scene_id,
                "status": node.status.value,
                "children": [node_to_dict(c) for c in node.children],
            }
        return node_to_dict(self.root) if self.root else {}
