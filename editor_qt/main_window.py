"""
GalEngine Editor - Main Window (PyQt5)

QMainWindow subclass that assembles all editor panels:
- Left: ProjectPanel + AssetPanel (tabbed)
- Center: SceneEditor / FlowchartEditor / LayoutEditor (stacked)
- Right: PropertyPanel
- Bottom: TimelinePanel
- Top: ToolBar

Python: 3.8.20  |  PyQt5: 5.x
"""
import os
import json
import shutil

from PyQt5.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QSplitter, QTabWidget, QLabel, QStatusBar, QToolBar,
    QAction, QFileDialog, QMessageBox, QStackedWidget,
)
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QIcon, QKeySequence

from editor_qt.toolbar import ToolBar
from editor_qt.project_panel import ProjectPanel
from editor_qt.scene_editor import SceneEditor
from editor_qt.flowchart_editor import FlowchartEditor
from editor_qt.layout_editor import LayoutEditor
from editor_qt.timeline_panel import TimelinePanel
from editor_qt.property_panel import PropertyPanel
from editor_qt.asset_manager import AssetManager
from editor_qt.settings_sync import SettingsSync


class MainWindow(QMainWindow):
    """
    Main window for GalEngine Editor (PyQt5 version).

    Layout:
        +--[ToolBar]-------------------------------+
        |  [Project] | [Scene/Flow/Layout] | [Props]  |
        |  (Left)    | (Center)              | (Right)|
        +-----------|-------------------------|--------+
        |  [Timeline]                              |
        +------------------------------------------+
        |  [StatusBar]                             |
        +------------------------------------------+
    """

    def __init__(self):
        super().__init__()
        self.setWindowTitle("GalEngine Editor v0.1.0 - PyQt5")
        self.resize(1400, 850)

        # --- State ---
        self.current_project_path = None
        self.current_mode = "scene"   # "scene" | "flowchart" | "layout"

        # --- Managers ---
        self.asset_manager = AssetManager()
        self.settings_sync = SettingsSync()

        # --- Build UI ---
        self._create_central_widget()
        self._create_toolbar()
        self._create_statusbar()
        self._create_dock_panels()

        # --- Post-init ---
        self._apply_dark_theme()
        self._connect_signals()

    # ------------------------------------------------------------------ #
    #  UI Assembly
    # ------------------------------------------------------------------ #

    def _create_central_widget(self):
        """Create the central stacked widget (scene/flowchart/layout)."""
        self.central_stack = QStackedWidget()

        self.scene_editor = SceneEditor(self.asset_manager)
        self.flowchart_editor = FlowchartEditor()
        self.layout_editor = LayoutEditor()

        self.central_stack.addWidget(self.scene_editor)
        self.central_stack.addWidget(self.flowchart_editor)
        self.central_stack.addWidget(self.layout_editor)

        self.setCentralWidget(self.central_stack)

    def _create_toolbar(self):
        """Create the top toolbar."""
        self.toolbar = ToolBar(self)
        self.addToolBar(Qt.TopToolBarArea, self.toolbar)
        self.toolbar.modeChanged.connect(self._on_mode_changed)
        self.toolbar.actionTriggered.connect(self._on_toolbar_action)

    def _create_statusbar(self):
        """Create the bottom status bar."""
        sb = QStatusBar()
        self.setStatusBar(sb)
        sb.showMessage("Ready - No project loaded")

    def _create_dock_panels(self):
        """
        Create left (project) and right (property) dock panels
        using QSplitter for a modern look.
        """
        # Left panel: Project + Assets (tabbed)
        self.project_panel = ProjectPanel(self.asset_manager)
        self.project_panel.sceneSelected.connect(self._on_scene_selected)
        self.project_panel.projectLoaded.connect(self._on_project_loaded)

        # Right panel: Properties
        self.property_panel = PropertyPanel()
        # Connect scene_editor command selection
        self.scene_editor.commandSelected.connect(self._on_command_selected)

        # Wrap in splitter (left | center | right)
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.addWidget(self.project_panel)
        left_widget.setMinimumWidth(240)
        left_widget.setMaximumWidth(350)

        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.addWidget(self.property_panel)
        right_widget.setMinimumWidth(250)
        right_widget.setMaximumWidth(350)

        # Main horizontal splitter
        self.main_splitter = QSplitter(Qt.Horizontal)
        self.main_splitter.addWidget(left_widget)
        self.main_splitter.addWidget(self.central_stack)
        self.main_splitter.addWidget(right_widget)
        self.main_splitter.setStretchFactor(0, 0)   # left fixed-ish
        self.main_splitter.setStretchFactor(1, 1)   # center expands
        self.main_splitter.setStretchFactor(2, 0)   # right fixed-ish

        # Set as central (replace stacked widget temporarily)
        # Actually, we need the timeline at bottom too.
        # Use a VBox layout with timeline at bottom.
        central_container = QWidget()
        central_layout = QVBoxLayout(central_container)
        central_layout.setContentsMargins(0, 0, 0, 0)
        central_layout.addWidget(self.main_splitter, 1)

        # Timeline at bottom
        self.timeline_panel = TimelinePanel()
        self.timeline_panel.commandSelected.connect(self._on_timeline_command_selected)
        self.scene_editor.commandChanged.connect(
            self.timeline_panel.refresh
        )
        central_layout.addWidget(self.timeline_panel, 0)

        self.setCentralWidget(central_container)

    def _apply_dark_theme(self):
        """Apply a dark theme stylesheet."""
        dark_ss = """
            QMainWindow { background: #1a1a2e; color: #e0e0e0; }
            QStatusBar { background: #0f3460; color: #888888; padding: 4px; }
            QTabWidget::pane { border: 1px solid #0f3460; background: #16213e; }
            QTabBar::tab { background: #0f3460; color: #888888;
                         padding: 6px 16px; border-radius: 0; }
            QTabBar::tab:selected { background: #16213e; color: #e94560; }
            QTreeWidget { background: #16213e; color: #e0e0e0;
                               border: 1px solid #0f3460; }
            QTreeWidget::item:selected { background: #e94560; color: #ffffff; }
            QListWidget { background: #16213e; color: #e0e0e0;
                              border: 1px solid #0f3460; }
            QListWidget::item:selected { background: #e94560; }
            QScrollArea { background: #16213e; border: 1px solid #0f3460; }
            QToolBar { background: #16213e; border-bottom: 1px solid #0f3460;
                          padding: 4px; spacing: 4px; }
            QToolButton { color: #e0e0e0; background: #0f3460;
                           border: 1px solid #1a1a4e; border-radius: 4px;
                           padding: 4px 12px; }
            QToolButton:checked { border-color: #e94560; }
            QToolButton:hover { background: #1a1a5e; }
            QLabel { color: #e0e0e0; }
            QGroupBox { color: #888888; border: 1px solid #0f3460;
                          border-radius: 4px; margin-top: 8px; }
            QGroupBox::title { subcontrol-origin: margin; left: 8px; padding: 0 4px; }
            QLineEdit, QTextEdit, QComboBox {
                background: #0f3460; color: #e0e0e0;
                border: 1px solid #1a1a4e; border-radius: 4px; padding: 4px;
            }
            QSpinBox { background: #0f3460; color: #e0e0e0;
                       border: 1px solid #1a1a4e; border-radius: 4px; }
            QCheckBox { color: #e0e0e0; }
            QSplitter::handle { background: #0f3460; }
            QSplitter::handle:hover { background: #e94560; }
        """
        self.setStyleSheet(dark_ss)

    # ------------------------------------------------------------------ #
    #  Signals & Slots
    # ------------------------------------------------------------------ #

    def _connect_signals(self):
        """Connect child widget signals."""
        pass  # expanded as modules are implemented

    def _on_mode_changed(self, mode: str):
        """Switch center widget based on mode."""
        self.current_mode = mode
        if mode == "scene":
            self.central_stack.setCurrentWidget(self.scene_editor)
        elif mode == "flowchart":
            self.central_stack.setCurrentWidget(self.flowchart_editor)
        elif mode == "layout":
            self.central_stack.setCurrentWidget(self.layout_editor)
        self.statusBar().showMessage(f"Mode: {mode}")

    def _on_toolbar_action(self, action: str):
        """Handle toolbar button clicks."""
        if action == "new_project":
            self._new_project()
        elif action == "open_project":
            self._open_project()
        elif action == "save":
            self._save_project()
        elif action == "compile":
            if not self.current_project_path:
                QMessageBox.warning(self, "No Project", "Please open or create a project first.")
                return
            self._compile_project()
        elif action == "preview":
            if not self.current_project_path:
                QMessageBox.warning(self, "No Project", "Please open or create a project first.")
                return
            self._toggle_preview()
        elif action == "undo":
            self.scene_editor.undo()
        elif action == "redo":
            self.scene_editor.redo()
        elif action == "add_scene":
            self._add_new_scene()
        elif action == "add_dialogue":
            self.scene_editor.add_command("dialogue")
        elif action == "add_choice":
            self.scene_editor.add_command("choice")

    def _on_scene_selected(self, scene_id: str):
        """Load a scene into the scene editor, or create a new scene."""
        if scene_id == "__new_scene__":
            self._add_new_scene()
            return
        self._current_scene_id = scene_id
        self.scene_editor.load_scene(scene_id)
        self.timeline_panel.set_commands(self.scene_editor.commands)
        self.statusBar().showMessage(f"Scene: {scene_id}")

    def _on_command_selected(self, index: int):
        """Relay scene editor command selection to property panel."""
        if 0 <= index < len(self.scene_editor.commands):
            self.property_panel.load_command(index, self.scene_editor.commands[index])

    def _on_timeline_command_selected(self, index: int):
        """Relay timeline command selection to property panel."""
        if 0 <= index < len(self.timeline_panel.commands):
            self.property_panel.load_command(index, self.timeline_panel.commands[index])

    def _on_project_loaded(self, project_path: str):
        """Handle project load — relay to scene/flowchart refresh."""
        self.scene_editor.refresh()
        self.flowchart_editor.refresh(project_path)
        self.timeline_panel.refresh()

    # ------------------------------------------------------------------ #
    #  Scene Operations
    # ------------------------------------------------------------------ #

    def _add_new_scene(self):
        """Add a new empty scene to the project (creates scripts/<id>.json)."""
        if not self.current_project_path:
            QMessageBox.warning(self, "No Project", "Please open or create a project first.")
            return

        # Generate a unique scene id
        import uuid
        scene_id = f"scene_{uuid.uuid4().hex[:6]}"
        scripts_dir = os.path.join(self.current_project_path, "scripts")
        os.makedirs(scripts_dir, exist_ok=True)
        scene_path = os.path.join(scripts_dir, f"{scene_id}.json")

        # Write empty scene template
        template = {"commands": [], "metadata": {"scene_id": scene_id}}
        with open(scene_path, "w", encoding="utf-8") as f:
            json.dump(template, f, indent=2, ensure_ascii=False)

        # Refresh project tree
        self.project_panel.load_project(self.current_project_path)
        self._current_scene_id = scene_id
        self.scene_editor.commands = []
        self.scene_editor._render_placeholder_scene()
        self.timeline_panel.refresh()
        self.statusBar().showMessage(f"New scene: {scene_id}")

    # ------------------------------------------------------------------ #
    #  File Operations
    # ------------------------------------------------------------------ #

    def _new_project(self):
        """Create a new GalEngine project directory with default structure.

        Project layout created::

            <project_name>/
              settings.json          ← auto-generated
              scripts/              ← scene .json / .md files
              assets/
                backgrounds/
                sprites/
                cgs/
                audio/
                ui/
                fonts/

        Assets are NOT populated -- the developer imports them later
        via the Asset panel "+" buttons or copies them manually.
        """
        path = QFileDialog.getSaveFileName(
            self, "New Project", "", "GalEngine Project (*.gpkg)"
        )[0]
        if not path:
            return

        try:
            # Determine project dir (strip .gpkg extension if present)
            if path.endswith(".gpkg"):
                project_dir = path[:-5]
                project_name = os.path.splitext(os.path.basename(path))[0]
            else:
                project_dir = path
                project_name = os.path.basename(path)

            os.makedirs(project_dir, exist_ok=True)

            # Create directory skeleton
            for sub in ["scripts", "assets/backgrounds", "assets/sprites", "assets/cgs",
                         "assets/audio", "assets/ui", "assets/fonts"]:
                os.makedirs(os.path.join(project_dir, sub), exist_ok=True)

            # Auto-generate initial settings.json
            self.settings_sync.project_path = project_dir
            self.settings_sync.queue_change("project.name", project_name)
            self.settings_sync.save(project_dir)

            # Open it
            self.current_project_path = project_dir
            self.asset_manager.load_project(project_dir)
            self.project_panel.load_project(project_dir)
            self.timeline_panel.refresh()
            self.flowchart_editor.refresh(project_dir)
            self.setWindowTitle(f"GalEngine Editor v0.1.0 - {project_name}")
            self.statusBar().showMessage(f"New project: {project_dir}")

        except Exception as e:
            import traceback
            QMessageBox.critical(
                self, "New Project Failed",
                f"Failed to create project:\n\n{str(e)}\n\n"
                f"Details:\n{traceback.format_exc()}"
            )

    def _open_project(self):
        """Open an existing GalEngine project directory."""
        path = QFileDialog.getExistingDirectory(
            self, "Open Project", ""
        )
        if path:
            # Load project into asset manager
            if not self.asset_manager.load_project(path):
                QMessageBox.warning(
                    self, "Invalid Project",
                    f"The selected directory does not appear to be a valid "
                    f"GalEngine project.\n\n"
                    f"Expected: settings.json at the project root.\n\n"
                    f"Selected: {path}"
                )
                return
            self.current_project_path = path
            self.project_panel.load_project(path)
            self.settings_sync.load(path)
            self.timeline_panel.refresh()
            self.flowchart_editor.refresh(path)
            self.setWindowTitle(f"GalEngine Editor v0.1.0 - {os.path.basename(path)}")
            self.statusBar().showMessage(f"Project: {path}")

    def _save_project(self):
        """Save current project.

        Steps:
          1. Write current scene commands to scripts/{scene_id}.json
          2. Auto-generate settings.json from the project directory structure
             (including asset file mappings)
          3. Asset files are already on disk (imported via panel "+" buttons);
             no extra copy is needed because they live inside the project.
        """
        if not self.current_project_path:
            # No project open -> prompt to open or create one
            reply = QMessageBox.question(
                self, "No Project",
                "No project is currently open.\n\n"
                "Would you like to open an existing project?",
                QMessageBox.Yes | QMessageBox.No,
            )
            if reply == QMessageBox.Yes:
                self._open_project()
            return

        try:
            # 1. Save current scene commands
            current_scene_id = getattr(self, '_current_scene_id', None)
            if current_scene_id and self.scene_editor.commands:
                scripts_dir = os.path.join(self.current_project_path, "scripts")
                os.makedirs(scripts_dir, exist_ok=True)
                scene_path = os.path.join(scripts_dir, f"{current_scene_id}.json")
                existing = {}
                if os.path.isfile(scene_path):
                    with open(scene_path, "r", encoding="utf-8") as f:
                        existing = json.load(f)
                existing["commands"] = self.scene_editor.commands
                with open(scene_path, "w", encoding="utf-8") as f:
                    json.dump(existing, f, indent=2, ensure_ascii=False)

            # 2. Auto-generate settings.json from full directory scan
            self.settings_sync.save(self.current_project_path)

            self.statusBar().showMessage("Project saved.")
        except Exception as e:
            QMessageBox.critical(
                self, "Save Failed",
                f"Failed to save project:\n{str(e)}"
            )

    def _compile_project(self):
        """Compile project into distributable game."""
        from editor_qt.compile_manager import CompileManager
        CompileManager().compile(self.current_project_path, self)

    def _toggle_preview(self):
        """Toggle real-time preview panel."""
        from editor_qt.preview_manager import PreviewManager
        PreviewManager().toggle(self.current_project_path, self)

    # ------------------------------------------------------------------ #
    #  Keyboard Shortcuts
    # ------------------------------------------------------------------ #

    def keyPressEvent(self, event):
        """Handle keyboard shortcuts."""
        if event.matches(QKeySequence.Undo):
            self._on_toolbar_action("undo")
        elif event.matches(QKeySequence.Redo):
            self._on_toolbar_action("redo")
        elif event.key() == Qt.Key_S and event.modifiers() == Qt.ControlModifier:
            self._on_toolbar_action("save")
        elif event.key() == Qt.Key_O and event.modifiers() == Qt.ControlModifier:
            self._on_toolbar_action("open_project")
        elif event.key() == Qt.Key_N and event.modifiers() == Qt.ControlModifier:
            self._on_toolbar_action("new_project")
        else:
            super().keyPressEvent(event)
