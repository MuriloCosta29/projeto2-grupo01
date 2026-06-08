import secrets
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Max
from django.urls import reverse
from django.utils import timezone


class AuthToken(models.Model):
    """Token bearer simples para autenticar a SPA (sem DRF).

    Gerado no login e enviado pelo front em 'Authorization: Token <key>'.
    A `key` é uma string aleatória de 64 caracteres.
    """

    key = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="auth_tokens",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "token de autenticação"
        verbose_name_plural = "tokens de autenticação"

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(32)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} - {self.key[:8]}…"


class FamilyQuerySet(models.QuerySet):
    def order_by_priority(self):
        return self.annotate(
            last_delivery_date=Max("deliveries__delivery_date")
        ).order_by(
            "last_delivery_date",
            "nome_responsavel",
        )


class Region(models.Model):
    nome = models.CharField(max_length=120, unique=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "região"
        verbose_name_plural = "regiões"

    def __str__(self):
        return self.nome

    def save(self, *args, **kwargs):
        self.nome = " ".join(self.nome.strip().split()).title()

        super().save(*args, **kwargs)


class FieldAgent(models.Model):
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="field_agents",
    )
    nome = models.CharField(max_length=200)
    telefone = models.CharField(max_length=30, blank=True)
    area_atuacao = models.CharField(max_length=120, blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Presidente de Rua"
        verbose_name_plural = "Presidentes de Rua"

    def __str__(self):
        return self.nome

    def save(self, *args, **kwargs):
        self.nome = " ".join(self.nome.strip().split()).title()
        self.telefone = self.telefone.strip()
        self.area_atuacao = " ".join(self.area_atuacao.strip().split())

        super().save(*args, **kwargs)


class Family(models.Model):
    objects = FamilyQuerySet.as_manager()
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="families",
    )
    assigned_agent = models.ForeignKey(
        FieldAgent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_families",
    )
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
    agent = models.ForeignKey(
        FieldAgent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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


class BasketAvailabilityNotification(models.Model):
    class Channel(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"

    class Status(models.TextChoices):
        READY = "ready", "Pronta para envio"
        NO_CONTACT = "no_contact", "Sem contato"

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name="availability_notifications",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="availability_notifications",
    )
    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.WHATSAPP,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.READY,
    )
    scheduled_for = models.DateTimeField()
    pickup_location = models.CharField(max_length=200)
    message = models.TextField()
    contact_value = models.CharField(max_length=40, blank=True)
    notification_url = models.URLField(blank=True)
    processed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["family", "scheduled_for", "pickup_location"],
                name="unique_basket_availability_notification",
            )
        ]
        verbose_name = "notificação de disponibilidade"
        verbose_name_plural = "notificações de disponibilidade"

    def __str__(self):
        return f"{self.family} - {self.scheduled_for:%d/%m/%Y %H:%M}"


class AnonymousComplaint(models.Model):
    class Category(models.TextChoices):
        IRREGULAR_DISTRIBUTION = (
            "irregular_distribution",
            "Irregularidade na distribuição",
        )
        CONFLICT = "conflict", "Conflito em campo"
        DATA_ISSUE = "data_issue", "Dados incorretos"
        OTHER = "other", "Outro"

    class Status(models.TextChoices):
        NEW = "new", "Nova"
        IN_REVIEW = "in_review", "Em análise"
        RESOLVED = "resolved", "Resolvida"

    protocol = models.CharField(max_length=32, unique=True, editable=False)
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anonymous_complaints",
    )
    codigo_viela = models.CharField(max_length=120, blank=True)
    category = models.CharField(
        max_length=40,
        choices=Category.choices,
        default=Category.OTHER,
    )
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "denúncia anônima"
        verbose_name_plural = "denúncias anônimas"

    def __str__(self):
        return f"{self.protocol} - {self.get_category_display()}"

    def save(self, *args, **kwargs):
        if not self.protocol:
            today = timezone.localdate().strftime("%Y%m%d")
            suffix = uuid.uuid4().hex[:8].upper()
            self.protocol = f"OUV-{today}-{suffix}"

        self.codigo_viela = " ".join(self.codigo_viela.strip().split()).lower()
        self.description = self.description.strip()

        super().save(*args, **kwargs)
