"""Compatibility import; HTTP handlers live in presentation."""

from app.presentation.auth import router

__all__ = ["router"]
