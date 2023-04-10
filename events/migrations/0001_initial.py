# Generated by Django 4.1.7 on 2023-03-28 03:06

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Zamowienie',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('NrZp', models.CharField(max_length=20, verbose_name='NrZp')),
                ('Data', models.DateTimeField()),
                ('Kod', models.CharField(max_length=20)),
                ('Artykul', models.CharField(max_length=30)),
                ('NrWyt', models.IntegerField()),
                ('Status', models.IntegerField()),
                ('Rodzaj', models.IntegerField()),
                ('MMK', models.CharField(max_length=20)),
                ('Barwnik', models.CharField(max_length=20)),
                ('Uwagi', models.CharField(max_length=40)),
                ('IloscZlec', models.IntegerField()),
                ('SzerWorka', models.IntegerField()),
                ('SzerRekawa', models.IntegerField()),
                ('Zakladka', models.FloatField()),
                ('DlugWorka', models.IntegerField()),
                ('GrubWorka', models.IntegerField()),
                ('DolneOdch', models.IntegerField()),
                ('DlugFoilPlan_Korekta', models.FloatField()),
                ('WagaFoliZlec', models.FloatField()),
                ('DlugFoliPlan', models.FloatField()),
                ('IloscRolekZlec', models.FloatField()),
                ('DlugRolkiZlec_Korekta', models.FloatField()),
                ('DlugRolkiPlan', models.FloatField()),
                ('DlugFoliZlec_Korekta', models.FloatField()),
                ('WagaRolkiZlec', models.FloatField()),
            ],
        ),
    ]
