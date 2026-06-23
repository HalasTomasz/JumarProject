from datetime import date
from decimal import Decimal
import importlib

from django.contrib.auth import get_user_model
from django.db import transaction
from django.test import TestCase, override_settings

from events.bootstrap import ensure_bootstrap_login_user
from events.models import DailyOrderCounter, OrderRollCounter, Rolki, Zamowienie
from events.services.calculations import calculate_production_stats
from events.services.orders import generate_next_order_number, get_next_roll_number
from events.services.permissions import get_user_permissions


class SequenceAllocationTests(TestCase):
    def setUp(self):
        self.order_date = date(2026, 3, 9)
        self.date_prefix = self.order_date.strftime("%Y%m%d")

    def create_order(self, nr_zp: str) -> Zamowienie:
        return Zamowienie.objects.create(
            NrZp=nr_zp,
            Data=self.order_date,
            Kod="KOD",
            Artykul="Test order",
            MMK="",
            Barwnik="",
            Status=Zamowienie.StatusChoices.PLANOWANE,
            Priorytet=Zamowienie.PriorityChoices.SREDNI,
            Rodzaj=Zamowienie.FoilTypeChoices.HDPE,
            IloscZlec=Decimal("1000.00"),
            SzerWorka=200,
            SzerRekawa=220,
            DlugWorka=400,
            GrubWorka=25,
            Tasma=False,
        )

    def create_roll(self, nr_zp: str, roll_number: int) -> Rolki:
        order = Zamowienie.objects.get(NrZp=nr_zp)
        return Rolki.objects.create(
            order=order,
            Data=self.order_date,
            Zmiana="I",
            Rolka=roll_number,
            NrWytl=0,
            Rodzaj=Zamowienie.FoilTypeChoices.HDPE,
            DlugRolkiProd=Decimal("250.00"),
            WagaRolkiProd=Decimal("12.50"),
            UserName="operator",
        )

    def test_generate_next_order_number_backfills_from_existing_orders(self):
        self.create_order(f"{self.date_prefix}/1001")
        self.create_order(f"{self.date_prefix}/1007")

        next_number = generate_next_order_number(self.order_date)

        self.assertEqual(next_number, f"{self.date_prefix}/1008")
        self.assertEqual(
            DailyOrderCounter.objects.get(date_prefix=self.date_prefix).last_value,
            1008,
        )

    def test_generate_next_order_number_never_lags_existing_data(self):
        DailyOrderCounter.objects.create(date_prefix=self.date_prefix, last_value=1002)
        self.create_order(f"{self.date_prefix}/1011")

        next_number = generate_next_order_number(self.order_date)

        self.assertEqual(next_number, f"{self.date_prefix}/1012")
        self.assertEqual(
            DailyOrderCounter.objects.get(date_prefix=self.date_prefix).last_value,
            1012,
        )

    def test_roll_number_backfills_from_existing_rolls(self):
        nr_zp = f"{self.date_prefix}/1001"
        self.create_order(nr_zp)
        self.create_roll(nr_zp, 1)
        self.create_roll(nr_zp, 4)

        next_roll = get_next_roll_number(nr_zp)

        self.assertEqual(next_roll, 5)
        self.assertEqual(
            OrderRollCounter.objects.get(NrZp=nr_zp).last_value,
            5,
        )

    def test_roll_number_never_lags_existing_data(self):
        nr_zp = f"{self.date_prefix}/1002"
        OrderRollCounter.objects.create(NrZp=nr_zp, last_value=2)
        self.create_order(nr_zp)
        self.create_roll(nr_zp, 6)

        next_roll = get_next_roll_number(nr_zp)

        self.assertEqual(next_roll, 7)
        self.assertEqual(
            OrderRollCounter.objects.get(NrZp=nr_zp).last_value,
            7,
        )

    def test_order_counter_rolls_back_with_outer_transaction(self):
        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                generate_next_order_number(self.order_date)
                raise RuntimeError("force rollback")

        self.assertFalse(DailyOrderCounter.objects.filter(date_prefix=self.date_prefix).exists())


class LegacySerializerModuleTests(TestCase):
    def test_legacy_events_serializer_module_is_disabled(self):
        with self.assertRaises(ImportError) as exc_info:
            importlib.import_module("events.serializer")

        self.assertIn("events.serializer is deprecated and intentionally disabled", str(exc_info.exception))


