"""
GalEngine Unit Tests - Save System
Test save, load, serialization, etc.
"""
import pytest
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from galengine.save.save_manager import SaveManager, SaveData


class TestSaveData:
    """SaveData data class tests."""

    def test_initialization(self):
        """Test SaveData initialization."""
        data = SaveData()
        assert data.save_id is None
        assert data.scene_id is None
        assert data.scene_name is None
        assert data.command_index == 0
        assert data.global_flags == {}
        assert data.play_time == 0.0
        assert data.thumbnail_path is None

    def test_to_dict(self):
        """Test conversion to dictionary."""
        data = SaveData()
        data.save_id = 1
        data.scene_id = "prologue"
        data.scene_name = "Prologue"
        data.command_index = 5
        data.global_flags = {"met_alice": True}
        data.play_time = 120.5
        data.timestamp = "2026-05-31T10:00:00"

        d = data.to_dict()
        assert d["save_id"] == 1
        assert d["scene_id"] == "prologue"
        assert d["global_flags"]["met_alice"] is True
        assert d["play_time"] == 120.5

    def test_from_dict(self):
        """Test loading from dictionary."""
        d = {
            "save_id": 2,
            "scene_id": "chapter1",
            "scene_name": "Chapter 1",
            "command_index": 10,
            "global_flags": {"key": "value"},
            "play_time": 60.0,
            "timestamp": "2026-05-31T11:00:00"
        }
        save_data = SaveData.from_dict(d)
        assert save_data.save_id == 2
        assert save_data.scene_id == "chapter1"
        assert save_data.global_flags["key"] == "value"


class TestSaveManager:
    """SaveManager test class."""

    def setup_method(self):
        """Setup before each test method."""
        self.manager = SaveManager(save_dir="test_saves")
        # Clean up test directory
        import shutil
        if os.path.exists("test_saves"):
            shutil.rmtree("test_saves")

    def teardown_method(self):
        """Cleanup after each test method."""
        import shutil
        if os.path.exists("test_saves"):
            shutil.rmtree("test_saves")

    def test_initialization(self):
        """Test SaveManager initialization."""
        mgr = SaveManager(save_dir="my_saves")
        assert mgr.save_dir == "my_saves"
        assert mgr.max_slots == 20
        assert os.path.exists("my_saves") is False  # Directory created on first save

    def test_get_save_path(self):
        """Test getting save path."""
        path = self.manager.get_save_path(1)
        assert path.endswith("test_saves/save_01.json")

        path = self.manager.get_save_path(10)
        assert path.endswith("test_saves/save_10.json")

    def test_save_and_load(self):
        """Test save and load."""
        # Create test data
        data = SaveData()
        data.save_id = 1
        data.scene_id = "prologue"
        data.scene_name = "Prologue"
        data.command_index = 0
        data.global_flags = {"flag1": True}
        data.play_time = 30.0

        # Save
        result = self.manager.save(data)
        assert result is True
        assert os.path.exists("test_saves/save_01.json")

        # Load
        loaded = self.manager.load(1)
        assert loaded is not None
        assert loaded.save_id == 1
        assert loaded.scene_id == "prologue"
        assert loaded.global_flags["flag1"] is True

    def test_load_nonexistent(self):
        """Test loading a nonexistent save."""
        result = self.manager.load(999)
        assert result is None

    def test_get_all_saves(self):
        """Test getting all saves."""
        # Create several test saves
        for i in range(1, 4):
            data = SaveData()
            data.save_id = i
            data.scene_id = f"scene_{i}"
            self.manager.save(data)

        all_saves = self.manager.get_all_saves()
        assert len(all_saves) == 3

    def test_delete_save(self):
        """Test deleting a save."""
        data = SaveData()
        data.save_id = 1
        self.manager.save(data)
        assert os.path.exists("test_saves/save_01.json")

        result = self.manager.delete(1)
        assert result is True
        assert not os.path.exists("test_saves/save_01.json")

    def test_save_count(self):
        """Test save count."""
        assert self.manager.get_save_count() == 0

        data = SaveData()
        data.save_id = 1
        self.manager.save(data)
        assert self.manager.get_save_count() == 1

    def test_has_save(self):
        """Test checking if a save exists."""
        assert self.manager.has_save(1) is False

        data = SaveData()
        data.save_id = 1
        self.manager.save(data)
        assert self.manager.has_save(1) is True
        assert self.manager.has_save(2) is False


class TestSaveManagerIntegration:
    """SaveManager integration tests."""

    def setup_method(self):
        self.manager = SaveManager(save_dir="test_saves_integration")
        import shutil
        if os.path.exists("test_saves_integration"):
            shutil.rmtree("test_saves_integration")

    def teardown_method(self):
        import shutil
        if os.path.exists("test_saves_integration"):
            shutil.rmtree("test_saves_integration")

    def test_full_save_load_cycle(self):
        """Test the full save/load cycle."""
        # Simulate gameplay
        data = SaveData()
        data.save_id = 1
        data.scene_id = "chapter1"
        data.scene_name = "Chapter 1"
        data.command_index = 42
        data.global_flags = {
            "met_alice": True,
            "friendship": 5,
            "ending_path": "happy"
        }
        data.play_time = 1800.5  # 30 minutes
        data.timestamp = datetime.now().isoformat()

        # Save
        assert self.manager.save(data) is True

        # Load
        loaded = self.manager.load(1)
        assert loaded.scene_id == "chapter1"
        assert loaded.command_index == 42
        assert loaded.global_flags["friendship"] == 5
        assert loaded.play_time == 1800.5

    def test_multiple_slots(self):
        """Test multi-slot saving."""
        for i in range(1, 6):
            data = SaveData()
            data.save_id = i
            data.scene_id = f"scene_{i}"
            data.global_flags = {"save_num": i}
            assert self.manager.save(data) is True

        # Verify all slots
        for i in range(1, 6):
            loaded = self.manager.load(i)
            assert loaded is not None
            assert loaded.global_flags["save_num"] == i


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
