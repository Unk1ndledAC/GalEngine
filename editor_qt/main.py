#!/usr/bin/env python3
"""
GalEngine Editor (PyQt5) - Entry Point

Python version: 3.8.20
PyQt5 version: 5.x (installed in D:\Anaconda3\envs\mypytorch)
"""
import sys
import os

# Ensure the GalEngine project root is on sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QIcon
from PyQt5.QtCore import Qt

from editor_qt.main_window import MainWindow


def main():
    """Launch the GalEngine Editor."""
    # MUST be set before QApplication is created
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)

    app = QApplication(sys.argv)
    app.setApplicationName("GalEngine Editor")
    app.setApplicationVersion("0.1.0")

    # Global dark theme for dialogs / popups
    app.setStyleSheet("""
        QMessageBox {
            background-color: #1a1a2e;
            color: #e0e0e0;
        }
        QMessageBox QLabel {
            color: #e0e0e0;
            font-size: 13px;
            padding: 12px 8px;
        }
        QMessageBox QPushButton {
            background-color: #0f3460;
            color: #e0e0e0;
            border: 1px solid #1a1a4e;
            border-radius: 4px;
            padding: 6px 20px;
            min-width: 80px;
            font-size: 12px;
        }
        QMessageBox QPushButton:hover {
            background-color: #1a1a5e;
        }
        QMessageBox QPushButton:pressed {
            background-color: #e94560;
        }
        QFileDialog {
            background-color: #1a1a2e;
            color: #e0e0e0;
        }
        QFileDialog QLabel {
            color: #e0e0e0;
        }
        QFileDialog QLineEdit {
            background-color: #0a0a1a;
            color: #e0e0e0;
            border: 1px solid #0f3460;
            border-radius: 3px;
            padding: 4px 8px;
        }
        QFileDialog QTreeView, QFileDialog QListView {
            background-color: #0a0a1a;
            color: #e0e0e0;
            border: 1px solid #0f3460;
        }
        QFileDialog QTreeView::item:hover, QFileDialog QListView::item:hover {
            background-color: #0f3460;
        }
        QFileDialog QTreeView::item:selected, QFileDialog QListView::item:selected {
            background-color: #e94560;
        }
        QFileDialog QPushButton {
            background-color: #0f3460;
            color: #e0e0e0;
            border: 1px solid #1a1a4e;
            border-radius: 4px;
            padding: 6px 16px;
        }
        QFileDialog QPushButton:hover {
            background-color: #1a1a5e;
        }
        QInputDialog {
            background-color: #1a1a2e;
            color: #e0e0e0;
        }
        QInputDialog QLineEdit {
            background-color: #0a0a1a;
            color: #e0e0e0;
            border: 1px solid #0f3460;
            border-radius: 3px;
            padding: 4px 8px;
        }
        QInputDialog QPushButton {
            background-color: #0f3460;
            color: #e0e0e0;
            border: 1px solid #1a1a4e;
            border-radius: 4px;
            padding: 6px 16px;
        }
    """)

    # Set application icon if available
    icon_path = os.path.join(os.path.dirname(__file__), "resources", "assets", "ui", "icon.png")
    if os.path.isfile(icon_path):
        app.setWindowIcon(QIcon(icon_path))

    window = MainWindow()
    window.show()

    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
