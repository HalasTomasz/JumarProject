# Generated by Django 4.1.7 on 2023-06-11 10:50

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0007_alter_rolki_mieszanka_alter_rolki_uwagi'),
    ]

    operations = [
        migrations.AlterField(
            model_name='rolki',
            name='Slimak',
            field=models.FloatField(null=True),
        ),
        migrations.AlterField(
            model_name='rolki',
            name='Walce',
            field=models.FloatField(null=True),
        ),
    ]