"""Bootstrap helpers for creating environment-driven application users."""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model

from events.models import UserProfile


def ensure_bootstrap_login_user():
    """Create the bootstrap login user from settings when missing."""
    username = getattr(settings, "BOOTSTRAP_LOGIN", "").strip()
    password = getattr(settings, "BOOTSTRAP_PASSWORD", "")
    if not username or not password:
        return None, False

    user_model = get_user_model()
    user, created = user_model.objects.get_or_create(username=username)

    if created or not user.has_usable_password():
        user.set_password(password)
        user.save(update_fields=["password"])

    UserProfile.objects.get_or_create(user=user)
    return user, created
