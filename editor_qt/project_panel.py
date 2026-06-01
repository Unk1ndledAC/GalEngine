"""
GalEngine Editor - Project Panel (PyQt5)

Left sidebar with two tabs:
1. Project Tree  - shows scenes/scripts/assets in the project
2. Asset Panel - shows draggable asset thumbnails

PyQt5 only.  Python: 3.8.20
"""
import os
import shutil

from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QTreeWidget, QTreeWidgetItem,
    QTabWidget, QListWidget, QListWidgetItem, QLabel,
    QAbstractItemView, QMenu, QPushButton, QFileDialog,
    QHBoxLayout, QMessageBox,
)
from PyQt5.QtCore import QMimeData, Qt, pyqtSignal
from PyQt5.QtGui import QIcon, QDrag


class ProjectPanel(QTabWidget):
    """
    Left sidebar with two tabs.

    Signals:
        sceneSelected(str)  - user clicked a scene in the tree
        projectLoaded(str) - a project was opened
    """

    sceneSelected = pyqtSignal(str)
    projectLoaded = pyqtSignal(str)

    def __init__(self, asset_manager, parent=None):
        super().__init__(parent)
        self.asset_manager = asset_manager
        self.project_root = None
        self.setTabPosition(QTabWidget.West)
        self.setStyleSheet(self._stylesheet())
        self._build_widgets()

    # ------------------------------------------------------------------ #
    #  Public
    # ------------------------------------------------------------------ #

    def load_project(self, project_path: str):
        """Load a GalEngine project and populate the tree."""
        self.project_root = project_path
        self._populate_tree()
        self._populate_assets()
        self.projectLoaded.emit(project_path)

    # ------------------------------------------------------------------ #
    #  Build
    # ------------------------------------------------------------------ #

    def _build_widgets(self):
        # Tab 1: Project Tree
        tree_container = QWidget()
        tree_layout = QVBoxLayout(tree_container)
        tree_layout.setContentsMargins(0, 0, 0, 0)
        tree_layout.setSpacing(2)

        # Refresh button header
        tree_header = QHBoxLayout()
        tree_header.addStretch()
        refresh_btn = QPushButton("⟳ Refresh")
        refresh_btn.setFixedHeight(22)
        refresh_btn.setToolTip("Refresh project tree and asset lists")
        refresh_btn.setStyleSheet("""
            QPushButton {
                background-color: #0f3460; color: #e0e0e0;
                border: 1px solid #1a1a4e; border-radius: 3px;
                padding: 2px 8px; font-size: 10px;
            }
            QPushButton:hover { background-color: #1a1a5e; }
        """)
        refresh_btn.clicked.connect(self._full_refresh)
        tree_header.addWidget(refresh_btn)
        tree_layout.addLayout(tree_header)

        self.tree = QTreeWidget()
        self.tree.setHeaderLabel("Project")
        self.tree.setDragEnabled(False)
        self.tree.setSelectionMode(QAbstractItemView.SingleSelection)
        self.tree.itemDoubleClicked.connect(self._on_tree_double_click)
        self.tree.setContextMenuPolicy(Qt.CustomContextMenu)
        self.tree.customContextMenuRequested.connect(self._on_tree_context_menu)
        tree_layout.addWidget(self.tree)

        self.addTab(tree_container, "Project")

        # Tab 2: Asset Panel
        asset_widget = QWidget()
        asset_layout = QVBoxLayout(asset_widget)
        asset_layout.setContentsMargins(4, 4, 4, 4)

        # --- Backgrounds ---
        bg_header = QHBoxLayout()
        bg_header.addWidget(QLabel("Backgrounds"))
        bg_import_btn = QPushButton("+")
        bg_import_btn.setFixedSize(22, 22)
        bg_import_btn.setToolTip("Import background image from disk")
        bg_import_btn.clicked.connect(lambda: self._import_asset("backgrounds"))
        bg_header.addWidget(bg_import_btn)
        asset_layout.addLayout(bg_header)

        self.bg_list = QListWidget()
        self.bg_list.setDragEnabled(True)
        self.bg_list.itemDoubleClicked.connect(
            lambda item: self._on_asset_double_click("background", item.text())
        )
        asset_layout.addWidget(self.bg_list)

        # --- Sprites ---
        sprite_header = QHBoxLayout()
        sprite_header.addWidget(QLabel("Sprites"))
        sprite_import_btn = QPushButton("+")
        sprite_import_btn.setFixedSize(22, 22)
        sprite_import_btn.setToolTip("Import sprite image from disk")
        sprite_import_btn.clicked.connect(lambda: self._import_asset("sprites"))
        sprite_header.addWidget(sprite_import_btn)
        asset_layout.addLayout(sprite_header)

        self.sprite_list = QListWidget()
        self.sprite_list.setDragEnabled(True)
        self.sprite_list.itemDoubleClicked.connect(
            lambda item: self._on_asset_double_click("sprite", item.text())
        )
        asset_layout.addWidget(self.sprite_list)

        # --- Audio ---
        audio_header = QHBoxLayout()
        audio_header.addWidget(QLabel("Audio"))
        audio_import_btn = QPushButton("+")
        audio_import_btn.setFixedSize(22, 22)
        audio_import_btn.setToolTip("Import audio file from disk")
        audio_import_btn.clicked.connect(lambda: self._import_asset("audio"))
        audio_header.addWidget(audio_import_btn)
        asset_layout.addLayout(audio_header)

        self.audio_list = QListWidget()
        self.audio_list.setDragEnabled(True)
        self.audio_list.itemDoubleClicked.connect(
            lambda item: self._on_asset_double_click("audio", item.text())
        )
        asset_layout.addWidget(self.audio_list)

        self.addTab(asset_widget, "Assets")

    # ------------------------------------------------------------------ #
    #  Populate
    # ------------------------------------------------------------------ #

    def _populate_tree(self):
        self.tree.clear()
        if not self.project_root:
            return
        root = QTreeWidgetItem(self.tree, [os.path.basename(self.project_root)])
        root.setExpanded(True)

        # settings.json
        settings_path = os.path.join(self.project_root, "settings.json")
        if os.path.isfile(settings_path):
            QTreeWidgetItem(root, ["settings.json"])

        # scripts/ directory
        scripts_dir = os.path.join(self.project_root, "scripts")
        if os.path.isdir(scripts_dir):
            scripts_node = QTreeWidgetItem(root, ["scripts/"])
            for fname in sorted(os.listdir(scripts_dir)):
                if fname.endswith((".json", ".md")):
                    QTreeWidgetItem(scripts_node, [fname])

        # assets/ directory (one level)
        assets_dir = os.path.join(self.project_root, "assets")
        if os.path.isdir(assets_dir):
            assets_node = QTreeWidgetItem(root, ["assets/"])
            for sub in sorted(os.listdir(assets_dir)):
                sub_path = os.path.join(assets_dir, sub)
                if os.path.isdir(sub_path):
                    QTreeWidgetItem(assets_node, [sub + "/"])


    def _populate_assets(self):
        self.bg_list.clear()
        self.sprite_list.clear()
        self.audio_list.clear()

        if not self.project_root:
            return

        assets_base = os.path.join(self.project_root, "assets")

        bg_dir = os.path.join(assets_base, "backgrounds")
        if os.path.isdir(bg_dir):
            for f in sorted(os.listdir(bg_dir)):
                if f.endswith((".png", ".jpg", ".jpeg", ".webp")):
                    self.bg_list.addItem(QListWidgetItem(f))

        sprite_dir = os.path.join(assets_base, "sprites")
        if os.path.isdir(sprite_dir):
            for f in sorted(os.listdir(sprite_dir)):
                if f.endswith((".png", ".jpg", ".jpeg", ".webp")):
                    self.sprite_list.addItem(QListWidgetItem(f))

        audio_dir = os.path.join(assets_base, "audio")
        if os.path.isdir(audio_dir):
            for f in sorted(os.listdir(audio_dir)):
                if f.endswith((".ogg", ".mp3", ".wav")):
                    self.audio_list.addItem(QListWidgetItem(f))

    # ------------------------------------------------------------------ #
    #  Slots
    # ------------------------------------------------------------------ #

    def _full_refresh(self):
        """Refresh both the project tree and the asset lists."""
        self._populate_tree()
        self._populate_assets()

    def _on_tree_double_click(self, item, column):
        text = item.text(0)
        if text.endswith(".json") or text.endswith(".md"):
            # Extract scene id from filename
            scene_id = text.rsplit(".", 1)[0]
            self.sceneSelected.emit(scene_id)

    def _on_tree_context_menu(self, pos):
        """Context menu for project tree — shows on any item or empty space."""
        menu = QMenu(self)
        refresh_action = menu.addAction("↻ Refresh Tree")
        newly_action = menu.addAction("+ New Scene")
        action = menu.exec_(self.tree.mapToGlobal(pos))
        if action == refresh_action:
            self._full_refresh()
        elif action == newly_action:
            # Emit signal so main_window creates a new scene
            self.sceneSelected.emit("__new_scene__")

    def _on_asset_double_click(self, asset_type, filename):
        """Handle asset double-click (e.g. preview or auto-fill)."""
        pass  # Can be connected to scene editor in main_window

    def _import_asset(self, asset_type: str):
        """Import an asset file from disk into the project's assets directory."""
        if not self.project_root:
            QMessageBox.warning(self, "No Project", "Please open a project first.")
            return

        # Pick appropriate file filter
        if asset_type == "audio":
            file_filter = "Audio Files (*.ogg *.mp3 *.wav);;All Files (*)"
        else:
            file_filter = "Image Files (*.png *.jpg *.jpeg *.webp *.bmp);;All Files (*)"

        files, _ = QFileDialog.getOpenFileNames(
            self, f"Import {asset_type.capitalize()}", "", file_filter
        )
        if not files:
            return

        dest_dir = os.path.join(self.project_root, "assets", asset_type)
        os.makedirs(dest_dir, exist_ok=True)

        imported = 0
        for src in files:
            dest = os.path.join(dest_dir, os.path.basename(src))
            if os.path.isfile(dest):
                reply = QMessageBox.question(
                    self, "Overwrite?",
                    f"'{os.path.basename(src)}' already exists. Overwrite?",
                    QMessageBox.Yes | QMessageBox.No,
                )
                if reply != QMessageBox.Yes:
                    continue
            shutil.copy2(src, dest)
            imported += 1

        if imported:
            self._full_refresh()
            # Also update asset manager
            self.asset_manager.project_root = self.project_root
            self.asset_manager.load_project(self.project_root)

    # ------------------------------------------------------------------ #
    #  Style
    # ------------------------------------------------------------------ #

    def _stylesheet(self):
        return """
            QTabWidget::pane {
                border: 1px solid #0f3460;
                background: #16213e;
            }
            QTabBar::tab {
                background: #0f3460;
                color: #888888;
                padding: 4px 12px;
                border-radius: 0px;
            }
            QTabBar::tab:selected {
                background: #16213e;
                color: #e94560;
            }
            QTreeWidget {
                background: #16213e;
                color: #e0e0e0;
                border: none;
            }
            QTreeWidget::item:hover { background: #0f3460; }
            QTreeWidget::item:selected {
                background: #e94560;
                color: #ffffff;
            }
            QListWidget {
                background: #16213e;
                color: #e0e0e0;
                border: 1px solid #0f3460;
                font-size: 11px;
            }
            QListWidget::item:hover { background: #0f3460; }
            QListWidget::item:selected {
                background: #e94560;
                color: #ffffff;
            }
            QLabel {
                color: #888888;
                font-size: 11px;
                padding: 4px 4px 2px 4px;
            }
        """
