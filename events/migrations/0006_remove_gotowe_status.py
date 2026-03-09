from django.db import migrations, models


def remap_gotowe_to_zrealizowane(apps, schema_editor):
    Zamowienie = apps.get_model('events', 'Zamowienie')
    Zamowienie.objects.filter(Status=5).update(Status=2)


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0005_merge_20251026_1512'),
    ]

    operations = [
        migrations.RunPython(remap_gotowe_to_zrealizowane, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='zamowienie',
            name='Status',
            field=models.IntegerField(
                choices=[
                    (0, 'Planowane'),
                    (1, 'W realizacji'),
                    (2, 'Zrealizowane'),
                    (3, 'Anulowane'),
                ],
                default=0,
                verbose_name='Status',
            ),
        ),
    ]
