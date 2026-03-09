#!/usr/bin/env python3
"""
Utility script to seed the database with random Zamowienie entries.

Usage:
    python scripts/generate_orders.py --count 1000

The script must be run from the project root with the virtualenv activated.
"""

import argparse
import os
import sys
import random
from datetime import date, timedelta
from decimal import Decimal

import django


def configure_django():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jumar.settings')
    django.setup()


def get_random_choice(field):
    return random.choice([value for value, _ in field.choices])


def build_order(seq, base_id, created_by=None):
    from events.models import Zamowienie  # local import after django.setup()

    # Randomize the order date within the last 180 days
    order_date = date.today() - timedelta(days=random.randint(0, 180))

    szer_worka = random.randint(200, 800)
    szer_rekawa = szer_worka + random.choice([40, 60, 80])
    dlug_worka = random.randint(300, 1200)
    grub_worka = random.randint(20, 80)
    ilosc_zlec = Decimal(random.randint(5000, 50000))

    order = Zamowienie(
        NrZp=f"{order_date.strftime('%Y%m%d')}/{base_id + seq}",
        Data=order_date,
        Status=get_random_choice(Zamowienie._meta.get_field('Status')),
        Priorytet=get_random_choice(Zamowienie._meta.get_field('Priorytet')),
        Rodzaj=get_random_choice(Zamowienie._meta.get_field('Rodzaj')),
        IloscZlec=ilosc_zlec,
        SzerWorka=szer_worka,
        SzerRekawa=szer_rekawa,
        DlugWorka=dlug_worka,
        GrubWorka=grub_worka,
        NrWytl=random.randint(1, 5),
        Tasma=random.choice([True, False]),
        created_by=created_by,
    )
    order.calculate_parameters()
    return order


def main():
    parser = argparse.ArgumentParser(description='Seed Zamowienie data with random entries.')
    parser.add_argument('--count', type=int, default=1000, help='Number of orders to create (default: 1000)')
    parser.add_argument('--user', type=str, default=None, help='Username to associate as created_by')
    args = parser.parse_args()

    configure_django()

    from django.contrib.auth import get_user_model
    from events.models import Zamowienie

    User = get_user_model()
    created_by = None
    if args.user:
        created_by = User.objects.filter(username=args.user).first()
        if not created_by:
            parser.error(f"User '{args.user}' not found.")

    last_id = Zamowienie.objects.order_by('-id').values_list('id', flat=True).first() or 0
    orders = [
        build_order(seq + 1, last_id, created_by)
        for seq in range(args.count)
    ]

    Zamowienie.objects.bulk_create(orders)
    print(f"Successfully created {len(orders)} Zamowienie records.")


if __name__ == '__main__':
    main()
