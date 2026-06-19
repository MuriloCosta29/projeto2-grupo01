"""Fluxo E2E do Morador.

Cobre o que o morador faz sem login:

1. localizar o próprio cadastro e ver o histórico de entregas;
2. registrar uma denúncia anônima na ouvidoria e receber o protocolo.
"""

import unittest

from selenium.webdriver.common.by import By

from e2e.support import PilarE2ETestCase
from families.models import AnonymousComplaint, DeliveryLog, Family


class ResidentFlowE2ETests(PilarE2ETestCase):
    def test_resident_can_lookup_registration_and_view_delivery_history(self):
        family = Family.objects.create(
            region=self.region,
            nome_responsavel=self.family_name,
            telefone="81999990000",
            quantidade_moradores=4,
            codigo_viela=self.alley_code,
        )
        DeliveryLog.objects.create(
            family=family,
            notes="Entrega registrada pelo Presidente de Rua.",
        )

        self.report_step("Abrindo o PILAR")
        self.open_app()

        self.report_step("Selecionando perfil Morador")
        self.click_testid("entry-resident")

        self.report_step("Preenchendo identificação do morador")
        self.fill_field("nome_responsavel", self.normalized_family_name)
        self.fill_field("codigo_viela", self.normalized_alley_code)

        self.report_step("Acessando histórico do morador")
        self.click_button_containing("Acessar meu histórico")

        self.report_step("Validando home do morador")
        self.wait_url_contains("/morador")
        self.wait_for_text("Histórico de Entregas")
        self.wait_for_text(self.normalized_family_name)
        self.wait_for_text("Cesta Básica Recebida")
        self.wait_for_text("Entrega registrada pelo Presidente de Rua.")

    def test_resident_can_submit_anonymous_complaint_and_get_protocol(self):
        # O suffix entra na descrição para que o tearDown consiga limpar a denúncia.
        description = (
            f"Denuncia automatizada do teste E2E {self.suffix}: "
            "distribuicao com irregularidade na viela."
        )

        self.report_step("Abrindo o PILAR")
        self.open_app()

        self.report_step("Abrindo a ouvidoria anônima")
        self.click_testid("entry-complaint")
        self.wait_url_contains("/ouvidoria")

        self.report_step("Preenchendo a denúncia")
        self.select_by_text(By.NAME, "category", "Irregularidade na distribuição")
        self.fill_field("codigo_viela", self.alley_code)
        self.fill_field("description", description)

        self.report_step("Enviando a denúncia")
        self.click_testid("complaint-submit")

        self.report_step("Validando protocolo na interface")
        self.wait_for_text("Denúncia registrada. Protocolo:")
        protocol_element = self.wait_present(
            By.CSS_SELECTOR,
            "[data-testid='anonymous-complaint'] .status.success strong",
        )
        protocol = protocol_element.text.strip()
        self.assertTrue(
            protocol.startswith("OUV-"),
            f"Protocolo inesperado exibido na tela: {protocol!r}",
        )

        self.report_step("Validando denúncia no banco")
        complaint = AnonymousComplaint.objects.get(protocol=protocol)
        self.assertEqual(
            complaint.category,
            AnonymousComplaint.Category.IRREGULAR_DISTRIBUTION,
        )
        self.assertEqual(complaint.codigo_viela, self.normalized_alley_code)


if __name__ == "__main__":
    unittest.main()
