"""Permission helpers derived from Django groups."""

from __future__ import annotations

from events.user_roles import is_reserved_admin_user


ADMIN_GROUPS = {"admin"}
MANAGER_GROUPS = {"kierownik", "manager"}
WORKER_GROUPS = {"pracownik", "operator"}


def get_user_groups(user) -> set[str]:
    """Return normalized role names for the given user."""
    if not user or not getattr(user, "is_authenticated", False):
        return set()

    groups = {name.lower() for name in user.groups.values_list("name", flat=True)}
    if getattr(user, "is_superuser", False) or is_reserved_admin_user(user):
        groups |= ADMIN_GROUPS
    return groups


def get_user_permissions(user) -> dict[str, bool]:
    groups = get_user_groups(user)

    is_admin = bool(groups & ADMIN_GROUPS)
    is_manager = is_admin or bool(groups & MANAGER_GROUPS)
    is_worker = bool(groups & WORKER_GROUPS)
    can_view_reports = is_admin or is_manager or is_worker
    can_manage_production = is_admin or is_manager

    return {
        "is_admin": is_admin,
        "is_manager": is_manager,
        "is_worker": is_worker,
        "can_edit_orders": can_manage_production,
        "can_change_order_status": can_manage_production,
        "can_manage_production": can_manage_production,
        "can_write_rolls": can_manage_production,
        "can_use_calculator": can_view_reports,
        "can_view_reports": can_view_reports,
        "can_manage_users": is_admin,
    }
