from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0009_dailyordercounter_orderrollcounter"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="zamowienie",
            index=models.Index(fields=["Status", "Data"], name="events_order_status_date_idx"),
        ),
        migrations.AddIndex(
            model_name="rolki",
            index=models.Index(fields=["Data", "NrWytl", "NrZp", "Rolka"], name="events_rolls_completed_idx"),
        ),
        migrations.AddIndex(
            model_name="rolki",
            index=models.Index(fields=["Data", "Zmiana", "NrWytl", "Rodzaj"], name="events_rolls_workers_idx"),
        ),
    ]
