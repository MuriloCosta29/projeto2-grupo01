from django import forms

from .models import Family


class FamilyForm(forms.ModelForm):
    class Meta:
        model = Family
        fields = [
            "region",
            "nome_responsavel",
            "telefone",
            "codigo_viela",
            "complemento",
            "bairro",
            "cep",
            "cidade",
            "estado",
            "quantidade_moradores",
            "observacoes",
        ]
        labels = {
            "region": "Região",
            "nome_responsavel": "Nome completo do responsável",
            "telefone": "Telefone",
            "codigo_viela": "Código da Viela / Referência",
            "complemento": "Complemento",
            "bairro": "Bairro / Região",
            "cep": "CEP (opcional)",
            "cidade": "Cidade",
            "estado": "Estado",
            "quantidade_moradores": "Número de moradores",
            "observacoes": "Observações",
        }
        widgets = {
            "observacoes": forms.Textarea(attrs={"rows": 3}),
        }

    def clean(self):
        cleaned_data = super().clean()
        nome = cleaned_data.get("nome_responsavel")
        codigo_viela = cleaned_data.get("codigo_viela")

        if nome and codigo_viela:
            duplicate = Family.objects.filter(
                nome_responsavel__iexact=nome.strip(),
                codigo_viela__iexact=codigo_viela.strip(),
            )
            if self.instance.pk:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise forms.ValidationError(
                    "Atenção: Possível duplicidade de morador encontrada. Já existe família com o mesmo responsável e Código da Viela."
                )

        return cleaned_data
