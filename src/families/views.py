from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.views.generic import CreateView, TemplateView
from django.http import JsonResponse
import json

from .forms import FamilyForm
from .models import DeliveryLog, Family, FieldAgent, Region


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


def dashboard_regions_api(request):
    if request.method != "GET":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    region_data = {}

    families = Family.objects.select_related("region").prefetch_related("deliveries")

    for family in families:
        region = family.region.nome if family.region else "Não informado"

        if region not in region_data:
            region_data[region] = {
                "region": region,
                "families_count": 0,
                "total_deliveries": 0,
            }

        region_data[region]["families_count"] += 1
        region_data[region]["total_deliveries"] += family.deliveries.count()

    return add_cors_headers(
        JsonResponse(
            sorted(
                region_data.values(),
                key=lambda region: region["region"],
            ),
            safe=False,
        )
    )


def regions_api(request):
    if request.method != "GET":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    data = [
        {
            "id": region.id,
            "nome": region.nome,
            "codigo": region.codigo,
            "ativo": region.ativo,
        }
        for region in Region.objects.filter(ativo=True)
    ]

    return add_cors_headers(JsonResponse(data, safe=False))


def field_agents_api(request):
    if request.method != "GET":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    agents = FieldAgent.objects.prefetch_related(
        "assigned_families",
        "deliveries__family",
    ).all()

    data = []

    for agent in agents:
        deliveries = list(agent.deliveries.all())
        attended_families = {
            delivery.family_id: delivery.family.nome_responsavel
            for delivery in deliveries
        }

        data.append(
            {
                "id": agent.id,
                "nome": agent.nome,
                "codigo_area": agent.codigo_area,
                "ativo": agent.ativo,
                "assigned_families_count": agent.assigned_families.count(),
                "attended_families_count": len(attended_families),
                "deliveries_count": len(deliveries),
                "attended_families": sorted(
                    [
                        {
                            "id": family_id,
                            "nome_responsavel": family_name,
                        }
                        for family_id, family_name in attended_families.items()
                    ],
                    key=lambda family: family["nome_responsavel"],
                ),
            }
        )

    return add_cors_headers(JsonResponse(data, safe=False))


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
        families = Family.objects.select_related("region").prefetch_related(
            "deliveries"
        ).order_by_priority()

        data = [
            {
                "id": family.id,
                "region": (
                    {
                        "id": family.region.id,
                        "nome": family.region.nome,
                        "codigo": family.region.codigo,
                    }
                    if family.region
                    else None
                ),
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
            region_id = payload.get("region_id")

            if not region_id:
                return add_cors_headers(
                    JsonResponse({"error": "Região é obrigatória."}, status=400)
                )

            region = Region.objects.get(id=region_id, ativo=True)

            family = Family.objects.create(
                region=region,
                nome_responsavel=payload.get("nome_responsavel", ""),
                quantidade_moradores=payload.get("quantidade_moradores") or 1,
                codigo_viela=payload.get("codigo_viela", ""),
                cep=payload.get("cep", ""),
            )
        except Region.DoesNotExist:
            return add_cors_headers(
                JsonResponse({"error": "Região não encontrada."}, status=404)
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
            "region": (
                {
                    "id": family.region.id,
                    "nome": family.region.nome,
                    "codigo": family.region.codigo,
                }
                if family.region
                else None
            ),
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

    agent = family.assigned_agent
    agent_id = payload.get("agent_id")

    if agent_id:
        try:
            agent = FieldAgent.objects.get(id=agent_id)
        except FieldAgent.DoesNotExist:
            return add_cors_headers(
                JsonResponse({"error": "Agente não encontrado."}, status=404)
            )

    delivery = DeliveryLog.objects.create(
        family=family,
        agent=agent,
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
