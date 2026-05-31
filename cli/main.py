"""
GalEngine CLI

Command-line interface for GalEngine operations:
- Build/compile game projects
- Run game projects
- Create new project scaffolding
- Validate project structure
"""

import os
import sys
import click


@click.group()
@click.version_option(version="0.1.0", prog_name="GalEngine CLI")
def cli():
    """GalEngine - A visual novel / galgame development engine.

    Build, compile, and run visual novel games from JSON or Markdown scripts.
    """
    pass


@cli.command()
@click.argument("project_dir", type=click.Path(exists=True))
def build(project_dir):
    """Compile a game project into a distributable package."""
    project_dir = os.path.abspath(project_dir)

    from galengine.build.compiler import GameCompiler

    compiler = GameCompiler(project_dir)
    output_dir = os.path.join(project_dir, "build")

    click.echo(f"Building project: {project_dir}")
    click.echo(f"Output directory: {output_dir}")

    if compiler.compile(output_dir):
        click.echo(click.style("  Build successful!", fg="green"))
    else:
        click.echo(click.style("  Build failed!", fg="red"))
        sys.exit(1)


@cli.command()
@click.argument("project_dir", type=click.Path(exists=True))
@click.option("--scene", "-s", default=None, help="Start from a specific scene ID.")
def run(project_dir, scene):
    """Run a game project through the engine."""
    project_dir = os.path.abspath(project_dir)

    from galengine.core.engine import GalEngine

    engine = GalEngine()
    if not engine.load_project(project_dir):
        click.echo(click.style("Failed to load project!", fg="red"))
        sys.exit(1)

    click.echo(f"Running: {engine.project_loader.get_name()}")
    engine.run()


@cli.command()
@click.argument("project_dir", type=click.Path(exists=True))
def validate(project_dir):
    """Validate a game project structure and report issues."""
    project_dir = os.path.abspath(project_dir)

    from galengine.loader.project_loader import ProjectLoader
    from galengine.parser.json_parser import SceneParser, MarkdownParser

    loader = ProjectLoader(project_dir)
    issues = []
    warnings = []

    # Check settings.json
    if not loader.load():
        click.echo(click.style("FATAL: Failed to load settings.json", fg="red"))
        sys.exit(1)

    click.echo(f"Project: {loader.get_name()} v{loader.get_version()}")
    click.echo()

    # Validate assets
    click.echo("Checking assets...")
    if not loader.validate_assets():
        warnings.append("Some asset directories are missing")

    # Validate scenes
    click.echo("Checking scenes...")
    parser = SceneParser()
    md_parser = MarkdownParser()
    scene_ids = loader.get_scene_ids()

    if not scene_ids:
        issues.append("No scenes defined in settings.json")

    for sid in scene_ids:
        path = loader.get_scene_path(sid)
        if not path:
            issues.append(f"Scene '{sid}': file path not found")
            continue
        if not os.path.isfile(path):
            issues.append(f"Scene '{sid}': file not found at {path}")
            continue

        try:
            if path.endswith(".md"):
                md_parser.parse_file(path)
            else:
                parser.parse_file(path)
        except Exception as e:
            issues.append(f"Scene '{sid}': parse error - {e}")

    # Check startup config
    startup = loader.project_data.get("startup", {})
    if not startup.get("first_scene"):
        warnings.append("No 'first_scene' defined in startup config")

    # Report
    if issues:
        click.echo(click.style(f"\n  ISSUES ({len(issues)}):", fg="red"))
        for issue in issues:
            click.echo(f"    - {issue}")

    if warnings:
        click.echo(click.style(f"\n  WARNINGS ({len(warnings)}):", fg="yellow"))
        for warning in warnings:
            click.echo(f"    - {warning}")

    if not issues and not warnings:
        click.echo(click.style("\n  All checks passed!", fg="green"))
    elif not issues:
        click.echo(click.style(f"\n  Validation passed with {len(warnings)} warning(s).", fg="yellow"))
    else:
        click.echo(click.style(f"\n  Validation FAILED with {len(issues)} issue(s).", fg="red"))
        sys.exit(1)


