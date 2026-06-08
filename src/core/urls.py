from django.contrib import admin
from django.urls import path

from families.views import (
    anonymous_complaints_api,
    basket_availability_notifications_api,
    dashboard_impact_api,
    dashboard_regions_api,
    families_api,
    family_lookup_api,
    field_agent_detail_api,
    family_deliveries_api,
    field_agents_api,
    health_check,
    login_api,
    logout_api,
    regions_api,
)

urlpatterns = [
    path("", health_check),  # Evita cair em 404.
    path("health/", health_check),
    path("admin/", admin.site.urls),
    path("api/auth/login/", login_api),
    path("api/auth/logout/", logout_api),
    path("api/dashboard/impact/", dashboard_impact_api),
    path("api/dashboard/regions/", dashboard_regions_api),
    path(
        "api/basket-availability-notifications/",
        basket_availability_notifications_api,
    ),
    path("api/anonymous-complaints/", anonymous_complaints_api),
    path("api/field-agents/", field_agents_api),
    path("api/field-agents/<int:agent_id>/", field_agent_detail_api),
    path("api/regions/", regions_api),
    path("api/families/lookup/", family_lookup_api),
    path("api/families/", families_api),
    path("api/families/<int:family_id>/deliveries/", family_deliveries_api),
]
