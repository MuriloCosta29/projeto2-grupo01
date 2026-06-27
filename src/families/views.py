from django.db import IntegrityError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.contrib.auth import authenticate
from django.views.generic import CreateView, TemplateView
from django.http import JsonResponse
import json
from urllib.parse import quote

from .auth import admin_only, require_admin
from .cors import add_cors_headers
from .forms import FamilyForm
from .ratelimit import rate_limit
from .models import (
    AnonymousComplaint,
    AuthToken,
    BasketAvailabilityNotification,
    DeliveryLog,
    Family,
    FieldAgent,
    Region,
)


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


def serialize_region(region):
    return {
        "id": region.id,
        "nome": region.nome,
        "ativo": region.ativo,
    }


@csrf_exempt
def regions_api(request):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method == "GET":
        data = [
            serialize_region(region)
            for region in Region.objects.filter(ativo=True)
        ]

        return add_cors_headers(JsonResponse(data, safe=False))

    if request.method != "POST":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    _, error = require_admin(request)
    if error:
        return error

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return add_cors_headers(JsonResponse({"error": "JSON inválido."}, status=400))

    nome = str(payload.get("nome", "")).strip()

    if not nome:
        return add_cors_headers(
            JsonResponse({"error": "Nome da região é obrigatório."}, status=400)
        )

    try:
        region = Region.objects.create(
            nome=nome,
            ativo=payload.get("ativo", True),
        )
    except IntegrityError:
        return add_cors_headers(
            JsonResponse(
                {"error": "Já existe uma região com esse nome."},
                status=400,
            )
        )

    return add_cors_headers(JsonResponse(serialize_region(region), status=201))


