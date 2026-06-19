"""Executa a suíte E2E completa numa ordem de negócio fixa.

A ordem conta uma história ponta a ponta do PILAR:

    Administrador  ->  Presidente de Rua  ->  Morador

O Administrador prepara o sistema (regiões, Presidentes de Rua e avisos de
cesta), o Presidente de Rua opera em campo (cadastro e entrega) e, por fim, o
Morador consulta o resultado (histórico) e usa a ouvidoria.

Cada teste é independente — cria e limpa os próprios dados —, então a ordem não
altera o resultado dos testes. Ela existe para leitura e para gravação de
screencast; por isso é fixada aqui de forma explícita, em vez de depender da
ordem alfabética da descoberta automática.

Uso:
    src/.venv/bin/python -m e2e.run_suite
    SELENIUM_HEADLESS=1 src/.venv/bin/python -m e2e.run_suite

As mesmas variáveis de ambiente dos testes valem aqui (SELENIUM_HEADLESS,
SELENIUM_STEP_DELAY, E2E_FRONTEND_URL, etc.). O processo retorna código 0
quando tudo passa e 1 quando algo falha — útil em CI.
"""

import sys
import unittest

from e2e.test_admin_flow import AdminFlowE2ETests
from e2e.test_president_family_registration import PresidentFlowE2ETests
from e2e.test_resident_flow import ResidentFlowE2ETests

# Ordem de negócio: administrador -> presidente de rua -> morador.
ORDERED_FLOWS = (
    AdminFlowE2ETests,
    PresidentFlowE2ETests,
    ResidentFlowE2ETests,
)


def build_suite() -> unittest.TestSuite:
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # addTests preserva a ordem de inserção; só os métodos dentro de cada
    # classe é que seguem a ordenação padrão do loader.
    for flow in ORDERED_FLOWS:
        suite.addTests(loader.loadTestsFromTestCase(flow))

    return suite


def main() -> int:
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(build_suite())

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
