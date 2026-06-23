from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand
from django.utils import timezone

from events.models import Rolki, UserProfile, Zamowienie


GROUP_NAMES = ("admin", "manager", "operator", "kierownik", "pracownik", "pracownik_maszyna")
SHIFT_SEQUENCE = ("I", "II", "III")
DEMO_COMPLETION_PROGRESS_VALUES = (60, 64, 68, 72, 76, 80, 84, 88, 92, 97)
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
        parser.add_argument(
            "--bulk-orders",
            type=int,
            default=0,
            help="Append additional deterministic demo orders for large-volume testing.",
        )
        parser.add_argument(
            "--bulk-start",
            type=int,
            default=1,
            help="Start sequence number for deterministic bulk demo orders.",
        )
        parser.add_argument(
            "--bulk-only",
            action="store_true",
            help="Skip baseline demo orders and seed only the requested bulk range.",
        )

    def handle(self, *args, **options):
        if options["wipe_orders"]:
            Rolki.objects.all().delete()
            Zamowienie.objects.all().delete()

        groups = {name: Group.objects.get_or_create(name=name)[0] for name in GROUP_NAMES}

        demo_users = self._ensure_users(groups)
        if options["bulk_only"]:
            orders_created = 0
            orders_updated = 0
            rolls_created = 0
            rolls_updated = 0
        else:
            orders_created, orders_updated, rolls_created, rolls_updated = self._seed_orders_and_rolls(
                demo_users
            )
        bulk_orders = max(0, options["bulk_orders"])
        bulk_start = max(1, options["bulk_start"])
        if bulk_orders:
            bulk_created, bulk_updated, bulk_rolls_created, bulk_rolls_updated = self._seed_bulk_orders(
                demo_users,
                bulk_start,
                bulk_orders,
            )
            orders_created += bulk_created
            orders_updated += bulk_updated
            rolls_created += bulk_rolls_created
            rolls_updated += bulk_rolls_updated

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
            {
                "username": "machine1",
                "password": "operator123",
                "first_name": "Marek",
                "last_name": "Maszynski",
                "email": "marek.maszynski@example.com",
                "phone_number": "600222333",
                "group": "pracownik_maszyna",
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
                        order=order,
                        Rolka=roll_number,
                        defaults=roll_defaults,
                    )
                    if roll_created:
                        created_rolls += 1
                    else:
                        updated_rolls += 1

        demo_base_date = date(2026, 4, 1)
        for index, progress_percent in enumerate(DEMO_COMPLETION_PROGRESS_VALUES, start=1):
            order_date = demo_base_date + timedelta(days=index - 1)
            nrzp = f"{order_date.strftime('%Y%m%d')}/{2000 + index}"
            foil_type = (index - 1) % 3
            priority = index % 3
            nr_wytl = (index - 1) % 5
            ilosc_zlec = q2(6000 + index * 350)
            ilosc_rolek = q2(5)
            dlug_worka = 700 + index * 12
            szer_worka = 280 + index * 8
            szer_rekawa = 340 + index * 8
            grub_worka = 32 + (index % 4) * 3
            dlug_foli_plan = (ilosc_zlec / Decimal("1000")) * Decimal(str(dlug_worka))
            dlug_foil_plan_korekta = q2(dlug_foli_plan * Decimal("1.01"))
            dlug_rolki_korekta = q2(dlug_foil_plan_korekta / ilosc_rolek)

            defaults = {
                "Data": order_date,
                "Artykul": f"Test realizacji {progress_percent}%",
                "Kod": f"TEST-{progress_percent}",
                "MMK": f"MMK-T{index:02d}",
                "Barwnik": colors[index % len(colors)],
                "Status": Zamowienie.StatusChoices.W_REALIZACJI,
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
                "Tasma": bool(index % 2 == 0),
                "Uwagi": f"Demo kolorowania {progress_percent}%",
                "created_by": users["demo"],
            }
            order, created = Zamowienie.objects.update_or_create(NrZp=nrzp, defaults=defaults)
            if created:
                created_orders += 1
            else:
                updated_orders += 1

            produced_length = q2((order.DlugFoliZlec_Korekta or Decimal("0")) * Decimal(progress_percent) / Decimal("100"))
            produced_weight = q2((order.WagaFoliZlec or Decimal("0")) * Decimal(progress_percent) / Decimal("100"))
            roll_defaults = {
                "Data": order.Data,
                "Zmiana": SHIFT_SEQUENCE[0],
                "NrWytl": order.NrWytl,
                "Rodzaj": order.Rodzaj,
                "DlugRolkiProd": produced_length,
                "WagaRolkiProd": produced_weight,
                "Slimak": q2(0),
                "Walce": q2(0),
                "Wynikowa": q2(order.GrubWorka),
                "Wynik": q2(99),
                "Mieszanka": f"Demo {progress_percent}",
                "Uwagi": "",
                "UserName": operator_names[(index - 1) % len(operator_names)],
            }
            _, roll_created = Rolki.objects.update_or_create(
                order=order,
                Rolka=1,
                defaults=roll_defaults,
            )
            if roll_created:
                created_rolls += 1
            else:
                updated_rolls += 1

        return created_orders, updated_orders, created_rolls, updated_rolls

    def _seed_bulk_orders(self, users: dict[str, User], start: int, count: int) -> tuple[int, int, int, int]:
        colors = ("Blue", "Transparent", "Green", "Black", "Red", "Yellow", "Gray", "Natural", "White")
        foil_names = ("HDPE", "LDPE", "MDPE")
        article_sizes = (
            "18L",
            "24L",
            "28L",
            "32L",
            "38L",
            "42L",
            "48L",
            "52L",
            "58L",
            "66L",
            "74L",
            "82L",
            "96L",
            "130L",
        )
        operator_names = ("operator1", "operator2", "operator3")
        status_cycle = (
            Zamowienie.StatusChoices.W_REALIZACJI,
            Zamowienie.StatusChoices.ZREALIZOWANE,
            Zamowienie.StatusChoices.PLANOWANE,
            Zamowienie.StatusChoices.ZREALIZOWANE,
            Zamowienie.StatusChoices.ANULOWANE,
            Zamowienie.StatusChoices.W_REALIZACJI,
        )

        created_orders = 0
        updated_orders = 0
        created_rolls = 0
        updated_rolls = 0

        base_date = date(2026, 5, 1)
        end = start + count
        now = timezone.now()
        order_specs: list[tuple[int, str, dict[str, object]]] = []
        order_numbers: list[str] = []
        for seq in range(start, end):
            order_date = base_date + timedelta(days=seq - 1)
            nrzp = f"{order_date.strftime('%Y%m%d')}/{4000 + seq}"
            status_value = status_cycle[(seq - 1) % len(status_cycle)]
            foil_type = (seq - 1) % len(foil_names)
            priority = seq % 3
            nr_wytl = (seq - 1) % 5

            szer_worka = 200 + ((seq * 11) % 460)
            szer_rekawa = szer_worka + 30 + (seq % 5) * 10
            dlug_worka = 380 + ((seq * 17) % 820)
            grub_worka = 24 + ((seq * 2) % 48)
            ilosc_zlec = q2(4800 + seq * 55)
            ilosc_rolek = q2(3 + (seq % 6))
            dlug_foli_plan = (ilosc_zlec / Decimal("1000")) * Decimal(str(dlug_worka))
            dlug_foil_plan_korekta = q2(dlug_foli_plan * (Decimal("1.00") + Decimal(seq % 4) / Decimal("100")))
            dlug_rolki_korekta = q2(dlug_foil_plan_korekta / ilosc_rolek)

            if status_value == Zamowienie.StatusChoices.ANULOWANE:
                uwagi = "Dummy data: anulowane testowo"
            elif status_value == Zamowienie.StatusChoices.ZREALIZOWANE:
                uwagi = "Dummy data: zakonczone"
            elif status_value == Zamowienie.StatusChoices.W_REALIZACJI:
                uwagi = "Dummy data: w realizacji"
            else:
                uwagi = "Dummy data: planowane"

            defaults = {
                "Data": order_date,
                "Artykul": f"Dummy {foil_names[foil_type]} {article_sizes[seq % len(article_sizes)]} #{seq:04d}",
                "Kod": f"DUM-{foil_names[foil_type][:2]}-{seq:04d}",
                "MMK": f"BULK-{seq:04d}" if seq % 2 == 0 else "",
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
            order_specs.append((seq, nrzp, defaults))
            order_numbers.append(nrzp)

        existing_orders = {
            order.NrZp: order
            for order in Zamowienie.objects.filter(NrZp__in=order_numbers)
        }
        orders_to_create: list[Zamowienie] = []
        orders_to_update: list[Zamowienie] = []
        order_update_fields = [
            "Data",
            "Artykul",
            "Kod",
            "MMK",
            "Barwnik",
            "Status",
            "Priorytet",
            "Rodzaj",
            "IloscZlec",
            "SzerWorka",
            "SzerRekawa",
            "DlugWorka",
            "GrubWorka",
            "DlugFoilPlan_Korekta",
            "IloscRolekZlec",
            "DlugRolkiZlec_Korekta",
            "NrWytl",
            "Tasma",
            "Uwagi",
            "created_by",
            "Zakladka",
            "WagaFoliZlec",
            "DlugFoliPlan",
            "DlugRolkiPlan",
            "DlugFoliZlec_Korekta",
            "WagaRolkiZlec",
            "updated_at",
        ]

        for _, nrzp, defaults in order_specs:
            order = existing_orders.get(nrzp)
            if order is None:
                order = Zamowienie(NrZp=nrzp, **defaults)
                order.calculate_parameters()
                order.created_at = now
                order.updated_at = now
                orders_to_create.append(order)
                created_orders += 1
                continue

            for field_name, value in defaults.items():
                setattr(order, field_name, value)
            order.calculate_parameters()
            order.updated_at = now
            orders_to_update.append(order)
            updated_orders += 1

        if orders_to_create:
            Zamowienie.objects.bulk_create(orders_to_create, batch_size=200)
        if orders_to_update:
            Zamowienie.objects.bulk_update(
                orders_to_update,
                order_update_fields,
                batch_size=200,
            )

        orders_by_number = {
            order.NrZp: order
            for order in Zamowienie.objects.filter(NrZp__in=order_numbers)
        }

        active_order_numbers: list[str] = []
        roll_specs: list[tuple[str, int, dict[str, object]]] = []
        for seq, nrzp, _ in order_specs:
            order = orders_by_number[nrzp]
            if order.Status not in [
                Zamowienie.StatusChoices.W_REALIZACJI,
                Zamowienie.StatusChoices.ZREALIZOWANE,
            ]:
                continue

            active_order_numbers.append(nrzp)
            completion_ratio = Decimal("0.68") + (Decimal(seq % 28) / Decimal("100"))
            roll_count = min(int(order.IloscRolekZlec or 0), 4)
            for roll_number in range(1, roll_count + 1):
                produced_length = q2((order.DlugRolkiZlec_Korekta or Decimal("700")) * completion_ratio)
                produced_weight = q2((order.WagaRolkiZlec or Decimal("20")) * completion_ratio)
                roll_defaults = {
                    "Data": order.Data,
                    "Zmiana": SHIFT_SEQUENCE[(seq + roll_number - 1) % len(SHIFT_SEQUENCE)],
                    "NrWytl": order.NrWytl,
                    "Rodzaj": order.Rodzaj,
                    "DlugRolkiProd": produced_length,
                    "WagaRolkiProd": produced_weight,
                    "Slimak": q2(0),
                    "Walce": q2(0),
                    "Wynikowa": q2(order.GrubWorka),
                    "Wynik": q2(97 + ((seq + roll_number) % 5)),
                    "Mieszanka": f"Bulk {chr(65 + (seq % 6))}",
                    "Uwagi": "",
                    "UserName": operator_names[(seq + roll_number) % len(operator_names)],
                }
                roll_specs.append((nrzp, roll_number, roll_defaults))

        existing_rolls = {
            (roll.order_id, roll.Rolka): roll
            for roll in Rolki.objects.filter(order_id__in=active_order_numbers)
        }
        rolls_to_create: list[Rolki] = []
        rolls_to_update: list[Rolki] = []
        roll_update_fields = [
            "Data",
            "Zmiana",
            "NrWytl",
            "Rodzaj",
            "DlugRolkiProd",
            "WagaRolkiProd",
            "Slimak",
            "Walce",
            "Wynikowa",
            "Wynik",
            "Mieszanka",
            "Uwagi",
            "UserName",
            "updated_at",
        ]

        for nrzp, roll_number, defaults in roll_specs:
            roll = existing_rolls.get((nrzp, roll_number))
            if roll is None:
                roll = Rolki(order_id=nrzp, Rolka=roll_number, **defaults)
                roll.created_at = now
                roll.updated_at = now
                rolls_to_create.append(roll)
                created_rolls += 1
                continue

            for field_name, value in defaults.items():
                setattr(roll, field_name, value)
            roll.updated_at = now
            rolls_to_update.append(roll)
            updated_rolls += 1

        if rolls_to_create:
            Rolki.objects.bulk_create(rolls_to_create, batch_size=400)
        if rolls_to_update:
            Rolki.objects.bulk_update(
                rolls_to_update,
                roll_update_fields,
                batch_size=400,
            )

        return created_orders, updated_orders, created_rolls, updated_rolls
