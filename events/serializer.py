"""Deprecated serializer module kept only to fail fast on legacy imports.

The project now uses the explicit serializers from ``events.api.serializers``
and the package under ``events.serializers``. The old singular module used a
stale ``Rolki`` contract and broad ``fields="__all__"`` declarations, so
keeping it importable would risk bypassing the current API contract.
"""

raise ImportError(
    "events.serializer is deprecated and intentionally disabled. "
    "Use serializers from events.api.serializers or events.serializers instead."
)
