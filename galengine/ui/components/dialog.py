"""
UI Components - Common interactive elements.

Includes:
- ConfirmDialog: Yes/No confirmation popup
- MessageDialog: Information/alert popup
"""

from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass


@dataclass
class DialogResult:
    """Result from a dialog interaction."""
    confirmed: bool = False
    choice_index: int = -1
    choice_value: Optional[str] = None


class ConfirmDialog:
    """
    A modal confirmation dialog with configurable title, message, and buttons.

    Usage:
        dialog = ConfirmDialog()
        dialog.show("Overwrite save?", "Save slot 3 already exists.",
                     on_yes=lambda: do_overwrite(), on_no=lambda: cancel())
        # ...
        if dialog.handle_action("confirm"):  # Player presses Enter
            pass  # on_yes was called
    """

    def __init__(self):
        self._visible: bool = False
        self._title: str = "Confirm"
        self._message: str = ""
        self._yes_text: str = "Yes"
        self._no_text: str = "No"
        self._on_yes: Optional[Callable] = None
        self._on_no: Optional[Callable] = None
        self._can_cancel: bool = True  # Can dismiss without choosing
        self._highlight_yes: bool = True  # Yes is default

    def show(
        self,
        message: str,
        title: str = "Confirm",
        yes_text: str = "Yes",
        no_text: str = "No",
        on_yes: Optional[Callable] = None,
        on_no: Optional[Callable] = None,
        can_cancel: bool = True,
        highlight_yes: bool = True,
    ) -> None:
        """
        Show a confirmation dialog.

        Args:
            message: The question or message to display.
            title: Dialog title.
            yes_text: Text for the confirm button.
            no_text: Text for the cancel button.
            on_yes: Callback when Yes is selected.
            on_no: Callback when No is selected.
            can_cancel: Whether pressing Escape dismisses the dialog.
            highlight_yes: Whether Yes is the default (highlighted) option.
        """
        self._visible = True
        self._title = title
        self._message = message
        self._yes_text = yes_text
        self._no_text = no_text
        self._on_yes = on_yes
        self._on_no = on_no
        self._can_cancel = can_cancel
        self._highlight_yes = highlight_yes

    def handle_action(self, action: str) -> bool:
        """
        Handle a dialog action.

        Args:
            action: One of "confirm", "cancel", "dismiss".

        Returns:
            True if the action was handled (dialog was visible).
        """
        if not self._visible:
            return False

        if action == "confirm":
            self._visible = False
            if self._on_yes:
                self._on_yes()
            return True
        elif action == "cancel":
            self._visible = False
            if self._on_no:
                self._on_no()
            return True
        elif action == "dismiss" and self._can_cancel:
            self._visible = False
            return True

        return False

    def hide(self) -> None:
        """Hide the dialog without triggering callbacks."""
        self._visible = False

    @property
    def is_visible(self) -> bool:
        return self._visible

    @property
    def title(self) -> str:
        return self._title

    @property
    def message(self) -> str:
        return self._message

    @property
    def yes_text(self) -> str:
        return self._yes_text

    @property
    def no_text(self) -> str:
        return self._no_text


class MessageDialog:
    """
    A simple message/alert popup with a single OK/Close button.

    Usage:
        dialog = MessageDialog()
        dialog.show("Save successful!", title="Info")
    """

    def __init__(self):
        self._visible: bool = False
        self._title: str = "Info"
        self._message: str = ""
        self._button_text: str = "OK"
        self._on_close: Optional[Callable] = None
        self._type: str = "info"  # info, warning, error, success

    def show(
        self,
        message: str,
        title: str = "Info",
        button_text: str = "OK",
        msg_type: str = "info",
        on_close: Optional[Callable] = None,
    ) -> None:
        """
        Show a message dialog.

        Args:
            message: The message to display.
            title: Dialog title.
            button_text: Text for the close button.
            msg_type: Message type: "info", "warning", "error", "success".
            on_close: Callback when the dialog is closed.
        """
        self._visible = True
        self._title = title
        self._message = message
        self._button_text = button_text
        self._type = msg_type
        self._on_close = on_close

    def handle_action(self, action: str = "close") -> bool:
        """
        Handle dialog action. Valid actions: "close".

        Returns:
            True if the action was handled.
        """
        if not self._visible:
            return False

        if action == "close":
            self._visible = False
            if self._on_close:
                self._on_close()
            return True

        return False

    def hide(self) -> None:
        """Hide the dialog without triggering callbacks."""
        self._visible = False

    @property
    def is_visible(self) -> bool:
        return self._visible

    @property
    def title(self) -> str:
        return self._title

    @property
    def message(self) -> str:
        return self._message

    @property
    def button_text(self) -> str:
        return self._button_text

    @property
    def msg_type(self) -> str:
        return self._type
