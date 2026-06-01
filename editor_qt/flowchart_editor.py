"""
GalEngine Editor - Flowchart Editor (PyQt5)

Flowchart visualization widget.
Renders scene nodes and branch edges.

Python: 3.8.20  |  PyQt5: 5.x
"""
from PyQt5.QtWidgets import QWidget, QGraphicsView, QGraphicsScene, QGraphicsItem
from PyQt5.QtWidgets import QGraphicsRectItem, QGraphicsTextItem, QMenu
from PyQt5.QtGui import QBrush, QColor, QPen, QPainter
from PyQt5.QtCore import Qt, QRectF, pyqtSignal, QPointF


NODE_COLORS = {
    "start": "#4CAF50",
    "end": "#f44336",
    "choice": "#f9800",
    "scene": "#0f3460",
    "chapter": "#3a4a5a",
}


class FlowchartEditor(QWidget):
    """
    Flowchart visualization panel.

    Shows scene nodes and branch connections.
    Left panel inside the center stacked widget.
    """

    nodeSelected = pyqtSignal(str)   # node id

    def __init__(self, parent=None):
        super().__init__(parent)
        self.nodes = []   # list of dict: {id, label, type, x, y}
        self.edges = []   # list of dict: {from, to}
        self.selected_node = None
        self._build_ui()
        self._load_demo()

    # ------------------------------------------------------------------ #
    #  Public
    # ------------------------------------------------------------------ #

    def refresh(self, project_path=None):
        """Reload flowchart from project settings.json."""
        import os, json
        self.nodes.clear()
        self.edges.clear()

        if project_path:
            settings_path = os.path.join(project_path, "settings.json")
            if os.path.isfile(settings_path):
                with open(settings_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                scenes = data.get("scenes", {})
                i = 0
                for sid in scenes:
                    self.nodes.append({
                        "id": sid,
                        "label": sid,
                        "type": "scene",
                        "x": 60 + (i % 4) * 220,
                        "y": 40 + (i // 4) * 120,
                    })
                    i += 1

        if not self.nodes:
            self._load_demo()

        self._render()

    # ------------------------------------------------------------------ #
    #  Build UI
    # ------------------------------------------------------------------ #

    def _build_ui(self):
        from PyQt5.QtWidgets import QVBoxLayout
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        self.scene = QGraphicsScene()
        self.view = QGraphicsView(self.scene)
        self.view.setStyleSheet("background: #0a0a1a; border: none;")
        self.view.setDragMode(QGraphicsView.RubberBandDrag)
        layout.addWidget(self.view)

        self._render()

    # ------------------------------------------------------------------ #
    #  Render
    # ------------------------------------------------------------------ #

    def _render(self):
        self.scene.clear()

        # Draw edges first (as simple lines)
        node_map = {n["id"]: n for n in self.nodes}
        for edge in self.edges:
            src = node_map.get(edge.get("from"))
            dst = node_map.get(edge.get("to"))
            if src and dst:
                pen = QPen(QColor("#0f3460"), 2)
                self.scene.addLine(
                    src["x"] + 60, src["y"] + 20,
                    dst["x"] + 60, dst["y"] + 20,
                    pen,
                )

        # Draw nodes
        for node in self.nodes:
            brush_color = QColor(NODE_COLORS.get(node.get("type"), "#16213e"))
            pen_color = QColor(NODE_COLORS.get(node.get("type"), "#0f3460"))
            rect = QGraphicsRectItem(
                node["x"], node["y"], 120, 40
            )
            rect.setBrush(QBrush(brush_color))
            rect.setPen(QPen(pen_color, 2))
            rect.setFlags(QGraphicsItem.ItemIsSelectable | QGraphicsItem.ItemIsMovable)
            rect.setData(0, node["id"])
            self.scene.addItem(rect)

            label = QGraphicsTextItem(node.get("label", ""), rect)
            label.setDefaultTextColor(QColor("#e0e0e0"))
            label.setPos(node["x"] + 4, node["y"] + 10)

        self.scene.setSceneRect(0, 0, 1200, 800)

    def _load_demo(self):
        """Load demo nodes when no project is open."""
        self.nodes = [
            {"id": "_start", "label": "Start", "type": "start", "x": 60, "y": 40},
            {"id": "prologue", "label": "Prologue", "type": "scene", "x": 60, "y": 120},
            {"id": "chapter1", "label": "Chapter 1", "type": "scene", "x": 60, "y": 200},
            {"id": "choice_a", "label": "Choice A", "type": "choice", "x": 200, "y": 200},
            {"id": "_end", "label": "End", "type": "end", "x": 60, "y": 320},
        ]
        self.edges = [
            {"from": "_start", "to": "prologue"},
            {"from": "prologue", "to": "chapter1"},
            {"from": "chapter1", "to": "choice_a"},
            {"from": "chapter1", "to": "_end"},
        ]
