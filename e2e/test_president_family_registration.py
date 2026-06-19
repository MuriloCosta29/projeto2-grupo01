"""Fluxo E2E do Presidente de Rua.

Cobre as duas ações operacionais centrais do perfil:

1. cadastrar uma família e vê-la entrar na fila de prioridade;
2. registrar a entrega de uma cesta para uma família existente.

O nome do arquivo é mantido por compatibilidade com o comando histórico
`python -m unittest e2e.test_president_family_registration`.
"""

import unittest

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from e2e.support import PilarE2ETestCase
from families.models import DeliveryLog, Family


class PresidentFlowE2ETests(PilarE2ETestCase):
    def test_president_can_register_family_and_see_it_in_the_queue(self):
        self.report_step("Abrindo o PILAR")
        self.open_app()

        self.report_step("Selecionando perfil Presidente de Rua")
        self.click_testid("entry-president")

        self.report_step("Abrindo cadastro de família")
        self.click_button_containing("Cadastrar Família")

        self.report_step("Preenchendo dados da família")
        self.fill_field("nome_responsavel", self.family_name)
        self.fill_field("quantidade_moradores", "4")
        self.fill_field("telefone", "81999990000")
        self.fill_field("codigo_viela", self.alley_code)

        self.report_step("Selecionando região")
        self.select_by_text(By.NAME, "region_id", self.region.nome)

        self.report_step("Salvando família")
        self.click_button_containing("Salvar família")

        self.report_step("Validando redirecionamento para lista")
        self.wait_url_contains("/presidente/familias")

        self.report_step("Validando família na interface")
        self.wait_for_text(self.normalized_family_name)

        self.report_step("Validando família no banco")
        self.assertTrue(
            Family.objects.filter(
                nome_responsavel=self.normalized_family_name,
                codigo_viela=self.normalized_alley_code,
                region=self.region,
            ).exists()
        )

    def test_president_can_register_a_delivery_from_the_family_list(self):
        # Família existente sem entrega: o teste valida o registro pela interface.
        family = Family.objects.create(
            region=self.region,
            nome_responsavel=self.family_name,
            telefone="81999990000",
            quantidade_moradores=4,
            codigo_viela=self.alley_code,
        )
        self.assertEqual(family.deliveries.count(), 0)

        self.report_step("Abrindo o PILAR")
        self.open_app()

        self.report_step("Selecionando perfil Presidente de Rua")
        self.click_testid("entry-president")

        self.report_step("Abrindo a lista de famílias")
        self.click_button_containing("Ver Famílias")
        self.wait_url_contains("/presidente/familias")

        self.report_step("Filtrando pela família de teste")
        self.type_text(
            By.CSS_SELECTOR,
            ".search-field input",
            self.normalized_family_name,
        )

        self.report_step("Selecionando a família na fila")
        self.click_button_containing(self.normalized_family_name)

        self.report_step("Confirmando a entrega da cesta")
        # Espera o painel de detalhes da família selecionada antes de confirmar.
        self.wait.until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, ".family-detail-header"),
                self.normalized_family_name,
            )
        )
        self.click_testid("confirm-delivery")

        self.report_step("Validando feedback de sucesso")
        self.wait_for_text("Entrega registrada com sucesso.")

        self.report_step("Validando entrega no banco")
        self.assertTrue(
            DeliveryLog.objects.filter(family=family).exists(),
            "Esperava uma entrega registrada para a família de teste.",
        )


    def test_president_can_register_family_offline_when_network_is_down(self):
        self.report_step("Abrindo o PILAR")
        self.open_app()

        self.report_step("Selecionando perfil Presidente de Rua")
        self.click_testid("entry-president")

        self.report_step("Abrindo cadastro de família")
        self.click_button_containing("Cadastrar Família")

        # As regiões precisam ter carregado (online) antes de simular a queda,
        # senão o <select> fica vazio e o teste não reflete o uso real.
        self.report_step("Garantindo região disponível antes de cair a rede")
        self.select_by_text(By.NAME, "region_id", self.region.nome)

        try:
            self.report_step("Simulando perda de conexão")
            self.set_network_offline(True)

            self.report_step("Preenchendo dados da família offline")
            self.fill_field("nome_responsavel", self.family_name)
            self.fill_field("quantidade_moradores", "4")
            self.fill_field("telefone", "81999990000")
            self.fill_field("codigo_viela", self.alley_code)

            self.report_step("Salvando família sem conexão")
            self.click_button_containing("Salvar família")

            self.report_step("Validando salvamento local")
            self.wait_for_text(
                "Sem conexão. Cadastro salvo localmente para sincronização futura."
            )
            self.wait_for_text("cadastro(s) offline aguardando sincronização")

            # Enquanto offline, o backend não pode ter recebido nada. Validamos
            # aqui dentro do `try`, de propósito: ao restaurar a rede no
            # `finally`, o app dispara a sincronização automática (listener do
            # evento "online"), o que persistiria o cadastro e tornaria esta
            # checagem uma corrida.
            self.report_step("Validando que nada foi persistido no banco enquanto offline")
            self.assertFalse(
                Family.objects.filter(
                    nome_responsavel=self.normalized_family_name
                ).exists(),
                "Cadastro offline não deve ir ao banco antes da sincronização.",
            )
        finally:
            # Restaura a rede mesmo se a asserção falhar, para não contaminar
            # os próximos testes da classe. O cadastro pendente é sincronizado
            # automaticamente e limpo no tearDown pelo marcador do teste.
            self.set_network_offline(False)


if __name__ == "__main__":
    unittest.main()
