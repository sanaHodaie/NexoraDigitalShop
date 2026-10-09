"""Compatibility import; HTTP handlers live in presentation."""

from app.presentation.catalog import router

__all__ = ["router"]
