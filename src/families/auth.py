"""Autenticação por token bearer para as rotas de admin/coordenação.

Lê o header 'Authorization: Token <key>', valida o token e exige que o usuário
seja staff (admin/coordenação). Sem DRF — implementação mínima e didática.

Uso:
- Em views de método único, decore com @admin_only.
- Em views que misturam métodos (ex.: GET público + POST de admin), chame
  require_admin(request) dentro do ramo que precisa de proteção.
"""

from functools import wraps

from django.http import JsonResponse

from .cors import add_cors_headers
from .models import AuthToken

TOKEN_PREFIX = "Token "


def _extract_key(request):
    header = request.META.get("HTTP_AUTHORIZATION", "")

    if not header.startswith(TOKEN_PREFIX):
        return None

    return header[len(TOKEN_PREFIX):].strip()


def get_authenticated_admin(request):
    """Retorna o usuário admin do token, ou None se não autenticado."""
    key = _extract_key(request)

    if not key:
        return None

    try:
        token = AuthToken.objects.select_related("user").get(key=key)
    except AuthToken.DoesNotExist:
        return None

    user = token.user

    if not user.is_active or not user.is_staff:
        return None

    return user


def require_admin(request):
    """Checagem inline. Retorna (user, None) ou (None, resposta 401)."""
    user = get_authenticated_admin(request)

    if user is None:
        response = add_cors_headers(
            JsonResponse({"error": "Autenticação necessária."}, status=401)
        )
        return None, response

    return user, None


def admin_only(view):
    """Decorator para views de método único (deixa OPTIONS passar p/ preflight)."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if request.method == "OPTIONS":
            return view(request, *args, **kwargs)

        _, error = require_admin(request)

        if error:
            return error

        return view(request, *args, **kwargs)

    return wrapper
