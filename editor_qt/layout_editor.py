"""
GalEngine Editor - UI Layout Editor (PyQt5)

Visual editor for positioning UI elements
(textbox, name box, menu button, etc.).

Python: 3.8.20  |  PyQt5: 5.x
"""
from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout
from PyQt5.QtWidgets import QGraphicsView, QGraphicsScene
from PyQt5.QtWidgets import QGraphicsRectItem, QGraphicsTextItem, QPushButton
from PyQt5.QtGui import QBrush, QColor, QPen
from PyQt5.QtCore import Qt, QRectF, pyqtSignal


ELEMENT_COLORS = {
    "textbox": QColor("#16213e"),
    "namebox": QColor("#0f3460"),
    "menu_button": QColor("#e94560"),
    "save_button": QColor("#4488cc"),
}


class LayoutEditor(QWidget):
    """
    UI Layout Editor panel.

    Shows a canvas with draggable UI element rectangles.
    Left panel inside the center stacked widget.
    """

    elementSelected = pyqtSignal(str)   # element id

    def __init__(self, parent=None):
        super().__init__(parent)
        self.elements = []   # list of dict: {id, type, x, y, w, h}
        self.selected_id = None
        self._build_ui()
        self._load_demo()

    # ------------------------------------------------------------------ #
    #  Public
    # ------------------------------------------------------------------ #

    def refresh(self, project_path=None):
        """Reload layout from ui-layout.json."""
        import os, json
        self.elements.clear()
        if project_path:
            layout_path = os.path.join(project_path, "ui-layout.json")
            if os.path.isfile(layout_path):
                with open(layout_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for elem_id, elem_data in data.get("elements", {}).items():
                    self.elements.append({
                        "id": elem_id,
                        "type": elem_data.get("type", "panel"),
                        "x": elem_data.get("x", 100),
                        "y": elem_data.get("y", 100),
                        "w": elem_data.get("width", 200),
                        "h": elem_data.get("height", 100),
                    })
        if not self.elements:
            self._load_demo()
        self._render()

    # ------------------------------------------------------------------ #
    #  Build UI
    # ------------------------------------------------------------------ #

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        # Top bar
        top_bar = QWidget()
        top_bar.setFixedHeight(36)
        top_bar.setStyleSheet("background: #0f3460; border-bottom: 1px solid #0a0a1a;")
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(8, 4, 8, 4)

        label = QPushButton("Layout Editor - Drag elements to reposition")
        label.setStyleSheet("color: #e94560; font-weight: bold; border: none; background: transparent;")
        top_layout.addWidget(label)
        top_layout.addStretch()
        layout.addWidget(top_bar)

        # Graphics view (canvas)
        self.scene = QGraphicsScene()
        self.view = QGraphicsView(self.scene)
        self.view.setStyleSheet("background: #0a0a1a; border: none;")
        self.view.setAlignment(Qt.AlignCenter)
        self.view.setDragMode(QGraphicsView.RubberBandDrag)
        layout.addWidget(self.view)

    # ------------------------------------------------------------------ #
    #  Render
    # ------------------------------------------------------------------ #

    def _render(self):
        self.scene.clear()
        # Draw canvas background
        self.scene.addRect(
            0, 0, 1280, 720,
            QPen(Qt.NoPen), QBrush(QColor("#0a0a1a")),
        )
        # Resolution label
        res_label = self.scene.addText("1280 x 720 (preview)")
        res_label.setDefaultTextColor(QColor("#222222"))
        res_label.setPos(500, 350)

        # Draw elements
        for elem in self.elements:
            color = ELEMENT_COLORS.get(elem["type"], QColor("#16213e"))
            rect = QGraphicsRectItem(elem["x"], elem["y"], elem["w"], elem["h"])
            rect.setBrush(QBrush(color))
            rect.setPen(QPen(QColor("#0f3460"), 2))
            rect.setFlags(
                QGraphicsRectItem.ItemIsSelectable |
                QGraphicsRectItem.ItemIsMovable
            )
            rect.setData(0, elem["id"])
            self.scene.addItem(rect)

            txt = QGraphicsTextItem(elem["id"], rect)
            txt.setDefaultTextColor(QColor("#cccccc"))
            txt.setPos(elem["x"] + 4, elem["y"] + 4)

        self.scene.setSceneRect(0, 0, 1280, 720)
        self.view.fitInView(QRectF(0, 0, 1280, 720), Qt.KeepAspectRatio)

    def _load_demo(self):
        """Load demo layout elements when no project is open."""
        self.elements = [
            {"id": "textbox",    "type": "textbox",    "x": 100, "y": 500, "w": 1080, "h": 200},
            {"id": "namebox",    "type": "namebox",    "x": 100, "y": 460, "w": 300,  "h": 40},
            {"id": "menu_button", "type": "menu_button", "x": 1100, "y": 20,  "w": 160,  "h": 40},
        ]

    # ------------------------------------------------------------------ #
    #  Events
    # ------------------------------------------------------------------ #

    def resizeEvent(self, event):
        self.view.fitInView(QRectF(0, 0, 1280, 720), Qt.KeepAspectRatio)
        super().resizeEvent(event)
