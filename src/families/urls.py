from django.urls import path

from . import views

app_name = "families"

urlpatterns = [
    path("", views.HomeView.as_view(), name="home"),
    path("families/new/", views.FamilyCreateView.as_view(), name="create"),
]
