from django.db import migrations, connection


def add_missing_columns(apps, schema_editor):
    conn = schema_editor.connection
    if conn.vendor != 'mysql':
        return

    columns = [
        ('Kod', "VARCHAR(20) DEFAULT ''"),
        ('Artykul', "VARCHAR(40) NOT NULL DEFAULT ''"),
        ('MMK', "VARCHAR(20) DEFAULT ''"),
        ('Barwnik', "VARCHAR(20) DEFAULT ''"),
        ('Zakladka', 'DECIMAL(10,2)'),
        ('DolneOdch', 'INTEGER NOT NULL DEFAULT 1'),
        ('DlugFoilPlan_Korekta', 'DECIMAL(10,2)'),
        ('IloscRolekZlec', 'DECIMAL(10,2)'),
        ('DlugRolkiZlec_Korekta', 'DECIMAL(10,2)'),
        ('DlugRolkiPlan', 'DECIMAL(10,2)'),
        ('DlugFoliZlec_Korekta', 'DECIMAL(12,2)'),
        ('WagaRolkiZlec', 'DECIMAL(10,2)'),
        ('Uwagi', "VARCHAR(50) DEFAULT ''"),
    ]

    table = 'events_zamowienie'
    with conn.cursor() as cursor:
        for name, definition in columns:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = %s
                  AND COLUMN_NAME = %s
                """,
                [table, name],
            )
            exists = cursor.fetchone()[0]
            if not exists:
                cursor.execute(
                    f"ALTER TABLE {table} ADD COLUMN {name} {definition}"
                )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0003_zamowienie_legacy_fields'),
    ]

    operations = [
        migrations.RunPython(add_missing_columns, reverse_code=noop),
    ]
