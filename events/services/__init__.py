"""Service layer for business logic shared by views, APIs, and models."""

from .calculations import (
    apply_order_calculations,
    calculate_foil_parameters,
    calculate_production_stats,
    calculate_production_stats_batch,
)
from .orders import (
    apply_order_filters,
    build_order_copy_payload,
    can_change_order_status,
    generate_next_order_number,
    get_next_roll_number,
)
from .permissions import get_user_permissions

__all__ = [
    "apply_order_calculations",
    "apply_order_filters",
    "build_order_copy_payload",
    "calculate_foil_parameters",
    "calculate_production_stats",
    "calculate_production_stats_batch",
    "can_change_order_status",
    "generate_next_order_number",
    "get_next_roll_number",
    "get_user_permissions",
]
