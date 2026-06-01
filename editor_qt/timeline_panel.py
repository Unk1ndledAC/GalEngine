"""
GalEngine Editor - Timeline Panel (PyQt5)

Bottom timeline showing scene commands in order.
Supports: select, delete, move up/down.

Python: 3.8.20  |  PyQt5: 5.x
"""
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout,
    QListWidget, QListWidgetItem, QPushButton, QLabel,
)
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont


class TimelinePanel(QWidget):
    """
    Bottom timeline panel.

    Shows commands (dialogue, narration, choice, etc.)
    and allows selection/reordering.

    Signals:
        commandSelected(int) - user selected a command index
    """

    commandSelected = pyqtSignal(int)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.commands = []   # list of command dicts
        self.selected_index = -1
        self._build_ui()

    # ------------------------------------------------------------------ #
    #  Public
    # ------------------------------------------------------------------ #

    def load_commands(self, commands: list):
        """Load command list and refresh the view."""
        self.commands = commands
        self.selected_index = -1
        self._refresh_list()

    def set_commands(self, commands: list):
        """Alias for load_commands — sync commands from scene editor."""
        self.load_commands(commands)

    def refresh(self):
        """Refresh the list from self.commands."""
        self._refresh_list()

    def select(self, index: int):
        """Programmatically select a command."""
        if 0 <= index < self.list_widget.count():
            self.list_widget.setCurrentRow(index)
            self.selected_index = index

    # ------------------------------------------------------------------ #
    #  Build UI
    # ------------------------------------------------------------------ #

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(4, 4, 4, 4)
        layout.setSpacing(4)

        # Top toolbar
        top_bar = QWidget()
        top_layout = QHBoxLayout(top_bar)
        top_layout.setContentsMargins(0, 0, 0, 0)
        top_layout.setSpacing(4)

        self.info_label = QLabel("Timeline: 0 commands")
        self.info_label.setStyleSheet("color: #888888; font-size: 11px;")
        top_layout.addWidget(self.info_label)
        top_layout.addStretch()

        btn_add = QPushButton("+")
        btn_add.setFixedSize(28, 28)
        btn_add.setToolTip("Add dialogue command")
        btn_add.clicked.connect(self._on_add)

        btn_del = QPushButton("-")
        btn_del.setFixedSize(28, 28)
        btn_del.setToolTip("Delete selected")
        btn_del.clicked.connect(self._on_delete)

        btn_up = QPushButton("↑")
        btn_up.setFixedSize(28, 28)
        btn_up.setToolTip("Move up")
        btn_up.clicked.connect(self._on_move_up)

        btn_down = QPushButton("↓")
        btn_down.setFixedSize(28, 28)
        btn_down.setToolTip("Move down")
        btn_down.clicked.connect(self._on_move_down)

        for btn in [btn_add, btn_del, btn_up, btn_down]:
            top_layout.addWidget(btn)
        top_layout.addStretch()

        self.mode_label = QLabel("Scene Mode")
        self.mode_label.setStyleSheet(
            "color: #555555; font-size: 10px; padding-right: 8px;"
        )
        top_layout.addWidget(self.mode_label)

        layout.addWidget(top_bar)

        # List widget (the actual timeline)
        self.list_widget = QListWidget()
        self.list_widget.setMaximumHeight(140)
        self.list_widget.setStyleSheet(self._list_stylesheet())
        self.list_widget.currentRowChanged.connect(self._on_row_changed)
        self.list_widget.itemDoubleClicked.connect(self._on_item_double_click)
        layout.addWidget(self.list_widget)

        self._refresh_list()

    # ------------------------------------------------------------------ #
    #  Refresh
    # ------------------------------------------------------------------ #

    def _refresh_list(self):
        self.list_widget.clear()
        for i, cmd in enumerate(self.commands):
            text = self._command_summary(cmd)
            item = QListWidgetItem(text)
            if i == self.selected_index:
                font = QFont()
                font.setBold(True)
                item.setFont(font)
            self.list_widget.addItem(item)

        total = len(self.commands)
        self.info_label.setText(f"Timeline: {total} commands")
        if self.selected_index >= 0 and self.selected_index < self.list_widget.count():
            self.list_widget.setCurrentRow(self.selected_index)

    def _command_summary(self, cmd: dict) -> str:
        """Return a short human-readable summary of a command."""
        t = cmd.get("type", "unknown")
        d = cmd.get("data", {})

        type_labels = {
            "dialogue":    "[Dialogue]  ",
            "narration":   "[Narration] ",
            "choice":      "[Choice]     ",
            "background":  "[BG]         ",
            "show_sprite": "[Sprite]     ",
            "hide_sprite": "[Hide Sprite] ",
            "bgm":         "[BGM]        ",
            "sfx":         "[SFX]        ",
            "command":      "[Cmd]        ",
        }
        prefix = type_labels.get(t, f"[{t}]         ")

        if t == "dialogue":
            char = d.get("display_name", d.get("character", "?"))
            text = d.get("text", "")[:40]
            return f"{prefix}{char}: {text}"
        elif t == "narration":
            return f"{prefix}{d.get('text', '')[:50]}"
        elif t == "choice":
            choices = d.get("choices", [])
            prompt = d.get("prompt", "")
            ChoiceText = " / ".join(c.get("text", "") for c in choices[:3])
            return f"{prefix}{prompt} [{ChoiceText}]"
        elif t == "background":
            return f"{prefix}{d.get('image', '?')}"
        elif t == "show_sprite":
            return f"{prefix}{d.get('sprite', '?')} @ {d.get('position', '?')}"
        elif t == "bgm":
            return f"{prefix}{d.get('file', '?')}"
        else:
            return f"{prefix}{str(d)[:50]}"

    # ------------------------------------------------------------------ #
    #  Slots
    # ------------------------------------------------------------------ #

    def _on_row_changed(self, row: int):
        self.selected_index = row
        self.commandSelected.emit(row)

    def _on_item_double_click(self, item):
        pass  # could open inline editor

    def _on_add(self):
        # Emits a simple default "dialogue" command
        from editor_qt.scene_editor import SceneEditor
        # This is a placeholder; real implementation connects to SceneEditor
        pass

    def _on_delete(self):
        if 0 <= self.selected_index < len(self.commands):
            del self.commands[self.selected_index]
            self.selected_index = max(-1, self.selected_index - 1)
            self._refresh_list()

    def _on_move_up(self):
        i = self.selected_index
        if i > 0:
            self.commands[i-1], self.commands[i] = self.commands[i], self.commands[i-1]
            self.selected_index = i - 1
            self._refresh_list()

    def _on_move_down(self):
        i = self.selected_index
        if 0 <= i < len(self.commands) - 1:
            self.commands[i], self.commands[i+1] = self.commands[i+1], self.commands[i]
            self.selected_index = i + 1
            self._refresh_list()

    # ------------------------------------------------------------------ #
    #  Style
    # ------------------------------------------------------------------ #

    def _list_stylesheet(self) -> str:
        return """
            QListWidget {
                background: #0a0a1a;
                border: 1px solid #0f3460;
                border-radius: 4px;
                color: #e0e0e0;
                font-size: 12px;
                padding: 2px;
            }
            QListWidget::item {
                padding: 4px 8px;
                border-bottom: 1px solid #0f3460;
            }
            QListWidget::item:selected {
                background: #e94560;
                color: #ffffff;
            }
            QListWidget::item:hover {
                background: #0f3460;
            }
            QPushButton {
                background: #0f3460;
                color: #e0e0e0;
                border: 1px solid #1a1a4e;
                border-radius: 4px;
                font-size: 11px;
            }
            QPushButton:hover { background: #1a1a5e; }
            QLabel { color: #888888; }
        """
