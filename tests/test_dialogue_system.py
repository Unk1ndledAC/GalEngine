"""
GalEngine Unit Tests - Dialogue System
Test dialogue display, text rendering, voice playback, etc.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from galengine.dialogue.dialogue_system import DialogueSystem


class TestDialogueSystem:
    """Dialogue system test class."""

    def setup_method(self):
        """Setup before each test method."""
        self.system = DialogueSystem()

    def test_initial_state(self):
        """Test initial state."""
        sys = DialogueSystem()
        assert sys.current_text == ""
        assert sys.current_character is None
        assert sys.display_name == ""
        assert sys.is_typing is False
        assert sys.text_speed > 0

    def test_show_dialogue(self):
        """Test showing dialogue."""
        self.system.show_dialogue("alice", "Hello!", "Alice")
        assert self.system.current_character == "alice"
        assert self.system.display_name == "Alice"
        assert self.system.full_text == "Hello!"
        assert self.system.is_typing is True

    def test_show_narration(self):
        """Test showing narration."""
        self.system.show_narration("It was a dark night.")
        assert self.system.current_character is None
        assert self.system.display_name == ""
        assert self.system.full_text == "It was a dark night."
        assert self.system.is_typing is True

    def test_update_typing(self):
        """Test typewriter effect update."""
        self.system.show_dialogue("alice", "Hello", "Alice")
        # Simulate update
        self.system.update(0.1)
        assert len(self.system.displayed_text) >= 0
        # Complete typing
        self.system.complete_typing()
        assert self.system.displayed_text == "Hello"
        assert self.system.is_typing is False

    def test_set_text_speed(self):
        """Test setting text display speed."""
        self.system.set_text_speed(0.05)
        assert self.system.text_speed == 0.05

        # Test boundary values
        self.system.set_text_speed(0)
        assert self.system.text_speed == 0.01  # Minimum value

        self.system.set_text_speed(1.0)
        assert self.system.text_speed == 1.0

    def test_clear_dialogue(self):
        """Test clearing dialogue."""
        self.system.show_dialogue("alice", "Hello", "Alice")
        self.system.clear()
        assert self.system.current_text == ""
        assert self.system.current_character is None
        assert self.system.display_name == ""

    def test_voice_playback(self):
        """Test voice playback (mock)."""
        self.system.show_dialogue("alice", "Hello", "Alice", voice_file="voice/alice_01.ogg")
        assert self.system.current_voice == "voice/alice_01.ogg"
        # In a real implementation, this would invoke the audio manager


class TestDialogueHistory:
    """Dialogue history tests."""

    def setup_method(self):
        self.system = DialogueSystem()

    def test_add_to_history(self):
        """Test adding dialogue to history."""
        self.system.show_dialogue("alice", "Line 1", "Alice")
        self.system.add_to_history()
        assert len(self.system.history) == 1
        assert self.system.history[0]["character"] == "alice"
        assert self.system.history[0]["text"] == "Line 1"

    def test_history_limit(self):
        """Test history entry limit."""
        self.system.max_history = 5
        for i in range(10):
            self.system.show_dialogue("narrator", f"Line {i}", "")
            self.system.add_to_history()
        assert len(self.system.history) == 5

    def test_clear_history(self):
        """Test clearing history."""
        self.system.show_dialogue("alice", "Hello", "Alice")
        self.system.add_to_history()
        assert len(self.system.history) == 1
        self.system.clear_history()
        assert len(self.system.history) == 0


class TestDialogueSystemIntegration:
    """Dialogue system integration tests."""

    def test_full_dialogue_flow(self):
        """Test the full dialogue flow."""
        sys = DialogueSystem()
        # Show dialogue
        sys.show_dialogue("alice", "Hello, welcome to GalEngine!", "Alice")
        assert sys.is_typing is True

        # Complete typing
        sys.complete_typing()
        assert sys.is_typing is False
        assert sys.displayed_text == "Hello, welcome to GalEngine!"

        # Add to history
        sys.add_to_history()
        assert len(sys.history) == 1

        # Show narration
        sys.show_narration("The story begins.")
        assert sys.current_character is None
        assert sys.display_name == ""

    def test_choice_display(self):
        """Test choice display."""
        sys = DialogueSystem()
        choices = [
            {"text": "Choice A", "target": "a"},
            {"text": "Choice B", "target": "b"},
        ]
        sys.show_choices(choices)
        assert sys.waiting_for_choice is True
        assert len(sys.current_choices) == 2

        # Simulate selection
        sys.make_choice(0)
        assert sys.pending_jump == "a"
        assert sys.waiting_for_choice is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
