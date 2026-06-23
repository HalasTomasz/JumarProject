from django.db import migrations


def add_missing_columns(apps, schema_editor):
    table_name = "events_zamowienie"
    Zamowienie = apps.get_model("events", "Zamowienie")
    managed_fields = [
        "Kod",
        "Artykul",
        "MMK",
        "Barwnik",
        "Zakladka",
        "DolneOdch",
        "DlugFoilPlan_Korekta",
        "IloscRolekZlec",
        "DlugRolkiZlec_Korekta",
        "DlugRolkiPlan",
        "DlugFoliZlec_Korekta",
        "WagaRolkiZlec",
        "Uwagi",
    ]

    with schema_editor.connection.cursor() as cursor:
        existing_columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }

    for field_name in managed_fields:
        if field_name not in existing_columns:
            schema_editor.add_field(Zamowienie, Zamowienie._meta.get_field(field_name))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0003_zamowienie_legacy_fields'),
    ]

    operations = [
        migrations.RunPython(add_missing_columns, reverse_code=noop),
    ]
