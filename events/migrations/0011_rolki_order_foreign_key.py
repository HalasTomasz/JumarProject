from django.db import migrations, models
import django.db.models.deletion


def validate_and_normalize_rolls(apps, schema_editor):
    Zamowienie = apps.get_model("events", "Zamowienie")
    Rolki = apps.get_model("events", "Rolki")
    orders = {
        number: (extruder, foil_type)
        for number, extruder, foil_type in Zamowienie.objects.values_list("NrZp", "NrWytl", "Rodzaj")
    }

    orphaned_roll_ids = list(
        Rolki.objects.exclude(NrZp__in=orders).values_list("pk", flat=True)[:10]
    )
    if orphaned_roll_ids:
        raise RuntimeError(
            "Nie można utworzyć relacji Rolki -> Zamowienie. "
            f"Rolki bez zlecenia (pierwsze ID): {orphaned_roll_ids}. "
            "Najpierw przypisz je do istniejących zleceń lub usuń."
        )

    rolls_to_update = []
    for roll in Rolki.objects.all().iterator(chunk_size=500):
        extruder, foil_type = orders[roll.NrZp]
        if roll.NrWytl != extruder or roll.Rodzaj != foil_type:
            roll.NrWytl = extruder
            roll.Rodzaj = foil_type
            rolls_to_update.append(roll)

    if rolls_to_update:
        Rolki.objects.bulk_update(rolls_to_update, ["NrWytl", "Rodzaj"], batch_size=500)


class Migration(migrations.Migration):
    dependencies = [("events", "0010_report_query_indexes")]

    operations = [
        migrations.RunPython(validate_and_normalize_rolls, migrations.RunPython.noop),
        migrations.RenameField(
            model_name="rolki",
            old_name="NrZp",
            new_name="order",
        ),
        migrations.AlterField(
            model_name="rolki",
            name="order",
            field=models.ForeignKey(
                db_column="NrZp",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="rolls",
                to="events.zamowienie",
                to_field="NrZp",
                verbose_name="Zlecenie",
            ),
        ),
        migrations.RemoveIndex(
            model_name="rolki",
            name="events_rolk_NrZp_93e753_idx",
        ),
        migrations.RemoveIndex(
            model_name="rolki",
            name="events_rolls_completed_idx",
        ),
        migrations.AddIndex(
            model_name="rolki",
            index=models.Index(
                fields=["order", "Data"],
                name="events_rolk_NrZp_93e753_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="rolki",
            index=models.Index(
                fields=["Data", "NrWytl", "order", "Rolka"],
                name="events_rolls_completed_idx",
            ),
        ),
    ]