def serialize_field_agent(agent):
    deliveries = list(agent.deliveries.all())
    attended_families = {
        delivery.family_id: delivery.family.nome_responsavel
        for delivery in deliveries
    }

    return {
        "id": agent.id,
        "region": (
            {
                "id": agent.region.id,
                "nome": agent.region.nome,
            }
            if agent.region
            else None
        ),
        "nome": agent.nome,
        "telefone": agent.telefone,
        "area_atuacao": agent.area_atuacao,
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


def get_active_region_or_none(region_id):
    if not region_id:
        return None

    return Region.objects.get(id=region_id, ativo=True)


@csrf_exempt
def field_agents_api(request):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method == "GET":
        agents = FieldAgent.objects.select_related("region").prefetch_related(
            "assigned_families",
            "deliveries__family",
        ).all()

        return add_cors_headers(
            JsonResponse(
                [serialize_field_agent(agent) for agent in agents],
                safe=False,
            )
        )

    if request.method != "POST":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    _, error = require_admin(request)
    if error:
        return error

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return add_cors_headers(JsonResponse({"error": "JSON inválido."}, status=400))

    nome = str(payload.get("nome", "")).strip()

    if not nome:
        return add_cors_headers(
            JsonResponse({"error": "Nome é obrigatório."}, status=400)
        )

    try:
        region = get_active_region_or_none(payload.get("region_id"))
    except Region.DoesNotExist:
        return add_cors_headers(
            JsonResponse({"error": "Região não encontrada."}, status=404)
        )

    agent = FieldAgent.objects.create(
        region=region,
        nome=nome,
        telefone=payload.get("telefone", ""),
        area_atuacao=payload.get("area_atuacao", ""),
        ativo=payload.get("ativo", True),
    )

    return add_cors_headers(JsonResponse(serialize_field_agent(agent), status=201))


@csrf_exempt
@admin_only
def field_agent_detail_api(request, agent_id):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method != "PATCH":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    try:
        agent = FieldAgent.objects.get(id=agent_id)
    except FieldAgent.DoesNotExist:
        return add_cors_headers(
            JsonResponse({"error": "Presidente de Rua não encontrado."}, status=404)
        )

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return add_cors_headers(JsonResponse({"error": "JSON inválido."}, status=400))

    if "nome" in payload:
        nome = str(payload.get("nome", "")).strip()

        if not nome:
            return add_cors_headers(
                JsonResponse({"error": "Nome é obrigatório."}, status=400)
            )

        agent.nome = nome

    if "telefone" in payload:
        agent.telefone = payload.get("telefone", "")

    if "area_atuacao" in payload:
        agent.area_atuacao = payload.get("area_atuacao", "")

    if "ativo" in payload:
        agent.ativo = bool(payload.get("ativo"))

    if "region_id" in payload:
        try:
            agent.region = get_active_region_or_none(payload.get("region_id"))
        except Region.DoesNotExist:
            return add_cors_headers(
                JsonResponse({"error": "Região não encontrada."}, status=404)
            )

    agent.save()

    agent = FieldAgent.objects.select_related("region").prefetch_related(
        "assigned_families",
        "deliveries__family",
    ).get(id=agent.id)

    return add_cors_headers(JsonResponse(serialize_field_agent(agent)))


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


@csrf_exempt
@rate_limit("login", limit=10, window_seconds=600)
def login_api(request):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method != "POST":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return add_cors_headers(JsonResponse({"error": "JSON inválido."}, status=400))

    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    user = authenticate(username=username, password=password)

    # Só staff (admin/coordenação) entra no painel.
    if user is None or not user.is_staff:
        return add_cors_headers(
            JsonResponse({"error": "Credenciais inválidas."}, status=401)
        )

    token = AuthToken.objects.create(user=user)

    return add_cors_headers(
        JsonResponse(
            {"token": token.key, "username": user.username},
            status=201,
        )
    )


@csrf_exempt
@admin_only
def logout_api(request):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method != "POST":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    header = request.META.get("HTTP_AUTHORIZATION", "")
    key = header[len("Token "):].strip()
    AuthToken.objects.filter(key=key).delete()

    return add_cors_headers(JsonResponse({"ok": True}))


def serialize_notification(notification):
    return {
        "id": notification.id,
        "family": {
            "id": notification.family.id,
            "nome_responsavel": notification.family.nome_responsavel,
            "telefone": notification.family.telefone,
        },
        "region": (
            {
                "id": notification.region.id,
                "nome": notification.region.nome,
            }
            if notification.region
            else None
        ),
        "channel": notification.channel,
        "status": notification.status,
        "scheduled_for": notification.scheduled_for.isoformat(),
        "pickup_location": notification.pickup_location,
        "message": notification.message,
        "contact_value": notification.contact_value,
        "notification_url": notification.notification_url,
        "processed_at": notification.processed_at.isoformat(),
        "created_at": notification.created_at.isoformat(),
    }


def normalize_phone_for_whatsapp(phone):
    digits = "".join(character for character in phone if character.isdigit())

    if len(digits) in (10, 11):
        return f"55{digits}"

    return digits


def build_availability_message(family, scheduled_for, pickup_location):
    local_scheduled_for = timezone.localtime(scheduled_for)
    formatted_date = local_scheduled_for.strftime("%d/%m/%Y às %H:%M")

    return (
        f"Olá, {family.nome_responsavel}! Sua cesta básica está disponível "
        f"em {pickup_location} no dia {formatted_date}. "
        "Presidente de Rua - G10 Favelas."
    )


def build_whatsapp_url(phone, message):
    normalized_phone = normalize_phone_for_whatsapp(phone)

    if not normalized_phone:
        return ""

    return f"https://wa.me/{normalized_phone}?text={quote(message)}"


@csrf_exempt
@rate_limit("anonymous_complaints", limit=10, window_seconds=600)
def anonymous_complaints_api(request):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method != "POST":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return add_cors_headers(JsonResponse({"error": "JSON inválido."}, status=400))

    description = str(payload.get("description", "")).strip()
    category = payload.get("category") or AnonymousComplaint.Category.OTHER
    region_id = payload.get("region_id")
    codigo_viela = str(payload.get("codigo_viela", "")).strip()

    if category not in AnonymousComplaint.Category.values:
        return add_cors_headers(
            JsonResponse({"error": "Categoria inválida."}, status=400)
        )

    if len(description) < 10:
        return add_cors_headers(
            JsonResponse(
                {"error": "A denúncia precisa ter pelo menos 10 caracteres."},
                status=400,
            )
        )

    region = None

    if region_id:
        try:
            region = Region.objects.get(id=region_id, ativo=True)
        except Region.DoesNotExist:
            return add_cors_headers(
                JsonResponse({"error": "Região não encontrada."}, status=404)
            )

    complaint = AnonymousComplaint.objects.create(
        region=region,
        codigo_viela=codigo_viela,
        category=category,
        description=description,
    )

    return add_cors_headers(
        JsonResponse(
            {
                "protocol": complaint.protocol,
                "status": complaint.status,
                "created_at": complaint.created_at.isoformat(),
            },
            status=201,
        )
    )


@csrf_exempt
def basket_availability_notifications_api(request):
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method == "GET":
        notifications = BasketAvailabilityNotification.objects.select_related(
            "family",
            "region",
        ).all()[:50]

        return add_cors_headers(
            JsonResponse(
                [serialize_notification(notification) for notification in notifications],
                safe=False,
            )
        )

    if request.method != "POST":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    _, error = require_admin(request)
    if error:
        return error

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return add_cors_headers(JsonResponse({"error": "JSON inválido."}, status=400))

    region_id = payload.get("region_id")
    scheduled_for_value = payload.get("scheduled_for")
    pickup_location = str(payload.get("pickup_location", "")).strip()

    if not region_id:
        return add_cors_headers(
            JsonResponse({"error": "Região é obrigatória."}, status=400)
        )

    if not scheduled_for_value:
        return add_cors_headers(
            JsonResponse({"error": "Data e horário são obrigatórios."}, status=400)
        )

    if not pickup_location:
        return add_cors_headers(
            JsonResponse({"error": "Local de retirada é obrigatório."}, status=400)
        )

    scheduled_for = parse_datetime(scheduled_for_value)

    if scheduled_for is None:
        return add_cors_headers(
            JsonResponse({"error": "Data e horário inválidos."}, status=400)
        )

    if timezone.is_naive(scheduled_for):
        scheduled_for = timezone.make_aware(
            scheduled_for,
            timezone.get_current_timezone(),
        )

    try:
        region = Region.objects.get(id=region_id, ativo=True)
    except Region.DoesNotExist:
        return add_cors_headers(
            JsonResponse({"error": "Região não encontrada."}, status=404)
        )

    families = Family.objects.filter(region=region).order_by_priority()
    notifications = []
    created_count = 0

    for family in families:
        message = build_availability_message(family, scheduled_for, pickup_location)
        notification_url = build_whatsapp_url(family.telefone, message)
        status = (
            BasketAvailabilityNotification.Status.READY
            if notification_url
            else BasketAvailabilityNotification.Status.NO_CONTACT
        )

        notification, created = BasketAvailabilityNotification.objects.get_or_create(
            family=family,
            scheduled_for=scheduled_for,
            pickup_location=pickup_location,
            defaults={
                "region": region,
                "channel": BasketAvailabilityNotification.Channel.WHATSAPP,
                "status": status,
                "message": message,
                "contact_value": family.telefone,
                "notification_url": notification_url,
            },
        )

        if created:
            created_count += 1

        notifications.append(notification)

    return add_cors_headers(
        JsonResponse(
            {
                "created_count": created_count,
                "total_notifications": len(notifications),
                "notifications": [
                    serialize_notification(notification)
                    for notification in notifications
                ],
            },
            status=201,
        )
    )


@csrf_exempt
def family_lookup_api(request):
    """Identifica um morador pelo próprio registro (nome + código da viela).

    Recebe `nome_responsavel` e `codigo_viela` como query params e devolve
    somente os dados daquela família — sem expor o cadastro completo do banco.
    A comparação é case-insensitive para tolerar variações de digitação.
    """
    if request.method == "OPTIONS":
        return add_cors_headers(JsonResponse({}))

    if request.method != "GET":
        return add_cors_headers(
            JsonResponse({"error": "Método não permitido."}, status=405)
        )

    nome = request.GET.get("nome_responsavel", "").strip()
    viela = request.GET.get("codigo_viela", "").strip()

    if not nome or not viela:
        return add_cors_headers(
            JsonResponse(
                {"error": "Nome e código da viela são obrigatórios."},
                status=400,
            )
        )

    try:
        family = (
            Family.objects.select_related("region")
            .prefetch_related("deliveries")
            .get(
                nome_responsavel__iexact=nome,
                codigo_viela__iexact=viela,
            )
        )
    except Family.DoesNotExist:
        return add_cors_headers(
            JsonResponse({"error": "Cadastro não encontrado."}, status=404)
        )

    data = {
        "id": family.id,
        "region": (
            {
                "id": family.region.id,
                "nome": family.region.nome,
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

    return add_cors_headers(JsonResponse(data))


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
                telefone=payload.get("telefone", ""),
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
