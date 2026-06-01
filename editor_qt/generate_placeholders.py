#!/usr/bin/env python3
"""
Generate placeholder assets for GalEngine Editor (PyQt5 version).

Usage:
    D:\Anaconda3\envs\mypytorch\python.exe generate_placeholders.py

All placeholders have English labels showing resolution and content info.
"""
import os
import wave
from PIL import Image, ImageDraw


BASE = os.path.dirname(os.path.abspath(__file__))


def create_placeholder(path, w, h, bg_color, label_lines):
    """Create a placeholder image with English label lines."""
    img = Image.new("RGB", (w, h), bg_color)
    d = ImageDraw.Draw(img)
    # Draw border
    d.rectangle([0, 0, w - 1, h - 1], outline="#555555", width=2)
    # Label (centered approximately)
    y = h // 2 - len(label_lines) * 12
    for line in label_lines:
        x = max(4, w // 2 - len(line) * 6)
        d.text((x, y), line, fill="#cccccc")
        y += 24
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")
    print(f"  Created: {os.path.relpath(path, BASE)}")


def create_sprite(path, w, h, color, label):
    """Create a transparent-background sprite placeholder with English label."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = w // 2
    # Head
    d.ellipse([cx - 50, 60, cx + 50, 160], fill=color)
    # Body
    d.rectangle([cx - 40, 165, cx + 40, 380], fill=color)
    # Legs
    d.rectangle([cx - 40, 380, cx - 5, 620], fill=color)
    d.rectangle([cx + 5, 380, cx + 40, 620], fill=color)
    # Label
    d.rectangle([10, 660, w - 10, 710], fill=(0, 0, 0, 180))
    d.text((20, 670), label, fill="#cccccc")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")
    print(f"  Created: {os.path.relpath(path, BASE)}")


def create_audio(path, duration_sec):
    """Create a silent WAV file (rename to .ogg for placeholder use)."""
    SR = 44100
    n = int(SR * duration_sec)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(b"\x00\x00" * n)
    print(f"  Created: {os.path.relpath(path, BASE)}")


def main():
    print("Generating placeholder assets...")
    print(f"Target directory: {BASE}")
    print()

    # --- Backgrounds (1280x720) ---
    print("[1/4] Backgrounds...")
    create_placeholder(
        os.path.join(BASE, "resources", "assets", "backgrounds", "bg_classroom.png"),
        1280, 720, "#3a4a5a",
        ["Background: Classroom", "1280x720", "placeholder.png"],
    )
    create_placeholder(
        os.path.join(BASE, "resources", "assets", "backgrounds", "bg_corridor.png"),
        1280, 720, "#4a3a3a",
        ["Background: Corridor", "1280x720", "placeholder.png"],
    )
    create_placeholder(
        os.path.join(BASE, "resources", "assets", "backgrounds", "bg_sunset.png"),
        1280, 720, "#5a3a2a",
        ["Background: Sunset", "1280x720", "placeholder.png"],
    )

    # --- Sprites (360x720 transparent) ---
    print("[2/4] Sprites...")
    create_sprite(
        os.path.join(BASE, "resources", "assets", "sprites", "alice_normal.png"),
        360, 720, "#e94560", "Alice (normal) 360x720",
    )
    create_sprite(
        os.path.join(BASE, "resources", "assets", "sprites", "alice_smile.png"),
        360, 720, "#e94560", "Alice (smile) 360x720",
    )
    create_sprite(
        os.path.join(BASE, "resources", "assets", "sprites", "alice_sad.png"),
        360, 720, "#886688", "Alice (sad) 360x720",
    )
    create_sprite(
        os.path.join(BASE, "resources", "assets", "sprites", "bob_normal.png"),
        360, 720, "#44cc88", "Bob (normal) 360x720",
    )
    create_sprite(
        os.path.join(BASE, "resources", "assets", "sprites", "protagonist_normal.png"),
        360, 720, "#4488cc", "Protagonist 360x720",
    )

    # --- CG (1280x720) ---
    print("[3/4] CG...")
    create_placeholder(
        os.path.join(BASE, "resources", "assets", "cg", "cg_ending.png"),
        1280, 720, "#1a1020",
        ["CG: Ending", "1280x720", "Replace with artwork"],
    )

    # --- UI assets ---
    print("[4/4] UI assets & audio...")
    create_placeholder(
        os.path.join(BASE, "resources", "assets", "ui", "textbox.png"),
        1100, 160, (10, 10, 26, 180),
        ["Textbox", "1100x160", "UI placeholder"],
    )
    create_placeholder(
        os.path.join(BASE, "resources", "assets", "ui", "icon.png"),
        256, 256, "#e94560",
        ["App Icon", "256x256", "GalEngine"],
    )

    # --- Audio placeholders (silent WAV, use .ogg extension) ---
    audio_dir = os.path.join(BASE, "resources", "assets", "audio")
    os.makedirs(audio_dir, exist_ok=True)
    audio_specs = [
        ("bgm_everyday.ogg", 4.0),
        ("bgm_corridor.ogg", 3.0),
        ("bgm_lonely.ogg", 3.5),
        ("bgm_happy.ogg", 3.0),
        ("se_chime.ogg", 1.5),
        ("se_bell.ogg", 1.0),
    ]
    for fname, dur in audio_specs:
        create_audio(os.path.join(audio_dir, fname), dur)

    voice_dir = os.path.join(audio_dir, "voice")
    os.makedirs(voice_dir, exist_ok=True)
    create_audio(os.path.join(voice_dir, "alice_01.ogg"), 2.5)

    print()
    print("All placeholder assets generated successfully.")
    print(f"Assets directory: {os.path.join(BASE, 'resources', 'assets')}")


if __name__ == "__main__":
    main()
