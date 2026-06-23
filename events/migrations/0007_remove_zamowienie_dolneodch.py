from django.db import migrations


def drop_dolneodch_column_if_present(apps, schema_editor):
    table_name = "events_zamowienie"
    Zamowienie = apps.get_model("events", "Zamowienie")

    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name for column in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }

    if "DolneOdch" in columns:
        schema_editor.remove_field(Zamowienie, Zamowienie._meta.get_field("DolneOdch"))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0006_remove_gotowe_status'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(drop_dolneodch_column_if_present, noop),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='zamowienie',
                    name='DolneOdch',
                ),
            ],
        ),
    ]
