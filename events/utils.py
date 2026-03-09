"""Backward-compatible utility imports used across templates and views."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from events.services.calculations import calculate_foil_parameters, calculate_production_stats
from events.services.permissions import get_user_permissions


def format_number(value: Any, decimal_places: int = 2) -> str:
    """Format numeric values with spaces as thousand separators."""
    try:
        if isinstance(value, str):
            value = value.replace(" ", "")
        number = Decimal(str(value))
        return f"{number:,.{decimal_places}f}".replace(",", " ")
    except (InvalidOperation, ValueError, TypeError):
        return str(value)


__all__ = [
    "calculate_foil_parameters",
    "calculate_production_stats",
    "format_number",
    "get_user_permissions",
]
