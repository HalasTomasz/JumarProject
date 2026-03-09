from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand
from django.db import transaction

from events.models import Rolki, UserProfile, Zamowienie


GROUP_NAMES = ("admin", "manager", "operator", "kierownik", "pracownik")
SHIFT_SEQUENCE = ("I", "II", "III")
STATUS_BY_SEQUENCE = {
    1: 1,
    2: 2,
    3: 0,
    4: 2,
    5: 3,
    6: 1,
    7: 0,
    8: 2,
    9: 1,
    10: 3,
    11: 2,
    12: 1,
    13: 2,
    14: 3,
    15: 2,
    16: 2,
    17: 3,
    18: 2,
    19: 3,
    20: 2,
    21: 2,
    22: 3,
    23: 2,
    24: 3,
    25: 2,
    26: 3,
}


def q2(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Command(BaseCommand):
    help = "Seed database with frontend-compatible demo users, orders, and rolls."

    def add_arguments(self, parser):
        parser.add_argument(
            "--wipe-orders",
            action="store_true",
            help="Delete all existing orders and rolls before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["wipe_orders"]:
            Rolki.objects.all().delete()
            Zamowienie.objects.all().delete()

        groups = {name: Group.objects.get_or_create(name=name)[0] for name in GROUP_NAMES}

        demo_users = self._ensure_users(groups)
        orders_created, orders_updated, rolls_created, rolls_updated = self._seed_orders_and_rolls(
            demo_users
        )

        done_canceled_count = Zamowienie.objects.filter(
            Status__in=[
                Zamowienie.StatusChoices.ZREALIZOWANE,
                Zamowienie.StatusChoices.ANULOWANE,
            ]
        ).count()

        self.stdout.write(self.style.SUCCESS("Seed completed"))
        self.stdout.write(f"Users: {User.objects.count()} (ensured demo accounts)")
        self.stdout.write(
            f"Orders: +{orders_created} created, {orders_updated} updated, total={Zamowienie.objects.count()}"
        )
        self.stdout.write(
            f"Rolls: +{rolls_created} created, {rolls_updated} updated, total={Rolki.objects.count()}"
        )
        self.stdout.write(f"Done/Canceled orders total: {done_canceled_count}")

    def _ensure_users(self, groups: dict[str, Group]) -> dict[str, User]:
        user_specs = [
            {
                "username": "demo",
                "password": "demo123",
                "first_name": "Demo",
                "last_name": "User",
                "email": "demo@example.com",
                "phone_number": "600700800",
                "group": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
            {
                "username": "manager1",
                "password": "manager123",
                "first_name": "Anna",
                "last_name": "Kowalska",
                "email": "anna.kowalska@example.com",
                "phone_number": "600333444",
                "group": "manager",
            },
            {
                "username": "manager2",
                "password": "manager123",
                "first_name": "Marta",
                "last_name": "Wrobel",
                "email": "marta.wrobel@example.com",
                "phone_number": "600777888",
                "group": "manager",
            },
            {
                "username": "operator1",
                "password": "operator123",
                "first_name": "Jan",
                "last_name": "Nowak",
                "email": "jan.nowak@example.com",
                "phone_number": "600111222",
                "group": "operator",
            },
            {
                "username": "operator2",
                "password": "operator123",
                "first_name": "Piotr",
                "last_name": "Zielinski",
                "email": "piotr.zielinski@example.com",
                "phone_number": "600555666",
                "group": "operator",
            },
            {
                "username": "operator3",
                "password": "operator123",
                "first_name": "Tomasz",
                "last_name": "Lewandowski",
                "email": "tomasz.lewandowski@example.com",
                "phone_number": "600999000",
                "group": "operator",
            },
        ]

        result = {}
        for spec in user_specs:
            user, created = User.objects.get_or_create(username=spec["username"])
            user.first_name = spec["first_name"]
            user.last_name = spec["last_name"]
            user.email = spec["email"]
            user.is_staff = spec.get("is_staff", False)
            user.is_superuser = spec.get("is_superuser", False)
            user.is_active = True
            user.set_password(spec["password"])
            user.save()
            user.groups.clear()
            user.groups.add(groups[spec["group"]])

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.phone_number = spec["phone_number"]
            profile.save()

            result[user.username] = user
            status = "created" if created else "updated"
            self.stdout.write(f"User {user.username}: {status}")

        return result

    def _seed_orders_and_rolls(self, users: dict[str, User]) -> tuple[int, int, int, int]:
        colors = ("Blue", "Transparent", "Green", "Black", "Red", "Yellow", "Gray", "Natural", "White")
        foil_names = ("HDPE", "LDPE", "MDPE")
        article_sizes = (
            "15L",
            "20L",
            "22L",
            "25L",
            "30L",
            "35L",
            "40L",
            "45L",
            "50L",
            "55L",
            "60L",
            "65L",
            "70L",
            "72L",
            "75L",
            "80L",
            "85L",
            "90L",
            "95L",
            "110L",
            "120L",
        )
        operator_names = ("operator1", "operator2", "operator3")

        created_orders = 0
        updated_orders = 0
        created_rolls = 0
        updated_rolls = 0

        base_date = date(2026, 3, 1)
        for seq in range(1, 27):
            order_date = base_date + timedelta(days=seq - 1)
            nrzp = f"{order_date.strftime('%Y%m%d')}/{1000 + seq}"
            status_value = STATUS_BY_SEQUENCE[seq]
            foil_type = (seq - 1) % 3
            priority = seq % 3
            nr_wytl = (seq - 1) % 5

            szer_worka = 190 + ((seq * 17) % 440)
            szer_rekawa = szer_worka + 40 + (seq % 3) * 10
            dlug_worka = 340 + ((seq * 29) % 760)
            grub_worka = 22 + ((seq * 3) % 40)
            ilosc_zlec = q2(4300 + seq * 450)
            ilosc_rolek = q2(4 + (seq % 7))
            dlug_rolki_korekta = q2(680 + (seq * 11) % 360)
            dlug_foli_plan = (ilosc_zlec / Decimal("1000")) * Decimal(str(dlug_worka))
            dlug_foil_plan_korekta = q2(dlug_foli_plan * Decimal("1.01"))

            uwagi = ""
            if status_value == Zamowienie.StatusChoices.ANULOWANE:
                reasons = (
                    "Anulowane przez klienta",
                    "Anulowane - brak surowca",
                    "Anulowane - korekta zamowienia",
                    "Anulowane - przesuniecie dostawy",
                )
                uwagi = reasons[seq % len(reasons)]
            elif status_value == Zamowienie.StatusChoices.ZREALIZOWANE and seq % 4 == 0:
                uwagi = "Zakonczone przed terminem"
            elif status_value == Zamowienie.StatusChoices.W_REALIZACJI and seq % 3 == 0:
                uwagi = "Priorytet klienta"

            defaults = {
                "Data": order_date,
                "Artykul": f"Worek {foil_names[foil_type]} {article_sizes[seq % len(article_sizes)]}",
                "Kod": f"{foil_names[foil_type][:2]}-{100 + seq}",
                "MMK": f"MMK-{seq:02d}" if seq % 2 == 0 else "",
                "Barwnik": colors[seq % len(colors)],
                "Status": status_value,
                "Priorytet": priority,
                "Rodzaj": foil_type,
                "IloscZlec": ilosc_zlec,
                "SzerWorka": szer_worka,
                "SzerRekawa": szer_rekawa,
                "DlugWorka": dlug_worka,
                "GrubWorka": grub_worka,
                "DlugFoilPlan_Korekta": dlug_foil_plan_korekta,
                "IloscRolekZlec": ilosc_rolek,
                "DlugRolkiZlec_Korekta": dlug_rolki_korekta,
                "NrWytl": nr_wytl,
                "Tasma": bool(seq % 2 == 0),
                "Uwagi": uwagi,
                "created_by": users["demo"],
            }
            order, created = Zamowienie.objects.update_or_create(NrZp=nrzp, defaults=defaults)
            if created:
                created_orders += 1
            else:
                updated_orders += 1

            if order.Status in [
                Zamowienie.StatusChoices.W_REALIZACJI,
                Zamowienie.StatusChoices.ZREALIZOWANE,
            ]:
                roll_count = min(int(order.IloscRolekZlec or 0), 3)
                for roll_number in range(1, roll_count + 1):
                    produced_length = q2((order.DlugRolkiZlec_Korekta or Decimal("700")) * Decimal("0.99"))
                    produced_weight = q2((order.WagaRolkiZlec or Decimal("20")) * Decimal("0.99"))
                    roll_defaults = {
                        "Data": order.Data,
                        "Zmiana": SHIFT_SEQUENCE[(roll_number - 1) % len(SHIFT_SEQUENCE)],
                        "NrWytl": order.NrWytl,
                        "Rodzaj": order.Rodzaj,
                        "DlugRolkiProd": produced_length,
                        "WagaRolkiProd": produced_weight,
                        "Slimak": q2(0),
                        "Walce": q2(0),
                        "Wynikowa": q2(order.GrubWorka),
                        "Wynik": q2(99 + (roll_number % 2)),
                        "Mieszanka": f"Mix {chr(65 + (seq % 6))}",
                        "Uwagi": "",
                        "UserName": operator_names[(seq + roll_number) % len(operator_names)],
                    }
                    _, roll_created = Rolki.objects.update_or_create(
                        NrZp=order.NrZp,
                        Rolka=roll_number,
                        defaults=roll_defaults,
                    )
                    if roll_created:
                        created_rolls += 1
                    else:
                        updated_rolls += 1

        return created_orders, updated_orders, created_rolls, updated_rolls
