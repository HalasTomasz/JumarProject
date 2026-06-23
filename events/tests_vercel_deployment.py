import importlib
import os
import sys
from unittest.mock import patch

import environ
from django.test import SimpleTestCase


class VercelDeploymentSettingsTests(SimpleTestCase):
    def _import_settings_module(self, module_name, env_overrides, purge_modules=None):
        purge_modules = purge_modules or []
        module_names = [module_name, *purge_modules]
        original_modules = {
            current_module_name: sys.modules.get(current_module_name)
            for current_module_name in module_names
        }

        try:
            with patch.dict(os.environ, env_overrides, clear=True):
                with patch.object(environ.Env, "read_env", return_value=None):
                    for current_module_name in module_names:
                        sys.modules.pop(current_module_name, None)
                    return importlib.import_module(module_name)
        finally:
            for current_module_name in module_names:
                sys.modules.pop(current_module_name, None)
            for current_module_name, original_module in original_modules.items():
                if original_module is not None:
                    sys.modules[current_module_name] = original_module

    def test_base_settings_switch_to_database_url_and_console_logging_on_vercel(self):
        settings_module = self._import_settings_module(
            "jumar.settings",
            {
                "DJANGO_SECRET_KEY": "test-secret",
                "DEBUG": "False",
                "DATABASE_URL": "postgresql://user:pass@db.example.com:5432/jumar",
                "VERCEL": "1",
                "VERCEL_URL": "preview.example.vercel.app",
                "TIME_ZONE": "Europe/Warsaw",
            },
        )

        self.assertEqual(
            settings_module.DATABASES["default"]["ENGINE"],
            "django.db.backends.postgresql",
        )
        self.assertIn("preview.example.vercel.app", settings_module.ALLOWED_HOSTS)
        self.assertIn(
            "https://preview.example.vercel.app",
            settings_module.CSRF_TRUSTED_ORIGINS,
        )
        self.assertEqual(settings_module.LOGGING["root"]["handlers"], ["console"])
        self.assertNotIn("django_file", settings_module.LOGGING["handlers"])

    def test_deployment_settings_keep_inferred_preview_hosts_without_explicit_override(self):
        settings_module = self._import_settings_module(
            "jumar.settings_deployment",
            {
                "DJANGO_SECRET_KEY": "test-secret",
                "DEBUG": "False",
                "DATABASE_URL": "postgresql://user:pass@db.example.com:5432/jumar",
                "VERCEL": "1",
                "VERCEL_URL": "preview.example.vercel.app",
                "TIME_ZONE": "Europe/Warsaw",
            },
            purge_modules=["jumar.settings"],
        )

        self.assertIn("preview.example.vercel.app", settings_module.ALLOWED_HOSTS)
        self.assertIn(
            "https://preview.example.vercel.app",
            settings_module.CORS_ALLOWED_ORIGINS,
        )
        self.assertIn(
            "https://preview.example.vercel.app",
            settings_module.CSRF_TRUSTED_ORIGINS,
        )
