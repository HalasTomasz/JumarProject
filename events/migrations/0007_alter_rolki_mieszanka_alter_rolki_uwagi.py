# Generated by Django 4.1.7 on 2023-06-07 02:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0006_alter_zamowienie_barwnik_alter_zamowienie_kod_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='rolki',
            name='Mieszanka',
            field=models.CharField(blank=True, default='', max_length=40, null=True),
        ),
        migrations.AlterField(
            model_name='rolki',
            name='Uwagi',
            field=models.CharField(blank=True, default='', max_length=40, null=True),
        ),
    ]
