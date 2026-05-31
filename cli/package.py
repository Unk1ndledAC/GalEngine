"""
GalEngine - Runtime Packaging Module
Uses PyInstaller to package engine runtime + game data into a standalone executable.
"""

import os
import sys
import json
import shutil
from pathlib import Path
import subprocess


def check_pyinstaller():
    """Check if PyInstaller is installed."""
    try:
        import PyInstaller
        return True
    except ImportError:
        return False


def install_pyinstaller():
    """Install PyInstaller."""
    print("Installing PyInstaller...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "pyinstaller"],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print("PyInstaller installed successfully!")
        return True
    else:
        print(f"PyInstaller installation failed: {result.stderr}")
        return False


def create_spec_file(project_dir, output_dir, exe_name="GalEngineGame"):
    """Create a PyInstaller .spec file."""
    project_dir = Path(project_dir).resolve()
    output_dir = Path(output_dir).resolve()
    exe_name = exe_name.replace(" ", "_")

    # Collect files to package
    assets_dir = project_dir / "assets"
    scripts_dir = project_dir / "scripts"
    settings_file = project_dir / "settings.json"
    build_dir = project_dir / "build"

    # Build datas list
    datas = []

    # Add settings.json
    if settings_file.exists():
        datas.append((str(settings_file), "."))

    # Add assets/ directory
    if assets_dir.exists():
        for f in assets_dir.rglob("*"):
            if f.is_file():
                rel_path = f.relative_to(project_dir)
                datas.append((str(f), str(rel_path.parent)))

    # Add scripts/ directory
    if scripts_dir.exists():
        for f in scripts_dir.rglob("*"):
            if f.is_file():
                rel_path = f.relative_to(project_dir)
                datas.append((str(f), str(rel_path.parent)))

    # Generate .spec file content
    datas_str = ",\n        ".join([f'("{src}", "{dst}")' for src, dst in datas])

    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-
block_cipher = None

a = Analysis(
    ['{entry_point}'],
    pathex=[],
    binaries=[],
    datas=[
        {datas_str},
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.toc, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='{exe_name}',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets', 'ui', 'icon.ico'],
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_collect=False,
    name='{exe_name}',
)
'''.format(
        entry_point=str(Path(__file__).parent.parent / "galengine" / "core" / "engine.py"),
        exe_name=exe_name,
        datas_str=datas_str if datas_str else "",
    )

    spec_path = output_dir / f"{exe_name}.spec"
    with open(spec_path, "w", encoding="utf-8") as f:
        f.write(spec_content)

    print(f"Spec file created: {spec_path}")
    return spec_path


def package(project_dir, output_dir="dist", exe_name=None, one_file=False):
    """
    Package a GalEngine game project into a standalone executable.

    Args:
        project_dir: Game project directory.
        output_dir: Output directory (default: dist/).
        exe_name: Executable name (default: project name).
        one_file: Whether to package as a single file (default: False, package as directory).

    Returns:
        bool: True if packaging succeeded.
    """
    project_dir = Path(project_dir).resolve()

    # Check project
    settings_file = project_dir / "settings.json"
    if not settings_file.exists():
        print(f"Error: settings.json not found: {settings_file}")
        return False

    # Read project config
    with open(settings_file, "r", encoding="utf-8") as f:
        settings = json.load(f)

    if exe_name is None:
        exe_name = settings.get("project", {}).get("name", "GalEngineGame")
    exe_name = exe_name.replace(" ", "_")

    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Packaging project: {project_dir}")
    print(f"Output directory: {output_dir}")
    print(f"Executable name: {exe_name}")
    print(f"Single-file mode: {one_file}")
    print()

    # Check PyInstaller
    if not check_pyinstaller():
        print("PyInstaller is not installed.")
        if not install_pyinstaller():
            print("Cannot continue packaging. Please manually install PyInstaller: pip install pyinstaller")
            return False

    # Create entry script
    entry_script = output_dir / "game_entry.py"
    with open(entry_script, "w", encoding="utf-8") as f:
        f.write(f'''# -*- coding: utf-8 -*-
"""GalEngine game entry script (auto-generated)."""
import os
import sys

# Add project directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import and run GalEngine
from galengine.core.engine import GalEngine

if __name__ == "__main__":
    project_dir = os.path.abspath(os.path.dirname(__file__))
    engine = GalEngine()
    if engine.load_project(project_dir):
        engine.run()
    else:
        print("Failed to load game project!")
        sys.exit(1)
''')

    print(f"Entry script created: {entry_script}")

    # Build PyInstaller command
    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", exe_name,
        "--distpath", str(output_dir),
        "--workpath", str(output_dir / "build"),
        "--specpath", str(output_dir),
    ]

    if one_file:
        pyinstaller_cmd.append("--onefile")
    else:
        pyinstaller_cmd.append("--onedir")

    # Add datas
    datas = []

    # settings.json
    datas.append(f"{settings_file}{os.pathsep}.")

    # assets/ directory
    assets_dir = project_dir / "assets"
    if assets_dir.exists():
        datas.append(f"{assets_dir}{os.pathsep}assets")

    # scripts/ directory
    scripts_dir = project_dir / "scripts"
    if scripts_dir.exists():
        datas.append(f"{scripts_dir}{os.pathsep}scripts")

    for data in datas:
        pyinstaller_cmd.extend(["--add-data", data])

    # Hide console window (Windows)
    if sys.platform == "win32":
        pyinstaller_cmd.append("--windowed")

    # Add entry script
    pyinstaller_cmd.append(str(entry_script))

    print(f"Running PyInstaller...")
    print(f"Command: {' '.join(pyinstaller_cmd)}")
    print()

    # Run PyInstaller
    result = subprocess.run(pyinstaller_cmd)

    if result.returncode == 0:
        print()
        print(f"Packaging successful!")
        if one_file:
            exe_path = output_dir / f"{exe_name}.exe" if sys.platform == "win32" else output_dir / exe_name
        else:
            exe_path = output_dir / exe_name / f"{exe_name}.exe" if sys.platform == "win32" else output_dir / exe_name / exe_name

        if exe_path.exists():
            print(f"Executable: {exe_path}")
        else:
            print(f"Warning: Executable not found: {exe_path}")

        # Clean up temp files
        spec_file = output_dir / f"{exe_name}.spec"
        if spec_file.exists():
            spec_file.unlink()

        return True
    else:
        print()
        print(f"Packaging failed! Return code: {result.returncode}")
        return False


def create_standalone_package(project_dir, output_dir="build"):
    """
    Create a standalone distributable package (without PyInstaller dependency).

    This method creates a directory containing the engine runtime and game data,
    and generates a launch script (for advanced users doing manual packaging).
    """
    project_dir = Path(project_dir).resolve()
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Creating standalone distributable package...")
    print(f"Project directory: {project_dir}")
    print(f"Output directory: {output_dir}")
    print()

    # 1. Copy GalEngine engine source
    engine_src = Path(__file__).parent.parent / "galengine"
    engine_dst = output_dir / "galengine"
    if engine_src.exists():
        if engine_dst.exists():
            shutil.rmtree(engine_dst)
        shutil.copytree(engine_src, engine_dst, ignore=shutil.ignore_patterns("*.pyc", "__pycache__"))
        print(f"  [OK] Copied engine source: {engine_dst}")

    # 2. Copy game project files
    # settings.json
    settings_file = project_dir / "settings.json"
    if settings_file.exists():
        shutil.copy2(settings_file, output_dir / "settings.json")
        print(f"  [OK] Copied settings.json")

    # assets/ directory
    assets_dir = project_dir / "assets"
    if assets_dir.exists():
        if (output_dir / "assets").exists():
            shutil.rmtree(output_dir / "assets")
        shutil.copytree(assets_dir, output_dir / "assets")
        print(f"  [OK] Copied assets/ directory")

    # scripts/ directory
    scripts_dir = project_dir / "scripts"
    if scripts_dir.exists():
        if (output_dir / "scripts").exists():
            shutil.rmtree(output_dir / "scripts")
        shutil.copytree(scripts_dir, output_dir / "scripts")
        print(f"  [OK] Copied scripts/ directory")

    # 3. Create launch script
    launch_script = output_dir / "launch.py"
    with open(launch_script, "w", encoding="utf-8") as f:
        f.write('''# -*- coding: utf-8 -*-
"""GalEngine game launch script (auto-generated)."""
import os
import sys

# Add current directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import and run GalEngine
from galengine.core.engine import GalEngine

if __name__ == "__main__":
    project_dir = os.path.abspath(os.path.dirname(__file__))
    engine = GalEngine()
    if engine.load_project(project_dir):
        engine.run()
    else:
        print("Failed to load game project!")
        import tkinter.messagebox as mb
        mb.showerror("Error", "Failed to load game project!")
        sys.exit(1)
''')
    print(f"  [OK] Launch script created: {launch_script}")

    # 4. Create requirements.txt
    requirements_file = output_dir / "requirements.txt"
    with open(requirements_file, "w", encoding="utf-8") as f:
        f.write("pygame>=2.5.0\\n")
        f.write("Pillow>=10.0.0\\n")
        f.write("pydub>=0.25.0\\n")
        f.write("jinja2>=3.1.0\\n")
        f.write("click>=8.1.0\\n")
        f.write("watchdog>=4.0.0\\n")
    print(f"  [OK] requirements.txt created")

    # 5. Create README.txt
    readme_file = output_dir / "README.txt"
    with open(readme_file, "w", encoding="utf-8") as f:
        f.write("GalEngine Game Distribution Package\\n")
        f.write("="*40 + "\\n\\n")
        f.write("Requirements:\\n")
        f.write("1. Install Python 3.10+\\n")
        f.write("2. Install dependencies: pip install -r requirements.txt\\n")
        f.write("3. Run the game: python launch.py\\n\\n")
        f.write("Or package as executable using PyInstaller:\\n")
        f.write("  pyinstaller --onedir --add-data settings.json:. --add-data assets:assets --add-data scripts:scripts launch.py\\n")
    print(f"  [OK] README.txt created")

    print()
    print(f"Standalone distributable package created: {output_dir}")
    print()
    print("Next steps:")
    print(f"  1. Install dependencies: pip install -r {requirements_file}")
    print(f"  2. Test run: python {launch_script}")
    print(f"  3. Package as exe: use PyInstaller or cx_Freeze")
    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="GalEngine Runtime Packaging Tool")
    parser.add_argument("project_dir", help="Game project directory")
    parser.add_argument("--output", "-o", default="dist", help="Output directory (default: dist/)")
    parser.add_argument("--name", "-n", default=None, help="Executable name (default: project name)")
    parser.add_argument("--onefile", action="store_true", help="Package as single file (default: directory)")
    parser.add_argument("--standalone", action="store_true", help="Create standalone distribution (no PyInstaller dependency)")

    args = parser.parse_args()

    if args.standalone:
        create_standalone_package(args.project_dir, args.output)
    else:
        package(args.project_dir, args.output, args.name, args.onefile)
