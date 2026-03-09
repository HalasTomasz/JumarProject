from __future__ import annotations

from datetime import date
from decimal import Decimal
from urllib.parse import quote

from django.contrib.auth.models import Group, User
from rest_framework.test import APITestCase

from events.models import Rolki, UserProfile, Zamowienie


class FrontendApiContractTests(APITestCase):
    def setUp(self):
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user = User.objects.create_user(
            username="apiadmin",
            password="testpass123",
            first_name="Api",
            last_name="Admin",
        )
        self.user.groups.add(admin_group)
        UserProfile.objects.get_or_create(user=self.user, defaults={"phone_number": "600000001"})
        self.client.force_authenticate(user=self.user)

        self.order = Zamowienie.objects.create(
            NrZp="20260301/1001",
            Data=date(2026, 3, 1),
            Kod="HD-35",
            Artykul="Worek HDPE 35L",
            MMK="MMK-01",
            Barwnik="Blue",
            Status=Zamowienie.StatusChoices.W_REALIZACJI,
            Priorytet=Zamowienie.PriorityChoices.WYSOKI,
            Rodzaj=Zamowienie.FoilTypeChoices.HDPE,
            IloscZlec=Decimal("12000"),
            SzerWorka=300,
            SzerRekawa=360,
            DlugWorka=500,
            GrubWorka=35,
            DlugFoilPlan_Korekta=Decimal("6100"),
            IloscRolekZlec=Decimal("6"),
            DlugRolkiZlec_Korekta=Decimal("1015"),
            NrWytl=0,
            Tasma=False,
            Uwagi="Test",
            created_by=self.user,
        )

        self.roll = Rolki.objects.create(
            NrZp=self.order.NrZp,
            Data=self.order.Data,
            Zmiana="I",
            Rolka=1,
            NrWytl=self.order.NrWytl,
            Rodzaj=self.order.Rodzaj,
            DlugRolkiProd=Decimal("980"),
            WagaRolkiProd=Decimal("17"),
            Slimak=Decimal("0"),
            Walce=Decimal("0"),
            Wynikowa=Decimal("35"),
            Wynik=Decimal("99"),
            Mieszanka="Mix A",
            Uwagi="",
            UserName="operator1",
        )

        self.completed_order = Zamowienie.objects.create(
            NrZp="20260302/1002",
            Data=date(2026, 3, 2),
            Kod="LD-60",
            Artykul="Worek LDPE 60L",
            MMK="MMK-02",
            Barwnik="Transparent",
            Status=Zamowienie.StatusChoices.ZREALIZOWANE,
            Priorytet=Zamowienie.PriorityChoices.SREDNI,
            Rodzaj=Zamowienie.FoilTypeChoices.LDPE,
            IloscZlec=Decimal("8500"),
            SzerWorka=420,
            SzerRekawa=500,
            DlugWorka=700,
            GrubWorka=45,
            DlugFoilPlan_Korekta=Decimal("6100"),
            IloscRolekZlec=Decimal("8"),
            DlugRolkiZlec_Korekta=Decimal("760"),
            NrWytl=1,
            Tasma=True,
            Uwagi="Completed order note",
            created_by=self.user,
        )

        self.completed_roll = Rolki.objects.create(
            NrZp=self.completed_order.NrZp,
            Data=self.completed_order.Data,
            Zmiana="II",
            Rolka=1,
            NrWytl=self.completed_order.NrWytl,
            Rodzaj=self.completed_order.Rodzaj,
            DlugRolkiProd=Decimal("720"),
            WagaRolkiProd=Decimal("13.50"),
            Slimak=Decimal("0"),
            Walce=Decimal("0"),
            Wynikowa=Decimal("45"),
            Wynik=Decimal("101"),
            Mieszanka="Mix B",
            Uwagi="Completed roll note",
            UserName="operator2",
        )

    def test_frontend_routes_are_registered(self):
        encoded_nrzp = quote(self.order.NrZp, safe="")
        routes = [
            "/api/auth/me/",
            "/api/home/summary/",
            "/api/meta/orders/",
            "/api/orders/?status=1&page=1&page_size=15",
            f"/api/orders/{self.order.id}/",
            f"/api/orders/{self.order.id}/status/",
            "/api/orders/legacy/?status=2",
            f"/api/orders/progress/?nrzp={quote(self.order.NrZp, safe='')}",
            "/api/production/orders/",
            f"/api/production/orders/{encoded_nrzp}/summary/",
            f"/api/production/orders/{encoded_nrzp}/rolls/",
            f"/api/production/orders/{encoded_nrzp}/rolls/{self.roll.id}/",
            "/api/reports/completed-production/",
            "/api/reports/production/",
            "/api/reports/operator/",
            "/api/reports/order-status/",
            "/api/reports/workers/",
            "/api/users/",
            "/api/users/groups/",
        ]

        for route in routes:
            response = self.client.get(route)
            self.assertNotEqual(response.status_code, 404, msg=f"Route missing: {route}")

    def test_order_status_route_and_update_flow(self):
        update_response = self.client.patch(
            f"/api/orders/{self.order.id}/",
            {"Uwagi": "Updated"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)

        status_response = self.client.post(
            f"/api/orders/{self.order.id}/status/",
            {"status": Zamowienie.StatusChoices.ZREALIZOWANE},
            format="json",
        )
        self.assertEqual(status_response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.Status, Zamowienie.StatusChoices.ZREALIZOWANE)

    def test_main_order_update_cannot_bypass_status_transition_rules(self):
        response = self.client.patch(
            f"/api/orders/{self.order.id}/",
            {"Status": Zamowienie.StatusChoices.PLANOWANE},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["Status"], ["Nie można zmienić statusu"])
        self.order.refresh_from_db()
        self.assertEqual(self.order.Status, Zamowienie.StatusChoices.W_REALIZACJI)

    def test_production_and_report_endpoints_are_paginated(self):
        Zamowienie.objects.create(
            NrZp="20260303/1003",
            Data=date(2026, 3, 3),
            Kod="HD-45",
            Artykul="Worek HDPE 45L",
            MMK="MMK-03",
            Barwnik="Green",
            Status=Zamowienie.StatusChoices.W_REALIZACJI,
            Priorytet=Zamowienie.PriorityChoices.NISKI,
            Rodzaj=Zamowienie.FoilTypeChoices.HDPE,
            IloscZlec=Decimal("6000"),
            SzerWorka=320,
            SzerRekawa=380,
            DlugWorka=550,
            GrubWorka=30,
            DlugFoilPlan_Korekta=Decimal("3400"),
            IloscRolekZlec=Decimal("4"),
            DlugRolkiZlec_Korekta=Decimal("860"),
            NrWytl=2,
            Tasma=False,
            Uwagi="Second active order",
            created_by=self.user,
        )

        endpoints = [
            ("/api/production/orders/?page=1&page_size=1", 2),
            ("/api/reports/production/?page=1&page_size=1", 2),
            ("/api/reports/operator/?page=1&page_size=1", 2),
            ("/api/reports/order-status/?page=1&page_size=1", 3),
        ]

        for endpoint, expected_count in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 200, msg=f"Unexpected status for {endpoint}")
            self.assertEqual(response.data["count"], expected_count, msg=f"Unexpected count for {endpoint}")
            self.assertEqual(len(response.data["results"]), 1, msg=f"Unexpected page size for {endpoint}")

        operator_row = self.client.get("/api/reports/operator/?page=1&page_size=1").data["results"][0]
        self.assertEqual(operator_row["Data"], "2026-03-02")
        self.assertEqual(operator_row["UserName"], "operator2")
        self.assertEqual(Decimal(operator_row["total_dlugosc"]), Decimal("720.00"))
        self.assertEqual(Decimal(operator_row["total_waga"]), Decimal("13.50"))

    def test_legacy_orders_endpoint_is_paginated(self):
        response = self.client.get("/api/orders/legacy/?page=1&page_size=1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 1)

    def test_completed_production_report_is_paginated(self):
        response = self.client.get("/api/reports/completed-production/?page=1&page_size=1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        row = response.data["results"][0]
        self.assertEqual(row["NrZp"], self.completed_order.NrZp)
        self.assertEqual(row["Artykul"], self.completed_order.Artykul)
        self.assertEqual(row["order_uwagi"], self.completed_order.Uwagi)
        self.assertEqual(row["nrwyt_label"], "W2")
        self.assertEqual(row["foil_type_label"], "LDPE")

    def test_order_progress_batch_returns_requested_summaries(self):
        response = self.client.post(
            "/api/orders/progress/",
            {"order_numbers": [self.order.NrZp, self.completed_order.NrZp]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data["items"].keys()), {self.order.NrZp, self.completed_order.NrZp})
        self.assertEqual(Decimal(response.data["items"][self.order.NrZp]["length_produced"]), Decimal("980.0"))
        self.assertEqual(response.data["items"][self.order.NrZp]["rolls_produced"], 1)
        self.assertEqual(response.data["items"][self.completed_order.NrZp]["rolls_produced"], 1)

    def test_workers_report_is_paginated_and_aggregated(self):
        Rolki.objects.create(
            NrZp=self.order.NrZp,
            Data=self.order.Data,
            Zmiana="I",
            Rolka=2,
            NrWytl=self.order.NrWytl,
            Rodzaj=self.order.Rodzaj,
            DlugRolkiProd=Decimal("20"),
            WagaRolkiProd=Decimal("3"),
            Slimak=Decimal("0"),
            Walce=Decimal("0"),
            Wynikowa=Decimal("35"),
            Wynik=Decimal("98"),
            Mieszanka="Mix C",
            Uwagi="",
            UserName="operator2",
        )

        response = self.client.get(
            "/api/reports/workers/?date_from=2026-03-01&date_to=2026-03-01&page=1&page_size=10"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        row = response.data["results"][0]
        self.assertEqual(row["Data"], "2026-03-01")
        self.assertEqual(row["Zmiana"], "I")
        self.assertEqual(row["NrWytl"], 0)
        self.assertEqual(row["nrwyt_label"], "W1")
        self.assertEqual(row["foil_type_label"], "HDPE")
        self.assertEqual(Decimal(row["total_dlugosc"]), Decimal("1000.00"))
        self.assertEqual(Decimal(row["total_waga"]), Decimal("20.00"))
        self.assertEqual(row["operators"], "operator1, operator2")


class FrontendApiPermissionTests(APITestCase):
    def setUp(self):
        self.admin_group, _ = Group.objects.get_or_create(name="admin")
        self.manager_group, _ = Group.objects.get_or_create(name="kierownik")
        self.worker_group, _ = Group.objects.get_or_create(name="pracownik")

        self.admin = User.objects.create_user(username="admin", password="testpass123")
        self.manager = User.objects.create_user(username="manager", password="testpass123")
        self.worker = User.objects.create_user(username="worker", password="testpass123")

        self.admin.groups.add(self.admin_group)
        self.manager.groups.add(self.manager_group)
        self.worker.groups.add(self.worker_group)

        for user in (self.admin, self.manager, self.worker):
            UserProfile.objects.get_or_create(user=user)

        self.order = Zamowienie.objects.create(
            NrZp="20260309/1001",
            Data=date(2026, 3, 9),
            Kod="HD-35",
            Artykul="Worek HDPE 35L",
            MMK="MMK-01",
            Barwnik="Blue",
            Status=Zamowienie.StatusChoices.W_REALIZACJI,
            Priorytet=Zamowienie.PriorityChoices.WYSOKI,
            Rodzaj=Zamowienie.FoilTypeChoices.HDPE,
            IloscZlec=Decimal("12000"),
            SzerWorka=300,
            SzerRekawa=360,
            DlugWorka=500,
            GrubWorka=35,
            DlugFoilPlan_Korekta=Decimal("6100"),
            IloscRolekZlec=Decimal("6"),
            DlugRolkiZlec_Korekta=Decimal("1015"),
            NrWytl=0,
            Tasma=False,
            Uwagi="Test",
            created_by=self.admin,
        )

        self.roll = Rolki.objects.create(
            NrZp=self.order.NrZp,
            Data=self.order.Data,
            Zmiana="I",
            Rolka=1,
            NrWytl=self.order.NrWytl,
            Rodzaj=self.order.Rodzaj,
            DlugRolkiProd=Decimal("980"),
            WagaRolkiProd=Decimal("17"),
            Slimak=Decimal("0"),
            Walce=Decimal("0"),
            Wynikowa=Decimal("35"),
            Wynik=Decimal("99"),
            Mieszanka="Mix A",
            Uwagi="",
            UserName="operator1",
        )

    def _order_payload(self, article: str = "Nowe zlecenie") -> dict[str, object]:
        return {
            "Data": "2026-03-09",
            "Kod": "HD-40",
            "Artykul": article,
            "MMK": "MMK-02",
            "Barwnik": "Black",
            "Status": Zamowienie.StatusChoices.PLANOWANE,
            "Priorytet": Zamowienie.PriorityChoices.SREDNI,
            "Rodzaj": Zamowienie.FoilTypeChoices.HDPE,
            "IloscZlec": "1000.00",
            "SzerWorka": 220,
            "SzerRekawa": 260,
            "DlugWorka": 400,
            "GrubWorka": 25,
            "Tasma": False,
            "Uwagi": "Nowe zlecenie",
        }

    def _roll_payload(self) -> dict[str, object]:
        return {
            "Data": "2026-03-09",
            "Zmiana": "II",
            "NrWytl": 0,
            "Rodzaj": Zamowienie.FoilTypeChoices.HDPE,
            "DlugRolkiProd": "1000.00",
            "WagaRolkiProd": "18.50",
            "Mieszanka": "Mix B",
            "Uwagi": "Raportowa rolka",
        }

    def _calculator_payload(self) -> dict[str, object]:
        return {
            "Rodzaj": Zamowienie.FoilTypeChoices.HDPE,
            "Tasma": False,
            "SzerWorka": 220,
            "SzerRekawa": 260,
            "GrubWorka": 25,
            "DlugWorka": 400,
            "IloscZlec": "1000.00",
        }

    def test_worker_can_access_reports_and_calculator_but_not_operational_views(self):
        self.client.force_authenticate(user=self.worker)
        encoded_nrzp = quote(self.order.NrZp, safe="")

        allowed_gets = [
            "/api/reports/completed-production/",
            "/api/reports/production/",
            "/api/reports/operator/",
            "/api/reports/order-status/",
            "/api/reports/workers/",
            f"/api/production/orders/{encoded_nrzp}/rolls/",
            f"/api/production/orders/{encoded_nrzp}/rolls/{self.roll.id}/",
        ]
        denied_requests = [
            ("get", "/api/orders/"),
            ("get", "/api/orders/legacy/"),
            ("post", "/api/orders/progress/", {"order_numbers": [self.order.NrZp]}),
            ("get", "/api/meta/orders/"),
            ("get", "/api/production/orders/"),
            ("get", f"/api/production/orders/{encoded_nrzp}/summary/"),
            ("post", "/api/orders/", self._order_payload()),
            (
                "post",
                f"/api/orders/{self.order.id}/status/",
                {"status": Zamowienie.StatusChoices.ZREALIZOWANE},
            ),
            ("post", f"/api/production/orders/{encoded_nrzp}/rolls/", self._roll_payload()),
            ("patch", f"/api/production/orders/{encoded_nrzp}/rolls/{self.roll.id}/", {"Uwagi": "Zmiana"}),
        ]

        for endpoint in allowed_gets:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 200, msg=f"Expected report access for {endpoint}")

        calculator_response = self.client.post("/api/calculator/", self._calculator_payload(), format="json")
        self.assertEqual(calculator_response.status_code, 200)

        for method, endpoint, *payload in denied_requests:
            if payload:
                response = getattr(self.client, method)(endpoint, payload[0], format="json")
            else:
                response = getattr(self.client, method)(endpoint)
            self.assertEqual(response.status_code, 403, msg=f"Expected denial for {method.upper()} {endpoint}")

    def test_manager_can_manage_orders_and_production_but_not_users(self):
        self.client.force_authenticate(user=self.manager)
        encoded_nrzp = quote(self.order.NrZp, safe="")

        self.assertEqual(self.client.get("/api/orders/").status_code, 200)
        self.assertEqual(self.client.get("/api/orders/legacy/").status_code, 200)
        self.assertEqual(
            self.client.post("/api/orders/progress/", {"order_numbers": [self.order.NrZp]}, format="json").status_code,
            200,
        )
        self.assertEqual(self.client.get("/api/meta/orders/").status_code, 200)
        self.assertEqual(self.client.get("/api/production/orders/").status_code, 200)
        self.assertEqual(self.client.get(f"/api/production/orders/{encoded_nrzp}/summary/").status_code, 200)
        self.assertEqual(self.client.get("/api/reports/completed-production/").status_code, 200)
        self.assertEqual(self.client.get("/api/reports/production/").status_code, 200)
        self.assertEqual(self.client.get("/api/reports/workers/").status_code, 200)

        create_response = self.client.post("/api/orders/", self._order_payload("Manager order"), format="json")
        self.assertEqual(create_response.status_code, 201)

        update_response = self.client.patch(
            f"/api/orders/{self.order.id}/",
            {"Uwagi": "Manager updated"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)

        status_response = self.client.post(
            f"/api/orders/{self.order.id}/status/",
            {"status": Zamowienie.StatusChoices.ZREALIZOWANE},
            format="json",
        )
        self.assertEqual(status_response.status_code, 200)

        roll_response = self.client.post(
            f"/api/production/orders/{encoded_nrzp}/rolls/",
            self._roll_payload(),
            format="json",
        )
        self.assertEqual(roll_response.status_code, 201)

        self.assertEqual(self.client.get("/api/users/").status_code, 403)
        self.assertEqual(self.client.get("/api/users/groups/").status_code, 403)

    def test_admin_can_manage_users(self):
        self.client.force_authenticate(user=self.admin)

        self.assertEqual(self.client.get("/api/users/").status_code, 200)
        self.assertEqual(self.client.get("/api/users/groups/").status_code, 200)

        create_response = self.client.post(
            "/api/users/",
            {
                "username": "new-user",
                "password": "testpass123",
                "group": "pracownik",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)

    def test_reserved_tom_user_is_restored_as_app_admin(self):
        tom, _ = User.objects.get_or_create(username="TOM")
        tom.set_password("StrongPassword1900#1")
        tom.save(update_fields=["password"])
        tom.groups.clear()

        self.client.force_authenticate(user=tom)

        me_response = self.client.get("/api/auth/me/")
        users_response = self.client.get("/api/users/")

        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(users_response.status_code, 200)
        self.assertIn("admin", me_response.data["groups"])
        self.assertTrue(me_response.data["permissions"]["can_manage_users"])

        tom.refresh_from_db()
        self.assertTrue(tom.groups.filter(name="admin").exists())

    def test_admin_user_creation_rejects_passwords_blocked_by_django_validators(self):
        self.client.force_authenticate(user=self.admin)

        invalid_passwords = (
            ("short-user", "Aa12345"),
            ("numeric-user", "12345678"),
        )

        for username, password in invalid_passwords:
            with self.subTest(username=username):
                response = self.client.post(
                    "/api/users/",
                    {
                        "username": username,
                        "password": password,
                        "group": "pracownik",
                    },
                    format="json",
                )

                self.assertEqual(response.status_code, 400)
                self.assertIn("password", response.data)
                self.assertFalse(User.objects.filter(username=username).exists())

    def test_auth_me_exposes_role_flags_used_by_frontend(self):
        self.client.force_authenticate(user=self.worker)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["permissions"],
            {
                "is_admin": False,
                "is_manager": False,
                "is_worker": True,
                "can_edit_orders": False,
                "can_change_order_status": False,
                "can_manage_production": False,
                "can_write_rolls": False,
                "can_use_calculator": True,
                "can_view_reports": True,
                "can_manage_users": False,
            },
        )
