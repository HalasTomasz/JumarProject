from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0006_remove_gotowe_status'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='zamowienie',
            name='DolneOdch',
        ),
    ]
