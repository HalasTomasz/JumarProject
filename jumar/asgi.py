"""
ASGI config for jumar project.

It exposes the ASGI callable as a module-level variable named ``application``.
"""

import os

from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "jumar.settings_deployment")

application = get_asgi_application()
