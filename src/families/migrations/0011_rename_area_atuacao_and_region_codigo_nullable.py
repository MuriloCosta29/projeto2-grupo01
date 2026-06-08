from django.db import migrations, models


class Migration(migrations.Migration):
    """Etapa 1/2 (expand) da limpeza do modelo.

    - Renomeia FieldAgent.codigo_area -> area_atuacao (não-destrutivo: preserva
      os dados, é só um RENAME COLUMN).
    - Torna Region.codigo nullable e remove o unique, desacoplando o campo do
      código (que parou de ler/escrever nele). O drop da coluna vem na 0012.
    """

    dependencies = [
        ("families", "0010_authtoken"),
    ]

    operations = [
        migrations.RenameField(
            model_name="fieldagent",
            old_name="codigo_area",
            new_name="area_atuacao",
        ),
        migrations.AlterField(
            model_name="region",
            name="codigo",
            field=models.CharField(blank=True, max_length=40, null=True),
        ),
    ]
