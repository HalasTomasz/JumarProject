from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0008_alter_zamowienie_uwagi'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyOrderCounter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_prefix', models.CharField(max_length=8, unique=True)),
                ('last_value', models.PositiveIntegerField(default=1000)),
            ],
            options={
                'verbose_name': 'Licznik zlecen dziennych',
                'verbose_name_plural': 'Liczniki zlecen dziennych',
            },
        ),
        migrations.CreateModel(
            name='OrderRollCounter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('NrZp', models.CharField(max_length=50, unique=True, verbose_name='Numer zlecenia')),
                ('last_value', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Licznik rolek',
                'verbose_name_plural': 'Liczniki rolek',
            },
        ),
    ]
