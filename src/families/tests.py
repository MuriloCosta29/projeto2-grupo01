import json

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse

from .forms import FamilyForm
from .models import (
    AnonymousComplaint,
    AuthToken,
    BasketAvailabilityNotification,
    DeliveryLog,
    Family,
    FieldAgent,
    Region,
)


def admin_auth_headers(username="coordenacao"):
    """Cria um usuário staff + token e devolve o header de Authorization pronto."""
    user = get_user_model().objects.create_user(
        username=username,
        password="senha-forte-123",
        is_staff=True,
    )
    token = AuthToken.objects.create(user=user)
    return {"HTTP_AUTHORIZATION": f"Token {token.key}"}


class FamilyModelTests(TestCase):
    def test_family_can_be_created_without_cep(self):
        family = Family.objects.create(
            nome_responsavel="Carlos Oliveira",
            codigo_viela="Viela Azul",
            quantidade_moradores=4,
            cep="",
        )

        self.assertEqual(family.cep, "")
        self.assertEqual(family.nome_responsavel, "Carlos Oliveira")
        self.assertEqual(family.codigo_viela, "viela azul")
        self.assertEqual(str(family), "Carlos Oliveira - viela azul")

    def test_duplicate_family_by_name_and_alley_is_blocked_by_database(self):
        Family.objects.create(
            nome_responsavel="Carlos Oliveira",
            codigo_viela="Viela Azul",
            quantidade_moradores=4,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Family.objects.create(
                    nome_responsavel="carlos oliveira",
                    codigo_viela="viela azul",
                    quantidade_moradores=3,
                )


class RegionModelTests(TestCase):
    def test_region_name_and_code_are_normalized(self):
        region = Region.objects.create(nome="  zona norte  ", codigo=" ZONA NORTE ")

        self.assertEqual(region.nome, "Zona Norte")
        self.assertEqual(region.codigo, "zona norte")

    def test_duplicate_region_code_is_blocked_after_normalization(self):
        Region.objects.create(nome="Zona Norte", codigo="zona norte")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Region.objects.create(nome="Norte", codigo=" ZONA NORTE ")


class FamilyFormTests(TestCase):
    def test_duplicate_family_by_name_and_alley_is_blocked_by_form(self):
        Family.objects.create(
            nome_responsavel="Carlos Oliveira",
            codigo_viela="Viela Azul",
            quantidade_moradores=4,
        )

        form = FamilyForm(
            data={
                "nome_responsavel": "carlos oliveira",
                "telefone": "",
                "codigo_viela": "viela azul",
                "complemento": "",
                "bairro": "",
                "cep": "",
                "cidade": "São Paulo",
                "estado": "SP",
                "quantidade_moradores": 3,
                "observacoes": "",
            }
        )

        self.assertFalse(form.is_valid())
        self.assertIn("Possível duplicidade", str(form.errors))


class FamilyApiTests(TestCase):
    def test_family_api_requires_region(self):
        response = self.client.post(
            "/api/families/",
            data=json.dumps(
                {
                    "nome_responsavel": "Carlos Oliveira",
                    "codigo_viela": "Viela Azul",
                    "quantidade_moradores": 4,
                    "cep": "",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Região é obrigatória.")

    def test_family_api_creates_family_with_region(self):
        region = Region.objects.create(nome="Norte", codigo="norte")

        response = self.client.post(
            "/api/families/",
            data=json.dumps(
                {
                    "region_id": region.id,
                    "nome_responsavel": "Carlos Oliveira",
                    "codigo_viela": "Viela Azul",
                    "quantidade_moradores": 4,
                    "cep": "",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["region"]["nome"], "Norte")
        self.assertEqual(Family.objects.get().region, region)


class AnonymousComplaintApiTests(TestCase):
    def setUp(self):
        # Zera o contador do rate limit entre os testes.
        cache.clear()

    def test_anonymous_complaint_can_be_registered_without_identity(self):
        region = Region.objects.create(nome="Norte", codigo="norte")

        response = self.client.post(
            "/api/anonymous-complaints/",
            data=json.dumps(
                {
                    "region_id": region.id,
                    "codigo_viela": "Viela Azul",
                    "category": "irregular_distribution",
                    "description": "Entrega foi desviada antes de chegar na viela.",
                    "nome": "Pessoa que não deve ser salva",
                    "telefone": "81999990000",
                }
            ),
            content_type="application/json",
        )

        complaint = AnonymousComplaint.objects.get()
        response_data = response.json()

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response_data["protocol"].startswith("OUV-"))
        self.assertEqual(complaint.region, region)
        self.assertEqual(complaint.codigo_viela, "viela azul")
        self.assertEqual(complaint.status, "new")
        self.assertNotIn("nome", response_data)
        self.assertNotIn("telefone", response_data)

    def test_anonymous_complaint_requires_minimum_description(self):
        response = self.client.post(
            "/api/anonymous-complaints/",
            data=json.dumps(
                {
                    "category": "other",
                    "description": "curta",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(AnonymousComplaint.objects.count(), 0)

    def test_anonymous_complaint_rejects_invalid_category(self):
        response = self.client.post(
            "/api/anonymous-complaints/",
            data=json.dumps(
                {
                    "category": "identificacao_pessoal",
                    "description": "Existe uma irregularidade para investigar.",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Categoria inválida.")

    def test_anonymous_complaint_is_rate_limited_after_limit(self):
        payload = json.dumps(
            {
                "category": "other",
                "description": "Existe uma irregularidade para investigar.",
            }
        )

        for _ in range(10):
            allowed_response = self.client.post(
                "/api/anonymous-complaints/",
                data=payload,
                content_type="application/json",
            )
            self.assertEqual(allowed_response.status_code, 201)

        blocked_response = self.client.post(
            "/api/anonymous-complaints/",
            data=payload,
            content_type="application/json",
        )

        self.assertEqual(blocked_response.status_code, 429)
        self.assertEqual(AnonymousComplaint.objects.count(), 10)


class DeliveryLogModelTests(TestCase):
    def test_family_can_have_multiple_delivery_logs(self):
        family = Family.objects.create(
            nome_responsavel="Carlos Oliveira",
            codigo_viela="Viela Azul",
            quantidade_moradores=4,
        )

        DeliveryLog.objects.create(
            family=family,
            delivery_date="2026-05-01",
            notes="Primeira entrega",
        )
        DeliveryLog.objects.create(
            family=family,
            delivery_date="2026-05-10",
            notes="Segunda entrega",
        )

        self.assertEqual(family.deliveries.count(), 2)
        self.assertEqual(family.deliveries.first().notes, "Segunda entrega")


class PriorityQueueTests(TestCase):
    def test_families_are_ordered_by_priority_queue(self):
        never_received = Family.objects.create(
            nome_responsavel="Ana Souza",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )

        received_long_ago = Family.objects.create(
            nome_responsavel="Bruno Lima",
            codigo_viela="Viela 02",
            quantidade_moradores=5,
        )

        received_recently = Family.objects.create(
            nome_responsavel="Carla Santos",
            codigo_viela="Viela 03",
            quantidade_moradores=2,
        )

        DeliveryLog.objects.create(
            family=received_long_ago,
            delivery_date="2026-04-01",
            notes="Entrega antiga",
        )

        DeliveryLog.objects.create(
            family=received_recently,
            delivery_date="2026-05-20",
            notes="Entrega recente",
        )

        families = Family.objects.order_by_priority()

        self.assertEqual(
            list(families),
            [
                never_received,
                received_long_ago,
                received_recently,
            ],
        )


class DeliveryRegistrationApiTests(TestCase):
    def test_delivery_can_be_registered_for_family(self):
        family = Family.objects.create(
            nome_responsavel="Ana Souza",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )

        response = self.client.post(
            f"/api/families/{family.id}/deliveries/",
            data={
                "notes": "Entrega confirmada em campo.",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(family.deliveries.count(), 1)

        delivery = family.deliveries.first()

        self.assertEqual(delivery.notes, "Entrega confirmada em campo.")

    def test_delivery_uses_family_assigned_agent(self):
        agent = FieldAgent.objects.create(nome="João Presidente")
        family = Family.objects.create(
            assigned_agent=agent,
            nome_responsavel="Ana Souza",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )

        response = self.client.post(
            f"/api/families/{family.id}/deliveries/",
            data={},
            content_type="application/json",
        )

        delivery = family.deliveries.first()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(delivery.agent, agent)

    def test_delivery_can_use_selected_agent(self):
        agent = FieldAgent.objects.create(nome="Maria Presidente")
        family = Family.objects.create(
            nome_responsavel="Ana Souza",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )

        response = self.client.post(
            f"/api/families/{family.id}/deliveries/",
            data={"agent_id": agent.id},
            content_type="application/json",
        )

        delivery = family.deliveries.first()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(delivery.agent, agent)


class DashboardImpactApiTests(TestCase):
    def test_dashboard_shows_total_deliveries(self):
        first_family = Family.objects.create(
            nome_responsavel="Ana Souza",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )
        second_family = Family.objects.create(
            nome_responsavel="Bruno Lima",
            codigo_viela="Viela 02",
            quantidade_moradores=5,
        )

        DeliveryLog.objects.create(family=first_family)
        DeliveryLog.objects.create(family=second_family)

        response = self.client.get("/api/dashboard/impact/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_deliveries"], 2)


class DashboardRegionsApiTests(TestCase):
    def setUp(self):
        self.auth = admin_auth_headers()

    def test_dashboard_filters_deliveries_by_region(self):
        north_region = Region.objects.create(nome="Norte", codigo="norte")
        south_region = Region.objects.create(nome="Sul", codigo="sul")

        north_family = Family.objects.create(
            region=north_region,
            nome_responsavel="Ana Souza",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )
        south_family = Family.objects.create(
            region=south_region,
            nome_responsavel="Bruno Lima",
            codigo_viela="Viela 02",
            quantidade_moradores=5,
        )

        DeliveryLog.objects.create(family=north_family)
        DeliveryLog.objects.create(family=north_family)
        DeliveryLog.objects.create(family=south_family)

        response = self.client.get("/api/dashboard/regions/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "region": "Norte",
                    "families_count": 1,
                    "total_deliveries": 2,
                },
                {
                    "region": "Sul",
                    "families_count": 1,
                    "total_deliveries": 1,
                },
            ],
        )

    def test_regions_api_lists_active_regions(self):
        Region.objects.create(nome="Norte", codigo="norte")
        Region.objects.create(nome="Sul", codigo="sul", ativo=False)

        response = self.client.get("/api/regions/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": Region.objects.get(codigo="norte").id,
                    "nome": "Norte",
                    "codigo": "norte",
                    "ativo": True,
                }
            ],
        )

    def test_regions_api_creates_region_for_admin_system(self):
        response = self.client.post(
            "/api/regions/",
            data=json.dumps(
                {
                    "nome": "  recife  ",
                    "codigo": "",
                }
            ),
            content_type="application/json",
            **self.auth,
        )

        region = Region.objects.get()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(region.nome, "Recife")
        self.assertEqual(region.codigo, "recife")
        self.assertTrue(region.ativo)
        self.assertEqual(response.json()["nome"], "Recife")

    def test_regions_api_rejects_duplicate_region(self):
        Region.objects.create(nome="Recife", codigo="recife")

        response = self.client.post(
            "/api/regions/",
            data=json.dumps(
                {
                    "nome": "recife",
                }
            ),
            content_type="application/json",
            **self.auth,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["error"],
            "Já existe uma região com esse nome ou código.",
        )


class BasketAvailabilityNotificationApiTests(TestCase):
    def setUp(self):
        self.auth = admin_auth_headers()

    def test_processes_basket_availability_notifications_by_region(self):
        north_region = Region.objects.create(nome="Norte", codigo="norte")
        south_region = Region.objects.create(nome="Sul", codigo="sul")
        notified_family = Family.objects.create(
            region=north_region,
            nome_responsavel="Ana Souza",
            telefone="81999990000",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )
        Family.objects.create(
            region=south_region,
            nome_responsavel="Bruno Lima",
            telefone="81988880000",
            codigo_viela="Viela 02",
            quantidade_moradores=4,
        )

        response = self.client.post(
            "/api/basket-availability-notifications/",
            data=json.dumps(
                {
                    "region_id": north_region.id,
                    "scheduled_for": "2026-06-10T09:00:00",
                    "pickup_location": "Associação Comunitária",
                }
            ),
            content_type="application/json",
            **self.auth,
        )

        notification = BasketAvailabilityNotification.objects.get()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["created_count"], 1)
        self.assertEqual(notification.family, notified_family)
        self.assertEqual(notification.status, "ready")
        self.assertIn("Associação Comunitária", notification.message)
        self.assertIn("https://wa.me/5581999990000", notification.notification_url)

    def test_marks_notification_without_phone_as_no_contact(self):
        region = Region.objects.create(nome="Norte", codigo="norte")
        Family.objects.create(
            region=region,
            nome_responsavel="Ana Souza",
            telefone="",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )

        response = self.client.post(
            "/api/basket-availability-notifications/",
            data=json.dumps(
                {
                    "region_id": region.id,
                    "scheduled_for": "2026-06-10T09:00:00",
                    "pickup_location": "Associação Comunitária",
                }
            ),
            content_type="application/json",
            **self.auth,
        )

        notification = BasketAvailabilityNotification.objects.get()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(notification.status, "no_contact")
        self.assertEqual(notification.notification_url, "")

    def test_does_not_duplicate_same_availability_notification_batch(self):
        region = Region.objects.create(nome="Norte", codigo="norte")
        Family.objects.create(
            region=region,
            nome_responsavel="Ana Souza",
            telefone="81999990000",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )
        payload = {
            "region_id": region.id,
            "scheduled_for": "2026-06-10T09:00:00",
            "pickup_location": "Associação Comunitária",
        }

        self.client.post(
            "/api/basket-availability-notifications/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth,
        )
        response = self.client.post(
            "/api/basket-availability-notifications/",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["created_count"], 0)
        self.assertEqual(BasketAvailabilityNotification.objects.count(), 1)


class FieldAgentMonitoringApiTests(TestCase):
    def setUp(self):
        self.auth = admin_auth_headers()

    def test_field_agent_can_be_created_by_coordination(self):
        region = Region.objects.create(nome="Norte", codigo="norte")

        response = self.client.post(
            "/api/field-agents/",
            data=json.dumps(
                {
                    "region_id": region.id,
                    "nome": "joão presidente",
                    "telefone": "81999990000",
                    "codigo_area": "Setor Norte",
                }
            ),
            content_type="application/json",
            **self.auth,
        )

        agent = FieldAgent.objects.get()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(agent.nome, "João Presidente")
        self.assertEqual(agent.telefone, "81999990000")
        self.assertEqual(agent.codigo_area, "Setor Norte")
        self.assertEqual(agent.region, region)
        self.assertTrue(agent.ativo)

    def test_field_agent_can_be_updated_by_coordination(self):
        agent = FieldAgent.objects.create(nome="João Presidente")
        region = Region.objects.create(nome="Sul", codigo="sul")

        response = self.client.patch(
            f"/api/field-agents/{agent.id}/",
            data=json.dumps(
                {
                    "region_id": region.id,
                    "nome": "joão coordenador",
                    "telefone": "81988880000",
                    "codigo_area": "Setor Sul",
                    "ativo": False,
                }
            ),
            content_type="application/json",
            **self.auth,
        )

        agent.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(agent.nome, "João Coordenador")
        self.assertEqual(agent.telefone, "81988880000")
        self.assertEqual(agent.codigo_area, "Setor Sul")
        self.assertEqual(agent.region, region)
        self.assertFalse(agent.ativo)

    def test_field_agent_creation_requires_name(self):
        response = self.client.post(
            "/api/field-agents/",
            data=json.dumps(
                {
                    "nome": "",
                    "codigo_area": "Setor Norte",
                }
            ),
            content_type="application/json",
            **self.auth,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "Nome é obrigatório.")

    def test_field_agent_monitoring_shows_attended_families_and_frequency(self):
        agent = FieldAgent.objects.create(
            nome="João Presidente",
            codigo_area="Setor Norte",
        )
        first_family = Family.objects.create(
            assigned_agent=agent,
            nome_responsavel="Ana Souza",
            codigo_viela="Viela 01",
            quantidade_moradores=3,
        )
        second_family = Family.objects.create(
            assigned_agent=agent,
            nome_responsavel="Bruno Lima",
            codigo_viela="Viela 02",
            quantidade_moradores=5,
        )

        DeliveryLog.objects.create(family=first_family, agent=agent)
        DeliveryLog.objects.create(family=second_family, agent=agent)

        response = self.client.get("/api/field-agents/")
        agent_data = response.json()[0]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(agent_data["nome"], "João Presidente")
        self.assertEqual(agent_data["assigned_families_count"], 2)
        self.assertEqual(agent_data["attended_families_count"], 2)
        self.assertEqual(agent_data["deliveries_count"], 2)
        self.assertEqual(
            agent_data["attended_families"],
            [
                {"id": first_family.id, "nome_responsavel": "Ana Souza"},
                {"id": second_family.id, "nome_responsavel": "Bruno Lima"},
            ],
        )


class AuthApiTests(TestCase):
    def setUp(self):
        cache.clear()  # o login tem rate limit; zera entre os testes
        self.user = get_user_model().objects.create_user(
            username="coord",
            password="senha-forte-123",
            is_staff=True,
        )

    def test_login_returns_token_for_staff(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "coord", "password": "senha-forte-123"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("token", response.json())
        self.assertEqual(AuthToken.objects.count(), 1)

    def test_login_rejects_wrong_password(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "coord", "password": "errada"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(AuthToken.objects.count(), 0)

    def test_login_rejects_non_staff_user(self):
        get_user_model().objects.create_user(
            username="morador",
            password="senha-forte-123",
            is_staff=False,
        )

        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps(
                {"username": "morador", "password": "senha-forte-123"}
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_protected_endpoint_requires_token(self):
        response = self.client.post(
            "/api/regions/",
            data=json.dumps({"nome": "Norte"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(Region.objects.count(), 0)

    def test_protected_endpoint_accepts_valid_token(self):
        token = AuthToken.objects.create(user=self.user)

        response = self.client.post(
            "/api/regions/",
            data=json.dumps({"nome": "Norte"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Token {token.key}",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Region.objects.count(), 1)

    def test_logout_invalidates_token(self):
        token = AuthToken.objects.create(user=self.user)
        auth = {"HTTP_AUTHORIZATION": f"Token {token.key}"}

        logout_response = self.client.post("/api/auth/logout/", **auth)

        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(AuthToken.objects.count(), 0)

        blocked = self.client.post(
            "/api/regions/",
            data=json.dumps({"nome": "Norte"}),
            content_type="application/json",
            **auth,
        )

        self.assertEqual(blocked.status_code, 401)
