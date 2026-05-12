from django.contrib import messages
from django.views.generic import CreateView, TemplateView

from .forms import FamilyForm
from .models import Family


class HomeView(TemplateView):
    template_name = "families/home.html"


class FamilyCreateView(CreateView):
    model = Family
    form_class = FamilyForm
    template_name = "families/family_form.html"

    def form_valid(self, form):
        messages.success(self.request, "Família mapeada com sucesso.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Revise os campos obrigatórios antes de salvar.")
        return super().form_invalid(form)
