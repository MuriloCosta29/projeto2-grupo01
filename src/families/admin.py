from django.contrib import admin

from .models import DeliveryLog, Family, FieldAgent, Region


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo", "ativo", "criado_em")
    search_fields = ("nome", "codigo")
    list_filter = ("ativo",)
    readonly_fields = ("criado_em",)


@admin.register(FieldAgent)
class FieldAgentAdmin(admin.ModelAdmin):
    list_display = ("nome", "codigo_area", "ativo", "criado_em")
    search_fields = ("nome", "codigo_area")
    list_filter = ("ativo",)
    readonly_fields = ("criado_em",)


@admin.register(Family)
class FamilyAdmin(admin.ModelAdmin):
    list_display = (
        "nome_responsavel",
        "codigo_viela",
        "region",
        "bairro",
        "assigned_agent",
        "quantidade_moradores",
    )
    search_fields = ("nome_responsavel", "codigo_viela", "bairro", "telefone")
    list_filter = ("region", "bairro", "cidade", "estado", "assigned_agent")
    readonly_fields = ("criado_em", "atualizado_em")


@admin.register(DeliveryLog)
class DeliveryLogAdmin(admin.ModelAdmin):
    list_display = ("family", "agent", "delivery_date", "created_at")
    search_fields = ("family__nome_responsavel", "family__codigo_viela", "agent__nome")
    list_filter = ("delivery_date", "agent")
    readonly_fields = ("created_at",)
