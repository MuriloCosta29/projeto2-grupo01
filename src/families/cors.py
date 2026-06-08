"""Headers de CORS num lugar só.

Centralizado para que a liberação do header `Authorization` (necessária para o
token de autenticação chegar do front, que roda em outro domínio) fique definida
em um único ponto. A origem permitida vem de env: em produção aponte para o
domínio do front (Vercel); em dev fica liberada (`*`).
"""

from django.conf import settings


def add_cors_headers(response):
    response["Access-Control-Allow-Origin"] = getattr(
        settings, "CORS_ALLOWED_ORIGIN", "*"
    )
    response["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response
