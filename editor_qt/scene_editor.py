"""
GalEngine Editor - Scene Editor (PyQt5)

Center canvas for scene editing.
Renders background + sprites + dialogue preview.

Python: 3.8.20  |  PyQt5: 5.x
"""
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QScrollArea, QFrame, QGraphicsView, QGraphicsScene,
    QGraphicsPixmapItem, QGraphicsTextItem, QMenu,
)
from PyQt5.QtGui import QPixmap, QImage, QPainter, QBrush, QColor, QFont, QPen
from PyQt5.QtCore import Qt, QRectF, pyqtSignal, QPointF


class SceneEditor(QWidget):
    """
    Center canvas for scene editing.

    Shows: background image, sprite placeholders, dialogue preview.
    Signals:
        commandSelected(int)  - user picked a command in the timeline
        commandChanged()    - timeline data changed
    """

    commandSelected = pyqtSignal(int)
    commandChanged = pyqtSignal()

    def __init__(self, asset_manager, parent=None):
        super().__init__(parent)
        self.asset_manager = asset_manager
        self.commands = []        # list of command dicts
        self.selected_index = -1
        self.current_bg = None
        self.sprites = {}        # {name: QGraphicsPixmapItem}
        self._build_ui()

    # ------------------------------------------------------------------ #
    #  Public
    # ------------------------------------------------------------------ #

    def load_scene(self, scene_id: str):
        """Load a scene (JSON) into the editor."""
        import os, json
        if not self.asset_manager.project_root:
            return
        scripts_dir = os.path.join(self.asset_manager.project_root, "scripts")
        path = os.path.join(scripts_dir, f"{scene_id}.json")
        if not os.path.isfile(path):
            path = os.path.join(scripts_dir, f"{scene_id}.md")
        if not os.path.isfile(path):
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.commands = data.get("commands", [])
            self.selected_index = -1
            self._render_scene()
        except Exception:
            pass

    def add_command(self, cmd_type: str):
        """Add a new command to the timeline."""
        from copy import deepcopy
        templates = {
            "dialogue": {
                "type": "dialogue",
                "data": {"character": "alice", "text": "New dialogue", "display_name": "Alice"},
            },
            "narration": {
                "type": "narration",
                "data": {"text": "New narration"},
            },
            "choice": {
                "type": "choice",
                "data": {"prompt": "Choose:", "choices": [{"text": "Option 1", "target": ""}]},
            },
            "background": {
                "type": "background",
                "data": {"image": "bg_classroom.png", "transition": "fade"},
            },
            "show_sprite": {
                "type": "show_sprite",
                "data": {"character": "alice", "sprite": "alice_normal.png",
                           "position": "center", "transition": "fade"},
            },
            "bgm": {
                "type": "bgm",
                "data": {"file": "bgm_everyday.ogg", "loop": True, "fade_in": 1.0},
            },
        }
        cmd = templates.get(cmd_type, {"type": cmd_type, "data": {}})
        self.commands.append(cmd)
        self.selected_index = len(self.commands) - 1
        self.commandChanged.emit()
        self._render_scene()

    def refresh(self):
        self._render_scene()

    def undo(self):
        # simplified: reset last change
        pass

    def redo(self):
        pass

    # ------------------------------------------------------------------ #
    #  Build UI
    # ------------------------------------------------------------------ #

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        # Top toolbar
        top_bar = QWidget()
        top_bar.setFixedHeight(36)
        top_bar.setStyleSheet("background: #0f3460; border-bottom: 1px solid #0a0a1a;")
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(8, 4, 8, 4)

        self.mode_label = QLabel("Scene Editor")
        self.mode_label.setStyleSheet("color: #e94560; font-weight: bold; font-size: 13px;")
        top_layout.addWidget(self.mode_label)
        top_layout.addStretch()

        layout.addWidget(top_bar)

        # Graphics view (canvas)
        self.scene = QGraphicsScene()
        self.view = QGraphicsView(self.scene)
        self.view.setStyleSheet("background: #0a0a1a; border: none;")
        self.view.setAlignment(Qt.AlignCenter)
        self.view.setDragMode(QGraphicsView.RubberBandDrag)
        layout.addWidget(self.view)

        # Dialogue preview box (always drawn as overlay)
        self._render_placeholder_scene()

    # ------------------------------------------------------------------ #
    #  Render
    # ------------------------------------------------------------------ #

    def _render_placeholder_scene(self):
        """Render placeholder scene (no real game engine yet)."""
        self.scene.clear()
        self.sprites.clear()

        # Background placeholder
        bg_rect = self.scene.addRect(
            0, 0, 1280, 720,
            QPen(Qt.NoPen), QBrush(QColor("#1a1a2e"))
        )
        self.scene.addText("Canvas - 1280x720\nDrop assets or use toolbar") \
            .setDefaultTextColor(QColor("#444444"))

        # Placeholder dialogue box
        dbg = self.scene.addRect(
            100, 500, 1080, 200,
            QPen(Qt.NoPen), QBrush(QColor(0, 0, 0, 180))
        )
        dbg.setZValue(10)
        txt = self.scene.addText("Dialogue preview area\n(load a scene to begin)")
        txt.setDefaultTextColor(QColor("#aaaaaa"))
        txt.setPos(120, 540)
        txt.setZValue(11)

        self.scene.setSceneRect(0, 0, 1280, 720)
        self.view.fitInView(self.scene.sceneRect(), Qt.KeepAspectRatio)

    def _render_scene(self):
        """Render scene from self.commands."""
        self.scene.clear()
        self.sprites.clear()

        current_bg = None
        active_sprites = []

        # Walk commands and apply the last meaningful state
        for i, cmd in enumerate(self.commands):
            t = cmd.get("type", "")
            d = cmd.get("data", {})
            if t == "background":
                current_bg = d.get("image", "")
            elif t == "show_sprite":
                active_sprites.append(d)
            elif t == "hide_sprite":
                name = d.get("character", "")
                active_sprites = [s for s in active_sprites if s.get("character") != name]

        # Draw background
        bg_color = QColor("#1a1a2e")
        if current_bg:
            bg_color = QColor("#2a2a3e")
        self.scene.addRect(
            0, 0, 1280, 720,
            QPen(Qt.NoPen), QBrush(bg_color)
        )
        if current_bg:
            label = self.scene.addText(f"BG: {current_bg}\n(1280x720)")
            label.setDefaultTextColor(QColor("#555555"))
            label.setPos(400, 300)

        # Draw sprites
        for s in active_sprites:
            x = {"left": 100, "center": 460, "right": 820}.get(s.get("position", "center"), 460)
            rect = self.scene.addRect(
                x, 80, 360, 720,
                QPen(Qt.NoPen), QBrush(QColor("#e94560"))
            )
            rect.setOpacity(0.3)
            name_label = self.scene.addText(s.get("sprite", "sprite"))
            name_label.setDefaultTextColor(QColor("#cccccc"))
            name_label.setPos(x + 40, 660)

        # Draw dialogue
        if self.commands:
            last_text = ""
            last_name = ""
            for cmd in reversed(self.commands):
                if cmd.get("type") in ("dialogue", "narration"):
                    last_text = cmd.get("data", {}).get("text", "")[:80]
                    last_name = cmd.get("data", {}).get("display_name", "")
                    break
            dbg = self.scene.addRect(
                100, 500, 1080, 200,
                QPen(Qt.NoPen), QBrush(QColor(0, 0, 0, 180))
            )
            dbg.setZValue(10)
            if last_name:
                name_txt = self.scene.addText(last_name)
                name_txt.setDefaultTextColor(QColor("#e94560"))
                name_txt.setPos(120, 510)
                name_txt.setZValue(11)
            body_txt = self.scene.addText(last_text or "(no dialogue)")
            body_txt.setDefaultTextColor(QColor("#e0e0e0"))
            body_txt.setPos(120, 540)
            body_txt.setZValue(11)

        self.scene.setSceneRect(0, 0, 1280, 720)
        self.view.fitInView(self.scene.sceneRect(), Qt.KeepAspectRatio)

    # ------------------------------------------------------------------ #
    #  Events
    # ------------------------------------------------------------------ #

    def resizeEvent(self, event):
        self.view.fitInView(self.scene.sceneRect(), Qt.KeepAspectRatio)
        super().resizeEvent(event)
