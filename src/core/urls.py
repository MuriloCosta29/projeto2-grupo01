from django.contrib import admin
from django.urls import path

from families.views import (
    dashboard_impact_api,
    families_api,
    family_deliveries_api,
    field_agents_api,
    health_check,
)

urlpatterns = [
    path("", health_check),  # Evita cair em 404.
    path("health/", health_check),
    path("admin/", admin.site.urls),
    path("api/dashboard/impact/", dashboard_impact_api),
    path("api/field-agents/", field_agents_api),
    path("api/families/", families_api),
    path("api/families/<int:family_id>/deliveries/", family_deliveries_api),
]
