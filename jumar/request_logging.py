import logging
from time import perf_counter


logger = logging.getLogger("events.request")


class ApiRequestLoggingMiddleware:
    """
    Log API request summaries with status and latency.

    This keeps logs compact but useful for troubleshooting and basic monitoring.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        started = perf_counter()
        try:
            response = self.get_response(request)
        except Exception:
            duration_ms = (perf_counter() - started) * 1000
            user = (
                request.user.username
                if getattr(request, "user", None) and request.user.is_authenticated
                else "anonymous"
            )
            logger.exception(
                "api method=%s path=%s user=%s status=500 duration_ms=%.1f",
                request.method,
                request.path,
                user,
                duration_ms,
            )
            raise

        duration_ms = (perf_counter() - started) * 1000
        user = (
            request.user.username
            if getattr(request, "user", None) and request.user.is_authenticated
            else "anonymous"
        )
        client_ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", "-"))

        log_fn = logger.warning if response.status_code >= 400 else logger.info
        log_fn(
            "api method=%s path=%s user=%s status=%s duration_ms=%.1f ip=%s",
            request.method,
            request.path,
            user,
            response.status_code,
            duration_ms,
            client_ip,
        )
        return response
