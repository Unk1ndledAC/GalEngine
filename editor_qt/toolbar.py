"""
GalEngine Editor - ToolBar (PyQt5)

Top toolbar with mode switching and action buttons.

Python: 3.8.20  |  PyQt5: 5.x
"""
from PyQt5.QtWidgets import QToolBar, QAction, QComboBox, QLabel, QWidget, QHBoxLayout
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QIcon


class ToolBar(QToolBar):
    """
    Top toolbar with:
    - Compile / Preview / Save buttons
    - Scene / Flowchart / Layout mode switch
    - Add Scene / Add Dialogue / Add Choice buttons
    - Undo / Redo buttons
    """

    #: str = "scene" | "flowchart" | "layout"
    modeChanged = pyqtSignal(str)
    #: str = action name
    actionTriggered = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__("Toolbar", parent)
        self.setMovable(False)
        self.setStyleSheet(self._stylesheet())
        self._build_widgets()

    # ------------------------------------------------------------------ #
    #  Build
    # ------------------------------------------------------------------ #

    def _build_widgets(self):
        # --- Group 1: File operations ---
        self._add_action("new_project", "New Project", "Ctrl+N")
        self._add_action("open_project", "Open Project", "Ctrl+O")
        self._add_action("save", "Save", "Ctrl+S")
        self.addSeparator()

        # --- Group 2: Build / Run ---
        self._add_action("compile", "Compile", "Ctrl+B")
        self._add_action("preview", "Preview", "Ctrl+P")
        self.addSeparator()

        # --- Group 3: Mode Switch ---
        self._add_action("mode_scene", "Scene", "Ctrl+1", checkable=True, checked=True)
        self._add_action("mode_flowchart", "Flowchart", "Ctrl+2", checkable=True)
        self._add_action("mode_layout", "Layout", "Ctrl+3", checkable=True)
        self.addSeparator()

        # --- Group 4: Add ---
        self._add_action("add_scene", "Add Scene", "")
        self._add_action("add_dialogue", "+ Dialogue", "")
        self._add_action("add_choice", "+ Choice", "")
        self.addSeparator()

        # --- Group 5: Undo/Redo ---
        self._add_action("undo", "Undo", "Ctrl+Z")
        self._add_action("redo", "Redo", "Ctrl+Y")
        self.addSeparator()

        # --- Mode combo (alternative switcher) ---
        self.mode_combo = QComboBox()
        self.mode_combo.addItems(["Scene", "Flowchart", "Layout"])
        self.mode_combo.currentTextChanged.connect(self._on_combo_changed)
        self.addWidget(QLabel("Mode: "))
        self.addWidget(self.mode_combo)

        # Stretch spacer
        spacer = QWidget()
        spacer.setFixedWidth(20)
        self.addWidget(spacer)

    def _add_action(self, action_id, text, shortcut, checkable=False, checked=False):
        action = QAction(text, self)
        action.setObjectName(action_id)
        if shortcut:
            action.setShortcut(shortcut)
        if checkable:
            action.setCheckable(True)
            action.setChecked(checked)
        action.triggered.connect(lambda checked, a=action_id: self._on_action(a, checked))
        self.addAction(action)
        return action

    # ------------------------------------------------------------------ #
    #  Slots
    # ------------------------------------------------------------------ #

    def _on_action(self, action_id, checked):
        # Emit for mode buttons (exclusive check)
        if action_id == "mode_scene":
            self._set_mode("scene")
        elif action_id == "mode_flowchart":
            self._set_mode("flowchart")
        elif action_id == "mode_layout":
            self._set_mode("layout")
        else:
            self.actionTriggered.emit(action_id)

    def _set_mode(self, mode):
        # Update checkbuttons exclusively
        for aid, m in [
            ("mode_scene", "scene"),
            ("mode_flowchart", "flowchart"),
            ("mode_layout", "layout"),
        ]:
            act = self.findChild(QAction, aid)
            if act:
                act.setChecked(m == mode)
        # Update combo
        idx = {"scene": 0, "flowchart": 1, "layout": 2}.get(mode, 0)
        self.mode_combo.blockSignals(True)
        self.mode_combo.setCurrentIndex(idx)
        self.mode_combo.blockSignals(False)
        # Emit
        self.modeChanged.emit(mode)

    def _on_combo_changed(self, text):
        mode_map = {"Scene": "scene", "Flowchart": "flowchart", "Layout": "layout"}
        self._set_mode(mode_map.get(text, "scene"))

    # ------------------------------------------------------------------ #
    #  Style
    # ------------------------------------------------------------------ #

    def _stylesheet(self):
        return """
            QToolBar {
                background: #16213e;
                border-bottom: 1px solid #0f3460;
                padding: 4px;
                spacing: 4px;
            }
            QToolButton {
                color: #e0e0e0;
                background: #0f3460;
                border: 1px solid #1a1a4e;
                border-radius: 4px;
                padding: 5px 12px;
                font-size: 12px;
            }
            QToolButton:checked {
                border-color: #e94560;
                background: #2a1a4e;
            }
            QToolButton:hover { background: #1a1a5e; }
            QComboBox {
                background: #0f3460;
                color: #e0e0e0;
                border: 1px solid #1a1a4e;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
            }
            QLabel { color: #888888; font-size: 12px; }
        """
