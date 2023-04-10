from datetime import datetime, timedelta
from django.conf import settings
from django.contrib import auth
from django.contrib.auth.models import User


class AutoLogoutMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            # No need to check the session timeout if the user is not logged in
            return self.get_response(request)

        current_time = datetime.now()
        last_active_str = request.session.get('last_active')

        if last_active_str:
            last_active = datetime.strptime(last_active_str, '%Y-%m-%d %H:%M:%S.%f')
            session_idle_time = current_time - last_active
        else:
            session_idle_time = current_time - current_time

        if session_idle_time > timedelta(seconds=settings.SESSION_IDLE_TIMEOUT):
            auth.logout(request)
            return self.get_response(request)

        request.session['last_active'] = current_time.strftime('%Y-%m-%d %H:%M:%S.%f')
        return self.get_response(request)