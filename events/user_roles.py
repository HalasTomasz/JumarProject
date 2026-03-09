"""Reserved application role helpers."""

from __future__ import annotations

from django.contrib.auth.models import Group


RESERVED_ADMIN_USERNAMES = frozenset({"tom"})


def is_reserved_admin_username(username: str) -> bool:
    return bool(username) and username.strip().casefold() in RESERVED_ADMIN_USERNAMES


def is_reserved_admin_user(user) -> bool:
    return bool(user) and is_reserved_admin_username(getattr(user, "username", ""))


def ensure_reserved_admin_access(user) -> bool:
    """Persist the built-in app admin role for reserved usernames."""
    if not getattr(user, "pk", None) or not is_reserved_admin_user(user):
        return False

    admin_group, _ = Group.objects.get_or_create(name="admin")
    if user.groups.filter(pk=admin_group.pk).exists():
        return False

    user.groups.add(admin_group)
    return True
