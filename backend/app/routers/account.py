"""Compatibility import; HTTP handlers live in presentation."""

from app.presentation.account import router

__all__ = ["router"]
