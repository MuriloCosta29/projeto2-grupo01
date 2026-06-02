from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.views.generic import CreateView, TemplateView
from django.http import JsonResponse
import json

from .forms import FamilyForm
from .models import DeliveryLog, Family


def health_check(request):
    return JsonResponse(
        {
            "status": "ok",
            "service": "presidente-de-rua-api",
        }
    )


def dashboard_impact_api(request):
    if request.method != "GET":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    return add_cors_headers(
        JsonResponse(
            {
                "total_deliveries": DeliveryLog.objects.count(),
            }
        )
    )


class HomeView(TemplateView):
    template_name = "families/home.html"


class FamilyCreateView(CreateView):
    model = Family
    form_class = FamilyForm
    template_name = "families/family_form.html"

    def form_valid(self, form):
        messages.success(self.request, "Família mapeada com sucesso.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Revise os campos obrigatórios antes de salvar.")
        return super().form_invalid(form)


def add_cors_headers(response):
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@csrf_exempt
def families_api(request):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method == "GET":
        families = Family.objects.prefetch_related("deliveries").order_by_priority()

        data = [
            {
                "id": family.id,
                "nome_responsavel": family.nome_responsavel,
                "telefone": family.telefone,
                "codigo_viela": family.codigo_viela,
                "complemento": family.complemento,
                "bairro": family.bairro,
                "cep": family.cep,
                "cidade": family.cidade,
                "estado": family.estado,
                "quantidade_moradores": family.quantidade_moradores,
                "observacoes": family.observacoes,
                "deliveries": [
                    {
                        "id": delivery.id,
                        "delivery_date": delivery.delivery_date.isoformat(),
                        "notes": delivery.notes,
                        "created_at": delivery.created_at.isoformat(),
                    }
                    for delivery in family.deliveries.all()
                ],
            }
            for family in families
        ]

        return add_cors_headers(JsonResponse(data, safe=False))

    if request.method == "POST":
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return add_cors_headers(
                JsonResponse({"error": "JSON inválido."}, status=400)
            )

        try:
            family = Family.objects.create(
                nome_responsavel=payload.get("nome_responsavel", ""),
                quantidade_moradores=payload.get("quantidade_moradores") or 1,
                codigo_viela=payload.get("codigo_viela", ""),
                cep=payload.get("cep", ""),
            )
        except IntegrityError:
            return add_cors_headers(
                JsonResponse(
                    {"error": "Atenção: Possível duplicidade de morador encontrada."},
                    status=400,
                )
            )

        data = {
            "id": family.id,
            "nome_responsavel": family.nome_responsavel,
            "telefone": family.telefone,
            "codigo_viela": family.codigo_viela,
            "complemento": family.complemento,
            "bairro": family.bairro,
            "cep": family.cep,
            "cidade": family.cidade,
            "estado": family.estado,
            "quantidade_moradores": family.quantidade_moradores,
            "observacoes": family.observacoes,
        }

        return add_cors_headers(JsonResponse(data, status=201))

    return add_cors_headers(
        JsonResponse({"error": "Método não permitido."}, status=405)
    )


@csrf_exempt
def family_deliveries_api(request, family_id):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method != "POST":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    try:
        family = Family.objects.get(id=family_id)
    except Family.DoesNotExist:
        return add_cors_headers(
            JsonResponse({"error": "Família não encontrada."}, status=404)
        )

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return add_cors_headers(JsonResponse({"error": "JSON inválido."}, status=400))

    delivery = DeliveryLog.objects.create(
        family=family,
        notes=payload.get("notes", ""),
    )

    return add_cors_headers(
        JsonResponse(
            {
                "id": delivery.id,
                "family_id": family.id,
                "delivery_date": delivery.delivery_date.isoformat(),
                "notes": delivery.notes,
                "created_at": delivery.created_at.isoformat(),
            },
            status=201,
        )
    )
