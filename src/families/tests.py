from django.test import TestCase
from django.urls import reverse

from .forms import FamilyForm
from .models import Family


class US01FamilyRegistrationTests(TestCase):
    def test_family_can_be_registered_without_cep(self):
        response = self.client.post(
            reverse("families:create"),
            data={
                "nome_responsavel": "Maria Silva",
                "telefone": "(11) 99999-0000",
                "codigo_viela": "Viela 01",
                "complemento": "Casa azul",
                "bairro": "Jardim Esperança",
                "cep": "",
                "cidade": "São Paulo",
                "estado": "SP",
                "quantidade_moradores": 4,
                "observacoes": "",
            },
        )

        self.assertRedirects(response, reverse("families:create"))
        self.assertEqual(Family.objects.count(), 1)
        family = Family.objects.get()
        self.assertEqual(family.nome_responsavel, "Maria Silva")
        self.assertEqual(family.codigo_viela, "Viela 01")
        self.assertEqual(family.cep, "")

    def test_required_fields_block_registration(self):
        form = FamilyForm(data={})

        self.assertFalse(form.is_valid())
        self.assertIn("nome_responsavel", form.errors)
        self.assertIn("codigo_viela", form.errors)
        self.assertIn("quantidade_moradores", form.errors)


class US02DuplicatePreventionTests(TestCase):
    def test_duplicate_family_by_responsible_and_alley_is_blocked(self):
        Family.objects.create(
            nome_responsavel="Maria Silva",
            codigo_viela="Viela 01",
            quantidade_moradores=4,
        )

        form = FamilyForm(
            data={
                "nome_responsavel": "maria silva",
                "telefone": "",
                "codigo_viela": "viela 01",
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

    def test_home_and_registration_pages_render(self):
        for url_name in ["families:home", "families:create"]:
            with self.subTest(url_name=url_name):
                response = self.client.get(reverse(url_name))
                self.assertEqual(response.status_code, 200)
