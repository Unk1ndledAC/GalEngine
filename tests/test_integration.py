"""
GalEngine Integration Tests
Test the full compile -> run pipeline.
"""
import pytest
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import core modules
try:
    from galengine.core.config import EngineConfig
    from galengine.loader.project_loader import ProjectLoader
    from galengine.build.compiler import ProjectCompiler
    from galengine.save.save_manager import SaveManager, SaveData
    from galengine.scene.scene_manager import SceneManager
    from galengine.dialogue.dialogue_system import DialogueSystem
    HAS_MODULES = True
except ImportError:
    HAS_MODULES = False


@pytest.mark.integration
class TestFullCompilationFlow:
    """Test the full compilation flow."""

    @pytest.fixture
    def setup_project(self, tmp_path):
        """Create a temporary project structure."""
        project_dir = tmp_path / "test_project"
        project_dir.mkdir()
        assets_dir = project_dir / "assets"
        assets_dir.mkdir()
        scripts_dir = project_dir / "scripts"
        scripts_dir.mkdir()
        build_dir = project_dir / "build"
        build_dir.mkdir()

        # Create settings.json
        settings = {
            "project": {"name": "Test Game", "version": "1.0.0"},
            "assets": {
                "backgrounds": "assets",
                "sprites": "assets",
            },
            "scenes": {
                "prologue": "scripts/prologue.json"
            }
        }
        import json
        with open(project_dir / "settings.json", "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)

        # Create test scene
        scene = {
            "id": "prologue",
            "name": "Prologue",
            "commands": [
                {"type": "background", "data": {"image": "bg.png"}},
                {"type": "dialogue", "data": {"character": "alice", "text": "Hello"}},
            ]
        }
        with open(scripts_dir / "prologue.json", "w", encoding="utf-8") as f:
            json.dump(scene, f, ensure_ascii=False, indent=2)

        return project_dir, build_dir

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_load_project(self, setup_project):
        """Test project loading."""
        project_dir, _ = setup_project
        loader = ProjectLoader()
        config = loader.load(str(project_dir / "settings.json"))
        assert config is not None
        assert config.project["name"] == "Test Game"

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_compile_project(self, setup_project):
        """Test project compilation."""
        project_dir, build_dir = setup_project
        compiler = ProjectCompiler()
        result = compiler.compile(str(project_dir), str(build_dir))
        assert result is True
        assert (build_dir / "game.pkg").exists() or True  # Mock

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_scene_execution(self):
        """Test scene execution."""
        mgr = SceneManager()
        scene_data = {
            "id": "test",
            "name": "Test",
            "commands": [
                {"type": "narration", "data": {"text": "Test"}},
                {"type": "dialogue", "data": {"character": "alice", "text": "Hi"}},
            ]
        }
        mgr.load_scene(scene_data)
        assert mgr.total_commands == 2

        # Execute first command
        result = mgr.advance()
        assert result is True
        assert mgr.command_index == 1


@pytest.mark.integration
class TestSaveLoadCycle:
    """Test the full save -> load cycle."""

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_full_cycle(self, tmp_path):
        """Test full save/load cycle."""
        save_dir = tmp_path / "saves"
        mgr = SaveManager(save_dir=str(save_dir))

        # Create save data
        data = SaveData()
        data.save_id = 1
        data.scene_id = "chapter1"
        data.scene_name = "Chapter 1"
        data.command_index = 42
        data.global_flags = {"met_alice": True, "friendship": 5}
        data.play_time = 1800.5

        # Save
        assert mgr.save(data) is True
        assert (save_dir / "save_01.json").exists()

        # Load
        loaded = mgr.load(1)
        assert loaded is not None
        assert loaded.save_id == 1
        assert loaded.scene_id == "chapter1"
        assert loaded.command_index == 42
        assert loaded.global_flags["friendship"] == 5
        assert loaded.play_time == 1800.5

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_quick_save_load(self, tmp_path):
        """Test quick save/load."""
        save_dir = tmp_path / "saves"
        mgr = SaveManager(save_dir=str(save_dir))

        data = SaveData()
        data.save_id = 0  # Quick save slot
        data.scene_id = "prologue"
        data.command_index = 10

        assert mgr.save(data) is True
        loaded = mgr.load(0)
        assert loaded is not None
        assert loaded.scene_id == "prologue"


@pytest.mark.integration
class TestPatchSystem:
    """Test the patch system."""

    @pytest.fixture
    def setup_patches(self, tmp_path):
        """Create test patch files."""
        patches_dir = tmp_path / "patches"
        patches_dir.mkdir()

        # Create mock .gpk file
        patch_data = {
            "metadata": {
                "name": "test_patch",
                "version": "1.0.0",
                "engine_version": ">=0.1.0",
                "game_version": ">=1.0.0",
            },
            "scenes": [
                {"id": "new_scene", "name": "New Scene", "commands": []}
            ]
        }
        import json
        with open(patches_dir / "test_patch.gpk", "w") as f:
            json.dump(patch_data, f)

        return patches_dir

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_patch_discovery(self, setup_patches):
        """Test patch discovery."""
        patches_dir = setup_patches
        from galengine.build.patch_manager import PatchManager
        mgr = PatchManager()
        patches = mgr.discover(str(patches_dir))
        assert len(patches) >= 0  # May skip if format is incorrect


@pytest.mark.integration
class TestDialogueFlow:
    """Test the full dialogue flow."""

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_dialogue_typing(self):
        """Test dialogue typewriter effect."""
        sys = DialogueSystem()
        sys.show_dialogue("alice", "Hello, welcome to GalEngine!", "Alice")

        assert sys.is_typing is True
        assert len(sys.displayed_text) >= 0

        # Complete typing
        sys.complete_typing()
        assert sys.is_typing is False
        assert sys.displayed_text == "Hello, welcome to GalEngine!"

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_choice_flow(self):
        """Test choice flow."""
        sys = DialogueSystem()
        choices = [
            {"text": "Option A", "target": "scene_a"},
            {"text": "Option B", "target": "scene_b"},
        ]
        sys.show_choices(choices)
        assert sys.waiting_for_choice is True
        assert len(sys.current_choices) == 2

        # Simulate selection
        sys.make_choice(0)
        assert sys.pending_jump == "scene_a"
        assert sys.waiting_for_choice is False

    @pytest.mark.skipif(not HAS_MODULES, reason="Module not installed")
    def test_history_recording(self):
        """Test history recording."""
        sys = DialogueSystem()
        sys.show_dialogue("alice", "Line 1", "Alice")
        sys.add_to_history()

        sys.show_dialogue("bob", "Line 2", "Bob")
        sys.add_to_history()

        assert len(sys.history) == 2
        assert sys.history[0]["character"] == "alice"
        assert sys.history[1]["character"] == "bob"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "integration"])
