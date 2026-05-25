from django.db import models
from django.db.models import Max
from django.urls import reverse
from django.utils import timezone


class FamilyQuerySet(models.QuerySet):
    def order_by_priority(self):
        return self.annotate(
            last_delivery_date=Max("deliveries__delivery_date")
        ).order_by(
            "last_delivery_date",
            "nome_responsavel",
        )


class Family(models.Model):
    objects = FamilyQuerySet.as_manager()
    nome_responsavel = models.CharField(max_length=200)
    telefone = models.CharField(max_length=30, blank=True)
    codigo_viela = models.CharField(max_length=120)
    complemento = models.CharField(max_length=120, blank=True)
    bairro = models.CharField(max_length=120, blank=True)
    cep = models.CharField(max_length=12, blank=True)
    cidade = models.CharField(max_length=120, default="São Paulo")
    estado = models.CharField(max_length=2, default="SP")
    quantidade_moradores = models.PositiveIntegerField()
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome_responsavel"]
        constraints = [
            models.UniqueConstraint(
                fields=["nome_responsavel", "codigo_viela"],
                name="unique_family_by_responsible_and_alley",
            )
        ]
        verbose_name = "família"
        verbose_name_plural = "famílias"

    def __str__(self):
        return f"{self.nome_responsavel} - {self.codigo_viela}"

    def get_absolute_url(self):
        return reverse("families:create")

    # Remove espaço no começo/fim;
    # Remove espaços duplicados no meio;
    # Salva código_viela sempre em minúsculo;
    # Adicionei isso depois de perceber que se escrever uma letra diferente
    # em código_viela mesmo assim havia o cadastro;
    def save(self, *args, **kwargs):
        self.nome_responsavel = self.nome_responsavel.strip()
        self.codigo_viela = self.codigo_viela.strip()

        if self.nome_responsavel:
            self.nome_responsavel = " ".join(self.nome_responsavel.split()).title()

        if self.codigo_viela:
            self.codigo_viela = " ".join(self.codigo_viela.split()).lower()

        super().save(*args, **kwargs)


class DeliveryLog(models.Model):
    family = models.ForeignKey(  # Liga a entrega a familia
        Family,
        on_delete=models.CASCADE,
        related_name="deliveries",
    )
    delivery_date = models.DateField(
        default=timezone.localdate
    )  # Data em que a cesta foi entrega
    notes = models.TextField(blank=True)  # Observação opcional
    created_at = models.DateTimeField(
        auto_now_add=True
    )  # Quando o registro foi criado no sistema

    class Meta:
        ordering = ["-delivery_date", "-created_at"]
        verbose_name = "entrega"
        verbose_name_plural = "entregas"

    def __str__(self):
        return f"{self.family} - {self.delivery_date:%d/%m/%Y}"
