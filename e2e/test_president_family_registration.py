import os
import sys
import unittest
import uuid
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.ui import WebDriverWait


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"

sys.path.insert(0, str(SRC_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django  # noqa: E402


django.setup()

from families.models import Family, Region  # noqa: E402


FRONTEND_URL = os.environ.get("E2E_FRONTEND_URL", "http://127.0.0.1:5173")
BACKEND_URL = os.environ.get("E2E_BACKEND_URL", "http://127.0.0.1:8000")
HEADLESS = os.environ.get("SELENIUM_HEADLESS", "1") != "0"


def assert_service_is_running(url: str) -> None:
    try:
        with urlopen(url, timeout=5) as response:
            if response.status >= 400:
                raise AssertionError(f"Serviço respondeu com HTTP {response.status}: {url}")
    except URLError as error:
        raise AssertionError(
            f"Serviço indisponível em {url}. "
            "Suba o backend e o frontend antes de rodar o E2E."
        ) from error


class PresidentFamilyRegistrationE2ETests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert_service_is_running(f"{BACKEND_URL}/health/")
        assert_service_is_running(FRONTEND_URL)

        options = webdriver.ChromeOptions()
        options.add_argument("--window-size=1440,1100")

        if HEADLESS:
            options.add_argument("--headless=new")

        cls.driver = webdriver.Chrome(options=options)
        cls.wait = WebDriverWait(cls.driver, 15)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    def setUp(self):
        suffix = uuid.uuid4().hex[:8]
        self.region = Region.objects.create(nome=f"Recife Selenium {suffix}")
        self.region.refresh_from_db()

        self.family_name = f"Responsavel Selenium {suffix}"
        self.alley_code = f"Viela Selenium {suffix}"
        self.normalized_family_name = " ".join(self.family_name.split()).title()
        self.normalized_alley_code = " ".join(self.alley_code.split()).lower()

    def tearDown(self):
        Family.objects.filter(
            nome_responsavel=self.normalized_family_name,
            codigo_viela=self.normalized_alley_code,
        ).delete()
        self.region.delete()

    def test_president_can_register_family_and_see_it_in_the_queue(self):
        self.driver.get(FRONTEND_URL)

        self.wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//button[.//strong[normalize-space()='Presidente de Rua']]",
                )
            )
        ).click()

        self.wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[.//strong[normalize-space()='Cadastrar Família']]")
            )
        ).click()

        self.wait.until(EC.presence_of_element_located((By.NAME, "nome_responsavel")))

        self.driver.find_element(By.NAME, "nome_responsavel").send_keys(
            self.family_name
        )
        self.driver.find_element(By.NAME, "quantidade_moradores").send_keys("4")
        self.driver.find_element(By.NAME, "telefone").send_keys("81999990000")
        self.driver.find_element(By.NAME, "codigo_viela").send_keys(self.alley_code)
        self.driver.find_element(By.NAME, "cep").send_keys("")

        region_select = self.driver.find_element(By.NAME, "region_id")
        self.wait.until(lambda _: self.region.nome in region_select.text)
        Select(region_select).select_by_visible_text(self.region.nome)

        self.driver.find_element(By.XPATH, "//button[normalize-space()='Salvar família']").click()

        self.wait.until(EC.url_contains("/presidente/familias"))
        self.wait.until(
            EC.text_to_be_present_in_element(
                (By.TAG_NAME, "body"),
                self.normalized_family_name,
            )
        )

        self.assertTrue(
            Family.objects.filter(
                nome_responsavel=self.normalized_family_name,
                codigo_viela=self.normalized_alley_code,
                region=self.region,
            ).exists()
        )


if __name__ == "__main__":
    unittest.main()
