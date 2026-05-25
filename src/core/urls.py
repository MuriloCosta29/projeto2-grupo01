from django.contrib import admin
from django.urls import path

from families.views import families_api, family_deliveries_api, health_check

urlpatterns = [
    path("", health_check),  # Evita cair em 404.
    path("health/", health_check),
    path("admin/", admin.site.urls),
    path("api/families/", families_api),
    path("api/families/<int:family_id>/deliveries/", family_deliveries_api),
]
