from django.db import migrations


class Migration(migrations.Migration):
    """Etapa 2/2 (contract) da limpeza do modelo.

    Dropa Region.codigo. Seguro porque desde a 0011 (expand) nenhum código lê
    ou escreve a coluna — ela já estava inerte (nullable, non-unique).
    """

    dependencies = [
        ("families", "0011_rename_area_atuacao_and_region_codigo_nullable"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="region",
            name="codigo",
        ),
    ]
