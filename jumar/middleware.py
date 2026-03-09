from datetime import datetime, timedelta

from django.conf import settings
from django.contrib import auth
from django.utils import timezone


class AutoLogoutMiddleware:
    """Log out authenticated users after configured inactivity timeout."""

    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _parse_last_activity(value):
        if not value:
            return None
        try:
            parsed = datetime.fromisoformat(value)
        except (TypeError, ValueError):
            return None
        if timezone.is_naive(parsed):
            return timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed

    def __call__(self, request):
        if not request.user.is_authenticated:
            return self.get_response(request)

        now = timezone.now()
        last_activity = self._parse_last_activity(request.session.get("last_activity"))
        idle_timeout = timedelta(seconds=getattr(settings, "SESSION_IDLE_TIMEOUT", 5400))

        if last_activity and now - last_activity > idle_timeout:
            auth.logout(request)
            request.session.flush()
            return self.get_response(request)

        request.session["last_activity"] = now.isoformat()
        return self.get_response(request)
