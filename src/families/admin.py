from django.contrib import admin

from .models import DeliveryLog, Family


@admin.register(Family)
class FamilyAdmin(admin.ModelAdmin):
    list_display = (
        "nome_responsavel",
        "codigo_viela",
        "bairro",
        "quantidade_moradores",
    )
    search_fields = ("nome_responsavel", "codigo_viela", "bairro", "telefone")
    list_filter = ("bairro", "cidade", "estado")
    readonly_fields = ("criado_em", "atualizado_em")


@admin.register(DeliveryLog)
class DeliveryLogAdmin(admin.ModelAdmin):
    list_display = ("family", "delivery_date", "created_at")
    search_fields = ("family__nome_responsavel", "family__codigo_viela")
    list_filter = ("delivery_date",)
    readonly_fields = ("created_at",)