@cli.command()
@click.argument("name")
@click.option("--dir", "-d", default=".", help="Directory to create the project in.")
@click.option("--language", "-l", default="zh-CN", help="Default language code.")
def new(name, dir, language):
    """Create a new game project scaffold."""
    project_dir = os.path.join(os.path.abspath(dir), name)

    if os.path.exists(project_dir):
        click.echo(click.style(f"Directory already exists: {project_dir}", fg="red"))
        sys.exit(1)

    os.makedirs(project_dir, exist_ok=True)

    # Create directory structure
    dirs = [
        "assets/backgrounds",
        "assets/sprites",
        "assets/cgs",
        "assets/audio/bgm",
        "assets/audio/sfx",
        "assets/audio/voice",
        "assets/fonts",
        "assets/ui",
        "assets/videos",
        "scripts",
        "build",
        "patches",
    ]
    for d in dirs:
        os.makedirs(os.path.join(project_dir, d), exist_ok=True)

    # Create settings.json
    import json
    settings = {
        "project": {
            "name": name,
            "version": "0.1.0",
            "author": "",
            "description": "",
            "default_language": language,
        },
        "window": {
            "width": 1280,
            "height": 720,
            "title": name,
        },
        "scenes": {
            "prologue": "scripts/prologue.json",
        },
        "assets": {
            "backgrounds": "assets/backgrounds",
            "sprites": "assets/sprites",
            "cgs": "assets/cgs",
            "audio": "assets/audio",
            "fonts": "assets/fonts",
            "ui": "assets/ui",
            "videos": "assets/videos",
            "scripts": "scripts",
        },
        "startup": {
            "first_scene": "prologue",
        },
        "compilation": {
            "output_dir": "build",
            "executable_name": name.lower().replace(" ", "_"),
        },
    }
    with open(os.path.join(project_dir, "settings.json"), "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)

    # Create sample scene
    sample_scene = {
        "scene_id": "prologue",
        "scene_name": "Prologue",
        "chapter": "Chapter 1",
        "background": "",
        "bgm": "",
        "commands": [
            {"type": "narration", "text": "Your story begins here..."},
            {"type": "end_scene"},
        ],
    }
    with open(os.path.join(project_dir, "scripts", "prologue.json"), "w", encoding="utf-8") as f:
        json.dump(sample_scene, f, indent=2, ensure_ascii=False)

    # Create .gitignore
    with open(os.path.join(project_dir, ".gitignore"), "w") as f:
        f.write("build/\n*.pyc\n__pycache__/\n")

    click.echo(click.style(f"  Project '{name}' created at {project_dir}", fg="green"))
    click.echo(f"  Run: galengine-cli run {project_dir}")


@cli.command()
@click.argument("project_dir", type=click.Path(exists=True))
@click.argument("scene_ids", nargs=-1)
@click.option("--output", "-o", default="build", help="Output directory for the patch.")
@click.option("--name", "-n", default="patch", help="Patch file name.")
def build_patch(project_dir, scene_ids, output, name):
    """Build a patch/DLC data pack from specific scenes."""
    project_dir = os.path.abspath(project_dir)
    output_dir = os.path.join(project_dir, output)

    from galengine.build.compiler import GameCompiler

    compiler = GameCompiler(project_dir)
    if compiler.compile_patch(output_dir, name, list(scene_ids)):
        click.echo(click.style(f"  Patch built: {os.path.join(output_dir, name + '.gpk')}", fg="green"))
    else:
        click.echo(click.style("  Patch build failed!", fg="red"))
        sys.exit(1)


@cli.command()
@click.argument("project_dir", type=click.Path(exists=True))
@click.option("--output", "-o", default="dist", help="Output directory for the executable.")
@click.option("--name", "-n", default=None, help="Executable name (default: project name).")
@click.option("--onefile", is_flag=True, help="Package as a single executable file.")
def package(project_dir, output, name, onefile):
    """Package the game project as a standalone executable."""
    project_dir = os.path.abspath(project_dir)

    from cli.package import package as do_package

    click.echo(f"Packaging project: {project_dir}")
    if do_package(project_dir, output_dir=output, exe_name=name, one_file=onefile):
        click.echo(click.style("  Package created successfully!", fg="green"))
    else:
        click.echo(click.style("  Packaging failed!", fg="red"))
        sys.exit(1)


def main():
    cli()


if __name__ == "__main__":
    main()
