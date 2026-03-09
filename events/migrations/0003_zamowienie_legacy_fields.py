from decimal import Decimal
from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0002_userprofile'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='zamowienie',
                    name='Artykul',
                    field=models.CharField(default='', max_length=40, verbose_name='Artykuł'),
                    preserve_default=False,
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='Barwnik',
                    field=models.CharField(blank=True, max_length=20, verbose_name='Barwnik'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='DolneOdch',
                    field=models.IntegerField(default=1, validators=[django.core.validators.MinValueValidator(1)], verbose_name='Dolne odchyłki [μm]'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='DlugFoliZlec_Korekta',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name='Dług. folii zlec. korekta'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='DlugFoilPlan_Korekta',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Dług. folii plan (korekta)'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='DlugRolkiPlan',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Długość rolki plan'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='DlugRolkiZlec_Korekta',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Długość rolki zlec. (korekta)'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='IloscRolekZlec',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Ilość rolek zlec.'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='Kod',
                    field=models.CharField(blank=True, max_length=20, verbose_name='Kod'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='MMK',
                    field=models.CharField(blank=True, max_length=20, verbose_name='MMK'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='Uwagi',
                    field=models.CharField(blank=True, max_length=50, verbose_name='Uwagi'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='WagaRolkiZlec',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Waga rolki zlec.'),
                ),
                migrations.AddField(
                    model_name='zamowienie',
                    name='Zakladka',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Zakładka [mm]'),
                ),
            ],
        )
    ]
