from django.db import IntegrityError, transaction
from django.test import TestCase

from .forms import FamilyForm
from .models import DeliveryLog, Family


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
