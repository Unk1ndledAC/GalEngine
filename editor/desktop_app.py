"""
Desktop Editor Launcher

Launches the GalEngine GUI editor as a standalone desktop window
using pywebview (native system WebView).
"""

import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

# ---------------------------------------------------------------------------
# Embedded HTTP server – serves the static editor files
# ---------------------------------------------------------------------------

def _start_http_server(port: int = 8080) -> None:
    """Start a minimal HTTP server for the editor static files."""
    import http.server
    import socketserver

    editor_dir = Path(__file__).resolve().parent

    class _Handler(http.server.SimpleHTTPRequestHandler):
        extensions_map = {
            "": "application/octet-stream",
            ".html": "text/html; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2",
        }

    os.chdir(editor_dir)

    with socketserver.TCPServer(("", port), _Handler) as httpd:
        print(f"[Editor] Serving editor at http://localhost:{port}")
        httpd.serve_forever()


# ---------------------------------------------------------------------------
# Main – pywebview desktop window
# ---------------------------------------------------------------------------

def main() -> None:
    """Entry-point for ``galengine-editor`` CLI command."""

    # --- start local HTTP server in background thread --------------------------------
    port = 8080
    server_thread = threading.Thread(
        target=_start_http_server, args=(port,), daemon=True
    )
    server_thread.start()
    time.sleep(0.5)  # let the server warm up

    # --- try to import pywebview ------------------------------------------------
    try:
        import webview  # type: ignore[import-untyped]
    except ImportError:
        print(
            "[Editor] ERROR: pywebview is not installed.\n"
            "Install it with:  pip install pywebview\n"
            "Or run:        pip install -e '.[editor]'\n"
        )
        sys.exit(1)

    url = f"http://localhost:{port}"

    print(f"[Editor] Opening desktop editor window ...  (URL: {url})")

    # --- platform-specific tweaks ---------------------------------------------------
    # On Windows, force Edge (WebView2) – avoids falling back to Explorer
    window = webview.create_window(
        title="GalEngine Editor",
        url=url,
        width=1440,
        height=900,
        min_size=(1024, 700),
        text_select=True,
        confirm_close=True,
    )

    # Blocks until the last window is closed
    webview.start(debug=False)


if __name__ == "__main__":
    main()
