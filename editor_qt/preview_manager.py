"""
GalEngine Editor - Preview Manager (PyQt5)

Provides a popup preview panel showing the current scene
rendered as simple HTML.

Python: 3.8.20  |  PyQt5: 5.x
"""
import json
import os
from typing import Optional

from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel
from PyQt5.QtWidgets import QFrame, QSizePolicy
from PyQt5.QtCore import Qt, QUrl, pyqtSignal


PREVIEW_HTML_TEMPLATE = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Preview</title>
<style>
body {{ margin:0; padding:0; width:1280px; height:720px; overflow:hidden;
       font-family:"Microsoft YaHei", sans-serif; background: {bg_color}; }}
.bg {{ position:absolute; top:0; left:0; width:100%; height:100%; }}
.dialogue-box {{ position:absolute; bottom:20px; left:10%; width:80%;
       background: rgba(0,0,0,0.75); border: 1px solid #555;
       border-radius: 8px; padding: 16px; color: #e0e0e0; font-size: 16px; }}
.name {{ color: #e94560; font-weight: bold; margin-bottom: 4px; }}
</style></head><body>
{bg_html}
<div class="dialogue-box">{dialogue_html}</div>
</body></html>"""


class PreviewManager:
    """
    Preview manager that can render the current scene
    as HTML and display it in a QWidget with a WebEngineView
    or simple QLabel fallback.
    """

    def __init__(self):
        self.preview_panel = None

    def toggle(self, project_path: Optional[str], parent_widget=None):
        """Show or hide the preview panel."""
        if self.preview_panel is not None:
            self.preview_panel.close()
            self.preview_panel = None
            return

        if parent_widget is None:
            return

        self.preview_panel = PreviewPanel(project_path, parent_widget)
        self.preview_panel.show()

    def render_html(self, commands: list) -> str:
        """
        Render a list of commands into preview HTML.

        Returns a self-contained HTML string.
        """
        bg_color = "#1a1a2e"
        bg_html = ""
        dialogue_html = "<span style='color:#555;'>(no dialogue)</span>"

        for cmd in commands:
            t = cmd.get("type", "")
            d = cmd.get("data", {})

            if t == "background":
                bg_color = "#2a2a3e"
                bg = d.get("image", "")
                if bg:
                    bg_html = (
                        f'<div class="bg" style="display:flex;align-items:center;'
                        f'justify-content:center;color:#555;font-size:36px;">'
                        f'{bg}</div>'
                    )

            elif t == "dialogue":
                name = d.get("display_name", d.get("character", "?"))
                text = d.get("text", "")
                dialogue_html = (
                    f'<div class="name">{name}</div>'
                    f'<div>{text}</div>'
                )

            elif t == "narration":
                text = d.get("text", "")
                dialogue_html = (
                    f'<div style="color:#aaa;font-style:italic;">{text}</div>'
                )

            elif t == "choice":
                prompt = d.get("prompt", "")
                choices = d.get("choices", [])
                parts = [prompt + "<br>"]
                for ch in choices:
                    parts.append(
                        f'<button style="margin:4px;padding:6px 16px;'
                        f'background:#0f3460;color:#e0e0e0;border:1px solid #e94560;'
                        f'border-radius:4px;cursor:pointer;">{ch.get("text", "")}</button>'
                    )
                dialogue_html = "".join(parts)

        return PREVIEW_HTML_TEMPLATE.format(
            bg_color=bg_color,
            bg_html=bg_html,
            dialogue_html=dialogue_html,
        )


class PreviewPanel(QWidget):
    """
    Popup preview panel that displays the scene as rendered HTML.

    If QWebEngineView is not available, falls back to QLabel.
    """

    closed = pyqtSignal()

    def __init__(self, project_path: Optional[str], parent=None):
        super().__init__(parent, Qt.Window)
        self.setWindowTitle("Preview - GalEngine Editor")
        self.resize(1280, 800)
        self.setStyleSheet("background: #1a1a2e;")

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        # Header
        header = QWidget()
        header.setFixedHeight(36)
        header.setStyleSheet(
            "background: #16213e; border-bottom: 1px solid #0f3460;"
        )
        h_layout = QHBoxLayout(header)
        h_layout.setContentsMargins(8, 4, 8, 4)
        h_layout.addWidget(QLabel("Preview (Real-time)"))
        h_layout.addStretch()
        close_btn = QPushButton("Close")
        close_btn.clicked.connect(self.close)
        close_btn.setStyleSheet(
            "background: #e94560; color: white;"
            "border-radius: 4px; padding: 4px 12px;"
        )
        h_layout.addWidget(close_btn)
        layout.addWidget(header)

        # Preview content (frame)
        self.content = QLabel("Preview not available\n(no QWebEngineView)")
        self.content.setAlignment(Qt.AlignCenter)
        self.content.setStyleSheet(
            "background: #0a0a1a; color: #555555; font-size: 18px;"
        )
        layout.addWidget(self.content)

    def load_scene(self, commands: list):
        """Load a scene and render it as HTML."""
        pm = PreviewManager()
        html = pm.render_html(commands)
        self.content.setText("")   # clear label fallback
        # For a full preview, integrate QWebEngineView:
        # web = QWebEngineView(self)
        # web.setHtml(html)
        # self.layout().addWidget(web)
        # For now, label-based fallback:
        self.content.setText(html[:500] + "\n\n(Pure text preview; QWebEngineView not integrated)")
