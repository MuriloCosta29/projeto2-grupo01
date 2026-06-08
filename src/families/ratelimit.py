"""Rate limit simples baseado no cache do Django, sem dependências externas.

Usa contador de janela fixa por IP. Suficiente para conter spam em endpoints
públicos. Observação: o cache padrão (LocMemCache) é por processo; para limite
compartilhado entre vários workers em produção, configurar um cache central
(ex.: Redis) via CACHES no settings.
"""

from functools import wraps

from django.core.cache import cache
from django.http import JsonResponse

from .cors import add_cors_headers


def get_client_ip(request):
    # Render (e a maioria dos proxies) repassa o IP real no X-Forwarded-For.
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR", "unknown")


def rate_limit(key_prefix, limit, window_seconds):
    """Limita a `limit` requisições por `window_seconds` por IP."""

    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            # Não conta o preflight do CORS.
            if request.method == "OPTIONS":
                return view(request, *args, **kwargs)

            cache_key = f"ratelimit:{key_prefix}:{get_client_ip(request)}"
            current = cache.get_or_set(cache_key, 0, window_seconds)

            if current >= limit:
                return add_cors_headers(
                    JsonResponse(
                        {"error": "Muitas tentativas. Tente novamente mais tarde."},
                        status=429,
                    )
                )

            cache.incr(cache_key)

            return view(request, *args, **kwargs)

        return wrapper

    return decorator
