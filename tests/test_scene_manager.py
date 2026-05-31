"""
GalEngine Unit Tests - Scene Manager
Test scene switching, command execution, state management, etc.
"""
import pytest
import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from galengine.scene.scene_manager import SceneManager


class TestSceneManager:
    """Scene manager test class."""

    def setup_method(self):
        """Setup before each test method."""
        self.manager = SceneManager()
        self.manager.current_scene_id = "test_scene"
        self.manager.current_scene_name = "Test Scene"
        self.manager.command_index = 0

    def test_initial_state(self):
        """Test initial state."""
        mgr = SceneManager()
        assert mgr.current_scene_id is None
        assert mgr.current_scene_name is None
        assert mgr.command_index == 0
        assert mgr.is_playing is False
        assert mgr.is_paused is False

    def test_get_state(self):
        """Test getting current state."""
        state = self.manager.get_state()
        assert state["scene_id"] == "test_scene"
        assert state["scene_name"] == "Test Scene"
        assert state["command_index"] == 0

    def test_advance_command(self):
        """Test advancing command index."""
        self.manager.command_index = 0
        result = self.manager.advance()
        assert result is True
        assert self.manager.command_index == 1

    def test_advance_past_end(self):
        """Test advancing past the end of the command list."""
        self.manager.command_index = 10
        self.manager.total_commands = 5
        result = self.manager.advance()
        assert result is False

    def test_jump_to_scene(self):
        """Test jumping to a specified scene."""
        self.manager.jump_to("new_scene", "New Scene Name", 100)
        assert self.manager.current_scene_id == "new_scene"
        assert self.manager.current_scene_name == "New Scene Name"
        assert self.manager.command_index == 0
        assert self.manager.total_commands == 100

    def test_reset(self):
        """Test resetting scene manager state."""
        self.manager.command_index = 5
        self.manager.is_playing = True
        self.manager.reset()
        assert self.manager.command_index == 0
        assert self.manager.is_playing is False
        assert self.manager.current_scene_id is None


class TestSceneManagerIntegration:
    """Scene manager integration tests."""

    def test_load_scene_from_dict(self):
        """Test loading scene data from a dictionary."""
        scene_data = {
            "id": "prologue",
            "name": "Prologue",
            "commands": [
                {"type": "background", "data": {"image": "bg.png"}},
                {"type": "dialogue", "data": {"character": "alice", "text": "Hello"}},
            ]
        }
        mgr = SceneManager()
        mgr.load_scene(scene_data)
        assert mgr.current_scene_id == "prologue"
        assert mgr.current_scene_name == "Prologue"
        assert mgr.total_commands == 2
        assert len(mgr.commands) == 2

    def test_execute_background_command(self):
        """Test executing background change command."""
        mgr = SceneManager()
        cmd = {"type": "background", "data": {"image": "bg_room.png", "transition": "fade"}}
        result = mgr.execute_command(cmd)
        assert result is True
        assert mgr.current_background == "bg_room.png"

    def test_execute_dialogue_command(self):
        """Test executing dialogue command."""
        mgr = SceneManager()
        cmd = {"type": "dialogue", "data": {"character": "alice", "text": "Hello World"}}
        result = mgr.execute_command(cmd)
        assert result is True
        assert mgr.current_dialogue["character"] == "alice"
        assert mgr.current_dialogue["text"] == "Hello World"

    def test_execute_choice_command(self):
        """Test executing choice command - should pause waiting for selection."""
        mgr = SceneManager()
        cmd = {"type": "choice", "data": {"prompt": "Choose?", "choices": [{"text": "A", "target": "a"}, {"text": "B", "target": "b"}]}}
        result = mgr.execute_command(cmd)
        assert result is False  # Paused, waiting for player choice
        assert mgr.waiting_for_choice is True
        assert len(mgr.current_choices) == 2

    def test_make_choice(self):
        """Test player making a choice."""
        mgr = SceneManager()
        mgr.waiting_for_choice = True
        mgr.current_choices = [{"text": "A", "target": "scene_a"}, {"text": "B", "target": "scene_b"}]
        mgr.make_choice(0)
        assert mgr.pending_jump == "scene_a"
        assert mgr.waiting_for_choice is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
