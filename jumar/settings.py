"""
Base Django settings for the jumar project.

For deployment-specific hardening, use: ``jumar.settings_deployment``.
"""

from __future__ import annotations

from pathlib import Path

import environ


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_BUILD_DIR = BASE_DIR / "frontend" / "build"
FRONTEND_STATIC_DIR = FRONTEND_BUILD_DIR / "static"

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")


# --------------------------------------------------------------------
# Core
# --------------------------------------------------------------------
SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

ROOT_URLCONF = "jumar.urls"
WSGI_APPLICATION = "jumar.wsgi.application"
ASGI_APPLICATION = "jumar.asgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --------------------------------------------------------------------
# Apps
# --------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "django_extensions",
    "rest_framework",
    "rest_framework.authtoken",
    "events",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "jumar.middleware.AutoLogoutMiddleware",
    "jumar.request_logging.ApiRequestLoggingMiddleware",
]


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

if FRONTEND_BUILD_DIR.exists():
    TEMPLATES[0]["DIRS"].append(FRONTEND_BUILD_DIR)


# --------------------------------------------------------------------
# Database
# --------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("MYSQL_DATABASE"),
        "USER": env("MYSQL_USER"),
        "PASSWORD": env("MYSQL_PASSWORD"),
        "HOST": env("MYSQL_HOST", default="localhost"),
        "PORT": env("MYSQL_PORT", default="3306"),
        "OPTIONS": {
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            "charset": "utf8mb4",
            "unix_socket": env("MYSQL_UNIX_SOCKET", default="/var/run/mysqld/mysqld.sock"),
        },
    }
}


# --------------------------------------------------------------------
# Auth & sessions
# --------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

BOOTSTRAP_LOGIN = env("LOGIN", default="").strip()
BOOTSTRAP_PASSWORD = env("PASSWORD", default="")

LOGIN_URL = "/auth/login/"
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_IDLE_TIMEOUT = env.int("SESSION_IDLE_TIMEOUT", default=5400)
SESSION_COOKIE_AGE = SESSION_IDLE_TIMEOUT
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=not DEBUG)


# --------------------------------------------------------------------
# I18N
# --------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True


# --------------------------------------------------------------------
# Static/media
# --------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATIC_ROOT.mkdir(parents=True, exist_ok=True)
STATICFILES_DIRS = []
if (BASE_DIR / "assets").exists():
    STATICFILES_DIRS.append(BASE_DIR / "assets")
if FRONTEND_STATIC_DIR.exists():
    STATICFILES_DIRS.append(FRONTEND_STATIC_DIR)
if FRONTEND_BUILD_DIR.exists():
    WHITENOISE_ROOT = FRONTEND_BUILD_DIR

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# --------------------------------------------------------------------
# Security/CORS
# --------------------------------------------------------------------
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)


# --------------------------------------------------------------------
# REST Framework
# --------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "events.api.pagination.OrderPagePagination",
    "PAGE_SIZE": 15,
}


# --------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

APP_LOG_LEVEL = env("APP_LOG_LEVEL", default="INFO")
DJANGO_LOG_LEVEL = env("DJANGO_LOG_LEVEL", default="WARNING")
ROOT_LOG_LEVEL = env("ROOT_LOG_LEVEL", default="WARNING")
DJANGO_SERVER_LOG_LEVEL = env(
    "DJANGO_SERVER_LOG_LEVEL",
    default="INFO" if DEBUG else "WARNING",
)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
        "verbose": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
            "level": APP_LOG_LEVEL,
        },
        "django_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "INFO",
            "filename": LOG_DIR / "django.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "ERROR",
            "filename": LOG_DIR / "error.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 10,
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console", "django_file", "error_file"],
        "level": ROOT_LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console", "django_file", "error_file"],
            "level": DJANGO_LOG_LEVEL,
            "propagate": False,
        },
        "django.request": {
            "handlers": ["django_file", "error_file"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.server": {
            "handlers": ["console", "django_file"],
            "level": DJANGO_SERVER_LOG_LEVEL,
            "propagate": False,
        },
        "events": {
            "handlers": ["console", "django_file", "error_file"],
            "level": APP_LOG_LEVEL,
            "propagate": False,
        },
        "events.request": {
            "handlers": ["console", "django_file", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
