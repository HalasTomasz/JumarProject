"""Signal handlers for application bootstrap tasks."""

from __future__ import annotations

from django.db.models.signals import post_migrate
from django.dispatch import receiver

from events.bootstrap import ensure_bootstrap_login_user


@receiver(post_migrate)
def create_bootstrap_login_user(sender, **kwargs):
    """Ensure the env-configured login user exists after migrations."""
    if getattr(sender, "name", "") != "events":
        return
    ensure_bootstrap_login_user()
