from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('events.api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if getattr(settings, "FRONTEND_BUILD_DIR", None) and settings.FRONTEND_BUILD_DIR.exists():
    # Let React Router handle non-API routes when the production bundle is present.
    urlpatterns += [
        re_path(r"^(?!api/|admin/|static/|media/).*$", TemplateView.as_view(template_name="index.html")),
    ]