class OrderCalculationTests(TestCase):
    def create_order(self, **overrides) -> Zamowienie:
        defaults = {
            "NrZp": "20260309/1001",
            "Data": date(2026, 3, 9),
            "Kod": "HD-35",
            "Artykul": "Test order",
            "MMK": "MMK-01",
            "Barwnik": "Blue",
            "Status": Zamowienie.StatusChoices.PLANOWANE,
            "Priorytet": Zamowienie.PriorityChoices.SREDNI,
            "Rodzaj": Zamowienie.FoilTypeChoices.HDPE,
            "IloscZlec": Decimal("12000.00"),
            "SzerWorka": 300,
            "SzerRekawa": 360,
            "DlugWorka": 500,
            "GrubWorka": 35,
            "IloscRolekZlec": Decimal("6.00"),
            "Tasma": False,
        }
        defaults.update(overrides)
        return Zamowienie.objects.create(**defaults)

    def test_explicit_foil_length_correction_updates_derived_values(self):
        order = self.create_order(DlugFoilPlan_Korekta=Decimal("6100.00"))

        order.refresh_from_db()

        self.assertEqual(order.DlugFoliPlan, Decimal("6000.00"))
        self.assertEqual(order.DlugFoliZlec_Korekta, Decimal("6100.00"))
        self.assertEqual(order.DlugRolkiPlan, Decimal("1016.67"))
        self.assertEqual(order.WagaFoliZlec, Decimal("146.03"))
        self.assertEqual(order.WagaRolkiZlec, Decimal("24.34"))

    def test_legacy_multiplier_style_foil_correction_still_works(self):
        order = self.create_order(
            NrZp="20260309/1002",
            DlugFoilPlan_Korekta=Decimal("1.05"),
        )

        order.refresh_from_db()

        self.assertEqual(order.DlugFoliPlan, Decimal("6000.00"))
        self.assertEqual(order.DlugFoliZlec_Korekta, Decimal("6300.00"))
        self.assertEqual(order.DlugRolkiPlan, Decimal("1050.00"))
        self.assertEqual(order.WagaFoliZlec, Decimal("150.82"))
        self.assertEqual(order.WagaRolkiZlec, Decimal("25.14"))

    def test_roll_length_correction_overrides_foil_length_correction_for_target_total(self):
        order = self.create_order(
            NrZp="20260309/1003",
            DlugFoilPlan_Korekta=Decimal("6100.00"),
            DlugRolkiZlec_Korekta=Decimal("1015.00"),
        )

        order.refresh_from_db()

        self.assertEqual(order.DlugFoliZlec_Korekta, Decimal("6090.00"))
        self.assertEqual(calculate_production_stats(order.NrZp)["length_remaining"], 6090.0)


class BootstrapLoginUserTests(TestCase):
    @override_settings(
        BOOTSTRAP_LOGIN="bootstrap-user",
        BOOTSTRAP_PASSWORD="SystemDupy1900#1",
    )
    def test_ensure_bootstrap_login_user_creates_user_from_settings(self):
        user, created = ensure_bootstrap_login_user()

        self.assertTrue(created)
        self.assertEqual(user.username, "bootstrap-user")
        self.assertTrue(user.check_password("SystemDupy1900#1"))
        self.assertTrue(hasattr(user, "profile"))

    @override_settings(
        BOOTSTRAP_LOGIN="bootstrap-existing",
        BOOTSTRAP_PASSWORD="SystemDupy1900#1",
    )
    def test_ensure_bootstrap_login_user_does_not_reset_existing_password(self):
        user_model = get_user_model()
        existing_user = user_model.objects.create_user(
            username="bootstrap-existing",
            password="ExistingPassword1900#1",
        )

        user, created = ensure_bootstrap_login_user()

        existing_user.refresh_from_db()
        self.assertFalse(created)
        self.assertEqual(user.pk, existing_user.pk)
        self.assertTrue(existing_user.check_password("ExistingPassword1900#1"))

    @override_settings(
        BOOTSTRAP_LOGIN="",
        BOOTSTRAP_PASSWORD="",
    )
    def test_ensure_bootstrap_login_user_skips_when_credentials_are_missing(self):
        user, created = ensure_bootstrap_login_user()

        self.assertIsNone(user)
        self.assertFalse(created)


class ReservedAdminUserTests(TestCase):
    def test_tom_receives_admin_role_on_creation(self):
        user, created = get_user_model().objects.get_or_create(username="TOM")
        if created or not user.has_usable_password():
            user.set_password("StrongPassword1900#1")
            user.save(update_fields=["password"])

        self.assertTrue(user.groups.filter(name="admin").exists())
        self.assertTrue(get_user_permissions(user)["can_manage_users"])
        self.assertTrue(hasattr(user, "profile"))
