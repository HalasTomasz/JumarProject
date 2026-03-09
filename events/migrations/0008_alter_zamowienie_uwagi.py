from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0007_remove_zamowienie_dolneodch"),
    ]

    operations = [
        migrations.AlterField(
            model_name="zamowienie",
            name="Uwagi",
            field=models.TextField(blank=True, max_length=1024, verbose_name="Uwagi"),
        ),
    ]
