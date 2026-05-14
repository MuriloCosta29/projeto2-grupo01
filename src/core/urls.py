from django.contrib import admin
from django.urls import path

from families.views import families_api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/families/", families_api),
]
