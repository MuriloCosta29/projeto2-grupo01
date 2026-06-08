from django.contrib import admin

from .models import (
    AnonymousComplaint,
    AuthToken,
    BasketAvailabilityNotification,
    DeliveryLog,
    Family,
    FieldAgent,
    Region,
)


@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at")
    search_fields = ("user__username",)
    readonly_fields = ("key", "created_at")


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("nome", "ativo", "criado_em")
    search_fields = ("nome",)
    list_filter = ("ativo",)
    readonly_fields = ("criado_em",)


@admin.register(FieldAgent)
class FieldAgentAdmin(admin.ModelAdmin):
    list_display = ("nome", "telefone", "area_atuacao", "region", "ativo", "criado_em")
    search_fields = ("nome", "telefone", "area_atuacao", "region__nome")
    list_filter = ("ativo", "region")
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


@admin.register(BasketAvailabilityNotification)
class BasketAvailabilityNotificationAdmin(admin.ModelAdmin):
    list_display = (
        "family",
        "region",
        "channel",
        "status",
        "scheduled_for",
        "pickup_location",
        "created_at",
    )
    search_fields = (
        "family__nome_responsavel",
        "family__telefone",
        "region__nome",
        "pickup_location",
    )
    list_filter = ("channel", "status", "region", "scheduled_for")
    readonly_fields = (
        "message",
        "contact_value",
        "notification_url",
        "processed_at",
        "created_at",
    )


@admin.register(AnonymousComplaint)
class AnonymousComplaintAdmin(admin.ModelAdmin):
    list_display = (
        "protocol",
        "category",
        "status",
        "region",
        "codigo_viela",
        "created_at",
    )
    search_fields = ("protocol", "codigo_viela", "description", "region__nome")
    list_filter = ("category", "status", "region", "created_at")
    readonly_fields = ("protocol", "created_at", "updated_at")
