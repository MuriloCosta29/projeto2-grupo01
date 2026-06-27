"""Fluxo E2E do Administrador / Coordenação.

Cobre o que exige login de staff:

1. login + cadastro de região + cadastro de Presidente de Rua;
2. dashboard administrativo refletindo entregas por região;
3. processamento de avisos de disponibilidade de cesta por região.
"""

import unittest

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from e2e.support import PilarE2ETestCase
from families.models import (
    BasketAvailabilityNotification,
    DeliveryLog,
    Family,
    FieldAgent,
    Region,
)


class AdminFlowE2ETests(PilarE2ETestCase):
    def login_as_admin_via_ui(self) -> None:
        """Faz login de verdade pela tela administrativa.

        Usado só pelo teste que valida o próprio fluxo de login. Os demais
        testes usam `seed_admin_session()` para não consumir o endpoint de
        login, que é rate-limited.
        """
        self.create_admin_user()

        self.report_step("Abrindo login administrativo")
        self.open_app("/admin/login")

        self.report_step("Entrando como coordenação")
        self.fill_field("username", self.admin_username)
        self.fill_field("password", self.admin_password)
        self.click_button_containing("Entrar")

        self.wait_url_contains("/admin")
        self.wait_for_text("Cadastro de Regiões")

    def test_admin_can_login_create_region_and_create_field_agent(self):
        admin_region_name = f"Admin {self.tag}"
        normalized_admin_region_name = " ".join(admin_region_name.split()).title()
        agent_name = f"Agente {self.tag}"
        normalized_agent_name = " ".join(agent_name.split()).title()

        self.login_as_admin_via_ui()

        self.report_step("Cadastrando região pela interface admin")
        self.type_text(
            By.CSS_SELECTOR,
            "[data-testid='region-management'] input[name='nome']",
            admin_region_name,
        )
        self.click_testid("region-submit")
        self.wait_for_text("Região cadastrada com sucesso.")
        self.wait_for_text(normalized_admin_region_name)

        self.report_step("Cadastrando Presidente de Rua pela interface admin")
        self.type_text(
            By.CSS_SELECTOR,
            "[data-testid='field-agent-create'] input[name='nome']",
            agent_name,
        )
        self.type_text(
            By.CSS_SELECTOR,
            "[data-testid='field-agent-create'] input[name='telefone']",
            "81999990000",
        )
        self.type_text(
            By.CSS_SELECTOR,
            "[data-testid='field-agent-create'] input[name='area_atuacao']",
            "Viela Azul",
        )
        self.select_by_text(
            By.CSS_SELECTOR,
            "[data-testid='field-agent-create'] select[name='region_id']",
            normalized_admin_region_name,
        )
        self.click_testid("field-agent-submit")
        self.wait_for_text("Presidente de Rua cadastrado com sucesso.")
        self.wait_for_text(normalized_agent_name)

        self.report_step("Validando região e Presidente de Rua no banco")
        created_region = Region.objects.get(nome=normalized_admin_region_name)
        self.assertTrue(
            FieldAgent.objects.filter(
                nome=normalized_agent_name,
                region=created_region,
            ).exists()
        )

    def test_admin_dashboard_reflects_region_delivery_metrics(self):
        # Uma entrega na região de teste deve aparecer no dashboard por região.
        family = Family.objects.create(
            region=self.region,
            nome_responsavel=self.family_name,
            telefone="81999990000",
            quantidade_moradores=4,
            codigo_viela=self.alley_code,
        )
        DeliveryLog.objects.create(family=family, notes="Entrega de teste E2E.")

        self.seed_admin_session()

        self.report_step("Abrindo o dashboard de entregas por região")
        self.wait_for_text("Entregas por Região")
        self.select_by_text(
            By.CSS_SELECTOR,
            ".region-dashboard select",
            self.region.nome,
        )

        self.report_step("Validando métrica de cestas entregues da região")
        deliveries_metric = self.wait_present(
            By.CSS_SELECTOR,
            ".region-dashboard .region-metrics article:first-child strong",
        )
        self.wait.until(
            EC.text_to_be_present_in_element(
                (
                    By.CSS_SELECTOR,
                    ".region-dashboard .region-metrics article:first-child strong",
                ),
                "1",
            )
        )
        self.assertEqual(deliveries_metric.text.strip(), "1")

    def test_admin_can_process_basket_availability_notifications(self):
        # Família com telefone => aviso fica "pronto para WhatsApp".
        family = Family.objects.create(
            region=self.region,
            nome_responsavel=self.family_name,
            telefone="81999990000",
            quantidade_moradores=4,
            codigo_viela=self.alley_code,
        )

        self.seed_admin_session()

        self.report_step("Abrindo o processamento de avisos de cesta")
        self.wait_for_text("Disponibilidade de Cestas")
        scope = "[data-testid='basket-availability']"

        self.report_step("Selecionando região e dados da retirada")
        self.select_by_text(
            By.CSS_SELECTOR,
            f"{scope} select[name='region_id']",
            self.region.nome,
        )
        # Inputs date/time são não-controlados: setar o value via JS é mais
        # estável que send_keys, que depende do locale do Chrome.
        self.set_input_value(f"{scope} input[name='scheduled_date']", "2026-06-20")
        self.set_input_value(f"{scope} input[name='scheduled_time']", "10:30")
        self.type_text(
            By.CSS_SELECTOR,
            f"{scope} input[name='pickup_location']",
            "Avenida Norte",
        )

        self.report_step("Processando os avisos")
        self.click_testid("basket-availability-submit")

        self.report_step("Validando feedback de processamento")
        self.wait_for_text("aviso(s) processado(s)")
        self.wait_for_text(self.normalized_family_name)

        self.report_step("Validando notificação no banco")
        notification = BasketAvailabilityNotification.objects.get(family=family)
        self.assertEqual(notification.region, self.region)
        self.assertEqual(notification.pickup_location, "Avenida Norte")
        self.assertEqual(
            notification.status,
            BasketAvailabilityNotification.Status.READY,
        )

    def set_input_value(self, css_selector: str, value: str) -> None:
        element = self.wait_present(By.CSS_SELECTOR, css_selector)
        self.driver.execute_script("arguments[0].value = arguments[1];", element, value)


if __name__ == "__main__":
    unittest.main()
