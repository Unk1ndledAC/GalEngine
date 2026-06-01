"""
GalEngine Editor - Property Panel (PyQt5)

Right-side panel showing properties of the selected
command / node / layout element.

Python: 3.8.20  |  PyQt5: 5.x
"""
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QComboBox, QSpinBox,
    QTextEdit, QGroupBox, QFormLayout, QPushButton,
)
from PyQt5.QtCore import pyqtSignal, Qt


class PropertyPanel(QWidget):
    """
    Right property panel.

    Shows editable properties for the currently selected
    timeline command (dialogue / narration / choice / ...).
    """

    commandChanged = pyqtSignal(dict)   # updated command dict

    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_command = None
        self.current_index = -1
        self._build_ui()

    # ------------------------------------------------------------------ #
    #  Public
    # ------------------------------------------------------------------ #

    def load_command(self, index: int, command: dict):
        """Load a command's properties into the panel."""
        self.current_index = index
        self.current_command = command
        self._populate_fields(command)

    def clear(self):
        """Clear all fields."""
        self.current_command = None
        self.current_index = -1
        self._clear_fields()

    # ------------------------------------------------------------------ #
    #  Build UI
    # ------------------------------------------------------------------ #

    def _build_ui(self):
        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(8, 8, 8, 8)
        self.main_layout.setSpacing(8)

        # Title
        self.title_label = QLabel("No selection")
        self.title_label.setStyleSheet(
            "color: #888888; font-size: 11px; padding: 4px;"
        )
        self.main_layout.addWidget(self.title_label)

        # Scene properties group
        self.scene_group = self._create_scene_group()
        self.main_layout.addWidget(self.scene_group)

        # Element properties group
        self.elem_group = self._create_element_group()
        self.main_layout.addWidget(self.elem_group)

        # Layout properties group (hidden by default)
        self.layout_group = self._create_layout_group()
        self.layout_group.setVisible(False)
        self.main_layout.addWidget(self.layout_group)

        self.main_layout.addStretch()

        # Apply button
        self.apply_btn = QPushButton("Apply Changes")
        self.apply_btn.clicked.connect(self._on_apply)
        self.apply_btn.setStyleSheet(
            "background: #e94560; color: white;"
            "border-radius: 4px; padding: 6px;"
        )
        self.main_layout.addWidget(self.apply_btn)

    def _create_scene_group(self):
        group = QGroupBox("Scene Properties")
        form = QFormLayout(group)
        form.setVerticalSpacing(6)

        self.scene_id_edit = QLineEdit()
        form.addRow("Scene ID:", self.scene_id_edit)

        self.scene_name_edit = QLineEdit()
        form.addRow("Scene Name:", self.scene_name_edit)

        self.bg_combo = QComboBox()
        self.bg_combo.addItem("")
        self.bg_combo.addItems(["bg_classroom.png", "bg_corridor.png", "bg_sunset.png"])
        form.addRow("Background:", self.bg_combo)

        self.bgm_combo = QComboBox()
        self.bgm_combo.addItem("")
        self.bgm_combo.addItems(["bgm_everyday.ogg", "bgm_happy.ogg"])
        form.addRow("BGM:", self.bgm_combo)

        return group

    def _create_element_group(self):
        group = QGroupBox("Element Properties")
        form = QFormLayout(group)
        form.setVerticalSpacing(6)

        self.type_combo = QComboBox()
        self.type_combo.addItems(["dialogue", "narration", "choice", "background", "show_sprite", "bgm", "command"])
        self.type_combo.currentTextChanged.connect(self._on_type_changed)
        form.addRow("Type:", self.type_combo)

        self.char_combo = QComboBox()
        self.char_combo.addItem("")
        self.char_combo.addItems(["alice", "bob", "protagonist"])
        form.addRow("Character:", self.char_combo)

        self.text_edit = QTextEdit()
        self.text_edit.setMaximumHeight(80)
        form.addRow("Text:", self.text_edit)

        self.sprite_combo = QComboBox()
        self.sprite_combo.addItem("")
        self.sprite_combo.addItems(["alice_normal.png", "alice_smile.png", "bob_normal.png"])
        form.addRow("Sprite:", self.sprite_combo)

        self.voice_combo = QComboBox()
        self.voice_combo.addItem("")
        self.voice_combo.addItem("voice/alice_01.ogg")
        form.addRow("Voice:", self.voice_combo)

        self.trans_combo = QComboBox()
        self.trans_combo.addItems(["none", "fade", "crossfade", "dissolve", "slide"])
        form.addRow("Transition:", self.trans_combo)

        return group

    def _create_layout_group(self):
        group = QGroupBox("Layout Properties")
        form = QFormLayout(group)
        form.setVerticalSpacing(6)

        self.layout_id_edit = QLineEdit()
        form.addRow("ID:", self.layout_id_edit)

        self.anchor_combo = QComboBox()
        self.anchor_combo.addItems([
            "top-left", "top-center", "top-right",
            "middle-left", "middle-center", "middle-right",
            "bottom-left", "bottom-center", "bottom-right",
        ])
        form.addRow("Anchor:", self.anchor_combo)

        self.x_spin = QSpinBox()
        self.x_spin.setRange(0, 9999)
        form.addRow("X:", self.x_spin)

        self.y_spin = QSpinBox()
        self.y_spin.setRange(0, 9999)
        form.addRow("Y:", self.y_spin)

        self.w_spin = QSpinBox()
        self.w_spin.setRange(1, 9999)
        form.addRow("W:", self.w_spin)

        self.h_spin = QSpinBox()
        self.h_spin.setRange(1, 9999)
        form.addRow("H:", self.h_spin)

        self.visible_edit = QLineEdit()
        self.visible_edit.setPlaceholderText("flag_name == true")
        form.addRow("Visible If:", self.visible_edit)

        return group

    # ------------------------------------------------------------------ #
    #  Populate
    # ------------------------------------------------------------------ #

    def _populate_fields(self, command: dict):
        self.title_label.setText(f"Command #{self.current_index}")

        cmd_type = command.get("type", "dialogue")
        self.type_combo.setCurrentText(cmd_type)

        data = command.get("data", {})

        # Character
        char = data.get("character", "")
        self.char_combo.setCurrentText(char)

        # Text
        self.text_edit.setPlainText(data.get("text", ""))

        # Sprite
        sprite = data.get("sprite", "")
        self.sprite_combo.setCurrentText(sprite)

        # Voice
        voice = data.get("voice", "")
        self.voice_combo.setCurrentText(voice)

        # Transition
        trans = data.get("transition", "none")
        self.trans_combo.setCurrentText(trans)

    def _clear_fields(self):
        self.title_label.setText("No selection")
        self.type_combo.setCurrentIndex(0)
        self.char_combo.setCurrentIndex(0)
        self.text_edit.clear()
        self.sprite_combo.setCurrentIndex(0)
        self.voice_combo.setCurrentIndex(0)
        self.trans_combo.setCurrentIndex(0)

    # ------------------------------------------------------------------ #
    #  Slots
    # ------------------------------------------------------------------ #

    def _on_type_changed(self, text):
        """Show/hide fields based on command type."""
        pass  # Expand as needed

    def _on_apply(self):
        """Apply panel changes back to the command."""
        if not self.current_command:
            return
        data = self.current_command.setdefault("data", {})

        self.current_command["type"] = self.type_combo.currentText()
        data["character"] = self.char_combo.currentText()
        data["text"] = self.text_edit.toPlainText()
        data["sprite"] = self.sprite_combo.currentText()
        data["voice"] = self.voice_combo.currentText()
        data["transition"] = self.trans_combo.currentText()

        self.commandChanged.emit(self.current_command)

    # ------------------------------------------------------------------ #
    #  Style
    # ------------------------------------------------------------------ #

    def _stylesheet(self) -> str:
        return """
            QGroupBox {
                color: #888888;
                border: 1px solid #0f3460;
                border-radius: 4px;
                margin-top: 8px;
                font-size: 11px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 8px;
                padding: 0 4px;
            }
            QLineEdit, QTextEdit, QComboBox, QSpinBox {
                background: #0f3460;
                color: #e0e0e0;
                border: 1px solid #1a1a4e;
                border-radius: 4px;
                padding: 4px;
                font-size: 12px;
            }
            QLabel { color: #aaaaaa; font-size: 11px; }
            QPushButton {
                background: #0f3460;
                color: #e0e0e0;
                border: 1px solid #1a1a4e;
                border-radius: 4px;
                padding: 6px 12px;
            }
            QPushButton:hover { background: #1a1a5e; }
        """
