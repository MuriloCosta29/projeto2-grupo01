"""Infraestrutura compartilhada dos testes E2E do PILAR.

Concentra aqui tudo que os fluxos (Presidente, Morador, Administrador) reusam:

- leitura das variáveis de ambiente (URLs, headless, delays de screencast);
- verificação de que backend e frontend estão no ar antes de abrir o navegador;
- criação do WebDriver do Chrome;
- uma classe base de TestCase com helpers de interação e limpeza de dados.

Manter isso isolado evita repetição entre os arquivos de fluxo e deixa cada
teste focado apenas na história de negócio que ele valida.
"""

import os
import sys
import time
import uuid
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"

# Deixa o pacote `families`/`core` do Django importável sem precisar instalar o projeto.
sys.path.insert(0, str(SRC_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django  # noqa: E402

django.setup()

import unittest  # noqa: E402

from django.contrib.auth import get_user_model  # noqa: E402
from selenium import webdriver  # noqa: E402
from selenium.common.exceptions import StaleElementReferenceException  # noqa: E402
from selenium.webdriver.common.by import By  # noqa: E402
from selenium.webdriver.support import expected_conditions as EC  # noqa: E402
from selenium.webdriver.support.select import Select  # noqa: E402
from selenium.webdriver.support.ui import WebDriverWait  # noqa: E402

from families.models import (  # noqa: E402
    AnonymousComplaint,
    AuthToken,
    Family,
    FieldAgent,
    Region,
)


FRONTEND_URL = os.environ.get("E2E_FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.environ.get("E2E_BACKEND_URL", "http://127.0.0.1:8000")

# Marcador único usado em todos os dados criados pelos testes. A limpeza no
# tearDown filtra por ele, então nenhum dado de desenvolvimento real é tocado.
DATA_MARKER = "Selenium"

# Chave do token no localStorage. Espelha AUTH_TOKEN_STORAGE_KEY do frontend
# (frontend/src/services/api.ts). Usada para semear a sessão de admin sem bater
# no endpoint de login, que é rate-limited e tornaria o admin E2E não repetível.
AUTH_TOKEN_STORAGE_KEY = "presidente_de_rua_auth_token"

# Tempo máximo de espera explícita. Toda sincronização passa por WebDriverWait;
# não usamos sleeps fixos para "esperar a tela carregar".
DEFAULT_TIMEOUT = float(os.environ.get("SELENIUM_TIMEOUT", "15"))


def env_flag(name: str, default: str) -> bool:
    return os.environ.get(name, default).lower() in {"1", "true", "yes", "on"}


# Localmente o teste abre o Chrome visível. Em CI (variável CI definida), roda invisível.
HEADLESS = env_flag("SELENIUM_HEADLESS", "1" if os.environ.get("CI") else "0")

# STEP_DELAY e TYPING_DELAY existem APENAS para screencast/demonstração.
# Em headless ficam zerados para não desperdiçar tempo nem mascarar flakiness.
STEP_DELAY = float(os.environ.get("SELENIUM_STEP_DELAY", "0.8" if not HEADLESS else "0"))
TYPING_DELAY = float(os.environ.get("SELENIUM_TYPING_DELAY", "0.08" if not HEADLESS else "0"))
KEEP_BROWSER_OPEN = env_flag("SELENIUM_KEEP_BROWSER_OPEN", "0")


def assert_service_is_running(url: str) -> None:
    """Falha cedo, com mensagem clara, se backend ou frontend não estiverem no ar."""
    try:
        with urlopen(url, timeout=5) as response:
            if response.status >= 400:
                raise AssertionError(f"Serviço respondeu com HTTP {response.status}: {url}")
    except URLError as error:
        raise AssertionError(
            f"Serviço indisponível em {url}. "
            "Suba o backend e o frontend antes de rodar o E2E."
        ) from error


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()

    if HEADLESS:
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1100")
    else:
        options.add_argument("--start-maximized")

    return webdriver.Chrome(options=options)


class PilarE2ETestCase(unittest.TestCase):
    """Base com WebDriver compartilhado por classe e helpers de interação.

    O driver é criado uma vez por classe (setUpClass) e reaproveitado entre os
    testes da mesma classe — abrir o Chrome é caro. Cada teste recebe um
    `suffix` único no setUp, o que isola os dados e permite limpeza segura no
    tearDown sem depender da ordem de execução.
    """

    @classmethod
    def setUpClass(cls):
        assert_service_is_running(f"{BACKEND_URL}/health/")
        assert_service_is_running(FRONTEND_URL)

        cls.driver = build_driver()
        cls.wait = WebDriverWait(cls.driver, DEFAULT_TIMEOUT)

        if not HEADLESS:
            cls.driver.maximize_window()

    @classmethod
    def tearDownClass(cls):
        if KEEP_BROWSER_OPEN:
            return

        driver = getattr(cls, "driver", None)
        if driver is not None:
            driver.quit()

    def setUp(self):
        self.suffix = uuid.uuid4().hex[:8]
        # Texto que sempre carrega o marcador + suffix, para casar com a limpeza.
        self.tag = f"{DATA_MARKER} {self.suffix}"

        self.region = Region.objects.create(nome=f"Recife {self.tag}")
        self.region.refresh_from_db()

        self.family_name = f"Responsavel {self.tag}"
        self.alley_code = f"Viela {self.tag}"
        self.normalized_family_name = " ".join(self.family_name.split()).title()
        self.normalized_alley_code = " ".join(self.alley_code.split()).lower()
        self.admin_username = f"e2e_admin_{self.suffix}"
        self.admin_password = f"SenhaE2E@{self.suffix}"

    def tearDown(self):
        # A ordem importa por causa das FKs: notificações e entregas caem em
        # cascata junto da família; aqui limpamos o que é criado direto.
        AnonymousComplaint.objects.filter(
            description__icontains=self.suffix
        ).delete()
        Family.objects.filter(nome_responsavel__icontains=self.tag).delete()
        FieldAgent.objects.filter(nome__icontains=self.tag).delete()
        Region.objects.filter(nome__icontains=self.tag).delete()
        get_user_model().objects.filter(username=self.admin_username).delete()

    # ------------------------------------------------------------------
    # Navegação
    # ------------------------------------------------------------------
    def open_app(self, path: str = "/") -> None:
        """Abre o app já com storage limpo, garantindo sessão anônima."""
        self.driver.get(FRONTEND_URL)
        self.driver.execute_script("localStorage.clear(); sessionStorage.clear();")

        if path != "/":
            self.driver.get(f"{FRONTEND_URL}{path}")

    def report_step(self, message: str) -> None:
        print(f"E2E: {message}")

        # Pausa apenas para screencast; em headless STEP_DELAY == 0.
        if STEP_DELAY > 0:
            time.sleep(STEP_DELAY)

    # ------------------------------------------------------------------
    # Autenticação de admin
    # ------------------------------------------------------------------
    def create_admin_user(self):
        """Cria um usuário staff temporário para o teste."""
        return get_user_model().objects.create_user(
            username=self.admin_username,
            password=self.admin_password,
            is_staff=True,
            is_superuser=True,
        )

    def seed_admin_session(self) -> None:
        """Entra como admin injetando um token válido no localStorage.

        Atalho deliberado para os testes que só precisam estar autenticados:
        evita o endpoint de login (rate-limited a 10 req/10min por IP), o que
        torna o admin E2E repetível em loop e em CI. O fluxo de login pela
        interface é coberto separadamente por um teste dedicado.
        """
        user = self.create_admin_user()
        token = AuthToken.objects.create(user=user)

        # Carrega a origem para liberar o localStorage, injeta o token e
        # recarrega já no /admin: o App lê o token no mount e renderiza o painel.
        self.driver.get(FRONTEND_URL)
        self.driver.execute_script(
            "localStorage.clear();"
            "localStorage.setItem(arguments[0], arguments[1]);",
            AUTH_TOKEN_STORAGE_KEY,
            token.key,
        )
        self.driver.get(f"{FRONTEND_URL}/admin")
        self.wait_for_text("Cadastro de Regiões")

    # ------------------------------------------------------------------
    # Cliques (preferir data-testid; texto é fallback legível)
    # ------------------------------------------------------------------
    def click_testid(self, testid: str):
        element = self.wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, f"[data-testid='{testid}']"))
        )
        element.click()
        return element

    def click_button_containing(self, text: str):
        element = self.wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    f"//button[.//*[normalize-space()='{text}'] or normalize-space()='{text}']",
                )
            )
        )
        element.click()
        return element

    # ------------------------------------------------------------------
    # Espera por conteúdo
    # ------------------------------------------------------------------
    def wait_for_text(self, text: str) -> None:
        self.wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, "body"), text))

    def wait_present(self, by: str, value: str):
        return self.wait.until(EC.presence_of_element_located((by, value)))

    def wait_url_contains(self, fragment: str) -> None:
        self.wait.until(EC.url_contains(fragment))

    # ------------------------------------------------------------------
    # Preenchimento de campos
    # ------------------------------------------------------------------
    def type_text(self, by: str, value: str, text: str) -> None:
        """Digita num campo localizado por (by, value).

        Em screencast (TYPING_DELAY > 0) digita caractere a caractere para o
        efeito "humano"; em headless usa send_keys direto, sem sleeps.
        """
        element = self.wait.until(EC.presence_of_element_located((by, value)))
        element.clear()

        if TYPING_DELAY > 0:
            for character in text:
                element.send_keys(character)
                time.sleep(TYPING_DELAY)
        else:
            element.send_keys(text)

    def fill_field(self, name: str, text: str) -> None:
        """Atalho para o caso mais comum: input/textarea com atributo `name`."""
        self.type_text(By.NAME, name, text)

    # ------------------------------------------------------------------
    # Simulação de rede (fluxo offline)
    # ------------------------------------------------------------------
    def set_network_offline(self, offline: bool) -> None:
        """Liga/desliga a rede via DevTools do Chrome.

        Com offline=True o Chrome também coloca `navigator.onLine` em false e
        dispara o evento "offline" — exatamente o que o FamilyForm usa para
        decidir salvar o cadastro localmente.
        """
        if offline:
            self.driver.set_network_conditions(
                offline=True,
                latency=0,
                download_throughput=0,
                upload_throughput=0,
            )
        else:
            self.driver.delete_network_conditions()

    def select_by_text(self, by: str, value: str, option_text: str) -> None:
        """Seleciona uma <option>, esperando ela aparecer (carregada via API).

        Trata StaleElementReferenceException porque o React pode re-renderizar o
        <select> enquanto as regiões/agentes chegam do backend.
        """

        def option_is_available(_driver) -> bool:
            try:
                element = _driver.find_element(by, value)
                return option_text in element.text
            except StaleElementReferenceException:
                return False

        self.wait.until(option_is_available)
        Select(self.driver.find_element(by, value)).select_by_visible_text(option_text)
