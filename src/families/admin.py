from django.contrib import admin

from .models import Family


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
