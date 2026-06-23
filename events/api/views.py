"""REST views powering the React front-end."""

from django.contrib.auth.models import Group, User
from django.db import transaction
from django.db.models import Aggregate, CharField, Count, F, Q, Sum, Value
from django.db.models.functions import Cast, Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from events.models import Rolki, Zamowienie
from events.services import (
    apply_order_filters,
    build_order_copy_payload,
    calculate_foil_parameters,
    calculate_production_stats,
    calculate_production_stats_batch,
    can_change_order_status,
    generate_next_order_number,
    get_user_permissions,
    get_next_roll_number,
)
from events.user_roles import ensure_reserved_admin_access

from .permissions import (
    CanAccessRolls,
    CanManageOrders,
    CanManageProduction,
    CanUseCalculator,
    CanViewReports,
    IsAdminRole,
)
from .pagination import OrderPagePagination, ReportPagePagination
from .serializers import (
    CalculatorSerializer,
    CompletedProductionReportSerializer,
    OperatorReportSerializer,
    OrderSerializer,
    ProductionReportSerializer,
    RollSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserSerializer,
    WorkersReportSerializer,
)


DEFAULT_USER_GROUPS = (
    "admin",
    "manager",
    "operator",
    "kierownik",
    "pracownik",
    "pracownik_maszyna",
)


class GroupConcat(Aggregate):
    function = "GROUP_CONCAT"
    template = "%(function)s(%(distinct)s%(expressions)s ORDER BY %(ordering)s SEPARATOR ', ')"
    allow_distinct = True

    def __init__(self, expression, distinct=False, ordering=None, **extra):
        super().__init__(
            expression,
            distinct="DISTINCT " if distinct else "",
            ordering=ordering or expression,
            output_field=CharField(),
            **extra,
        )


def ensure_admin_group(user):
    ensure_reserved_admin_access(user)
    if not get_user_permissions(user).get("can_manage_users"):
        raise PermissionDenied("Brak uprawnień administracyjnych do zarządzania użytkownikami")


class LoginView(APIView):
    """Token-based login endpoint."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AuthTokenSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        ensure_reserved_admin_access(user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = getattr(request.user, "auth_token", None)
        if token:
            token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_reserved_admin_access(request.user)
        return Response(UserSerializer(request.user).data)


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminRole]
    pagination_class = None

    def _check_permissions(self):
        ensure_admin_group(self.request.user)

    def get_queryset(self):
        self._check_permissions()
        return User.objects.all().order_by("username")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        self._check_permissions()
        serializer.save()


class UserDetailUpdateView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminRole]
    queryset = User.objects.all().order_by("username")

    def _check_permissions(self):
        ensure_admin_group(self.request.user)

    def get_object(self):
        self._check_permissions()
        return super().get_object()

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def perform_destroy(self, instance):
        if instance.is_superuser or instance.groups.filter(name__iexact="admin").exists():
            raise PermissionDenied("Nie można usunąć administratora.")
        super().perform_destroy(instance)


class UserGroupListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        ensure_admin_group(request.user)
        for group_name in DEFAULT_USER_GROUPS:
            Group.objects.get_or_create(name=group_name)
        group_names = Group.objects.all().order_by("name").values_list("name", flat=True)
        return Response({"groups": list(group_names)})


class OrderViewSet(viewsets.ModelViewSet):
    """CRUD operations for orders."""

    permission_classes = [CanManageOrders]
    serializer_class = OrderSerializer
    queryset = Zamowienie.objects.select_related("created_by").all()

    def get_queryset(self):
        queryset = apply_order_filters(super().get_queryset(), self.request.query_params)
        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        with transaction.atomic():
            serializer.save(
                NrZp=generate_next_order_number(),
                created_by=self.request.user,
            )

    def perform_destroy(self, instance):
        if instance.rolls.exists():
            raise ValidationError(
                {"detail": "Nie można usunąć zlecenia, które zawiera rolki produkcyjne."}
            )
        instance.delete()

    @action(detail=True, methods=["post"])
    def copy(self, request, pk=None):
        """Duplicate an existing order."""
        payload = build_order_copy_payload(self.get_object())
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save(
                NrZp=generate_next_order_number(),
                created_by=request.user,
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="status")
    def update_status(self, request, pk=None):
        order = self.get_object()
        status_raw = request.data.get("status")
        if status_raw is None:
            return Response({"detail": "Missing status value"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_status = int(status_raw)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid status value"}, status=status.HTTP_400_BAD_REQUEST)
        valid_statuses = {value for value, _ in Zamowienie.StatusChoices.choices}
        if new_status not in valid_statuses:
            return Response({"detail": "Invalid status value"}, status=status.HTTP_400_BAD_REQUEST)

        if not can_change_order_status(order, new_status):
            return Response({"detail": "Nie można zmienić statusu"}, status=status.HTTP_400_BAD_REQUEST)

        order.Status = new_status
        order.save()
        return Response(self.get_serializer(order).data)


class OrderMetadataView(APIView):
    permission_classes = [CanManageOrders]

    def get(self, request):
        status_choices = Zamowienie._meta.get_field("Status").choices
        priority_choices = Zamowienie._meta.get_field("Priorytet").choices
        foil_choices = Zamowienie._meta.get_field("Rodzaj").choices
        return Response(
            {
                "status": [{"value": value, "label": label} for value, label in status_choices],
                "priority": [{"value": value, "label": label} for value, label in priority_choices],
                "foil_types": [{"value": value, "label": label} for value, label in foil_choices],
            }
        )


class LegacyOrderListView(generics.ListAPIView):
    permission_classes = [CanManageOrders]
    serializer_class = OrderSerializer
    pagination_class = OrderPagePagination

    def get_queryset(self):
        queryset = Zamowienie.objects.all()
        queryset = apply_order_filters(queryset, self.request.query_params)
        return queryset.order_by("-Data", "-created_at")


class OrderRollListCreateView(generics.ListCreateAPIView):
    permission_classes = [CanAccessRolls]
    serializer_class = RollSerializer
    pagination_class = None

    def get_queryset(self):
        return Rolki.objects.filter(order_id=self.kwargs["nrzp"]).order_by("-Data", "-Zmiana", "Rolka")

    def perform_create(self, serializer):
        nrzp = self.kwargs["nrzp"]
        with transaction.atomic():
            order = get_object_or_404(Zamowienie.objects.select_for_update(), NrZp=nrzp)
            serializer.save(
                order=order,
                NrWytl=order.NrWytl,
                Rodzaj=order.Rodzaj,
                UserName=self.request.user.username,
                Rolka=get_next_roll_number(nrzp),
            )


class OrderRollDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [CanAccessRolls]
    serializer_class = RollSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return Rolki.objects.filter(order_id=self.kwargs["nrzp"])


class ProductionSummaryView(APIView):
    permission_classes = [CanManageProduction]

    def get(self, request, nrzp):
        return Response(calculate_production_stats(nrzp))


class OrderProgressBatchView(APIView):
    permission_classes = [CanManageOrders]

    @staticmethod
    def _extract_order_numbers(request):
        order_numbers = [value for value in request.query_params.getlist("nrzp") if str(value).strip()]
        if request.method == "POST":
            payload_values = request.data.get("order_numbers", [])
            if isinstance(payload_values, list):
                order_numbers.extend(payload_values)
        elif not order_numbers:
            raw_value = request.query_params.get("nrzp")
            if raw_value:
                order_numbers.extend(raw_value.split(","))
        return [str(value).strip() for value in order_numbers if str(value).strip()]

    def get(self, request):
        return Response({"items": calculate_production_stats_batch(self._extract_order_numbers(request))})

    def post(self, request):
        return Response({"items": calculate_production_stats_batch(self._extract_order_numbers(request))})


class ProductionOrdersView(generics.ListAPIView):
    permission_classes = [CanManageProduction]
    serializer_class = OrderSerializer
    pagination_class = OrderPagePagination

    def get_queryset(self):
        return Zamowienie.objects.filter(Status=Zamowienie.StatusChoices.W_REALIZACJI)


class CalculatorApiView(APIView):
    permission_classes = [CanUseCalculator]

    def post(self, request):
        serializer = CalculatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(calculate_foil_parameters(serializer.validated_data))


class HomeSummaryView(APIView):
    def get(self, request):
        total_orders = Zamowienie.objects.count()
        status_counts = Zamowienie.objects.values("Status").annotate(total=Count("Status")).order_by("Status")
        status_map = dict(Zamowienie._meta.get_field("Status").choices)
        formatted_counts = {
            status_map.get(status_obj["Status"], str(status_obj["Status"])): status_obj["total"]
            for status_obj in status_counts
        }

        return Response(
            {
                "user": UserSerializer(request.user).data,
                "stats": {
                    "total_orders": total_orders,
                    "by_status": formatted_counts,
                },
            }
        )


class ProductionReportAPIView(generics.ListAPIView):
    permission_classes = [CanViewReports]
    serializer_class = ProductionReportSerializer
    pagination_class = ReportPagePagination

    def get_queryset(self):
        return Rolki.objects.select_related(None).order_by("-Data")


class CompletedProductionReportAPIView(generics.ListAPIView):
    permission_classes = [CanViewReports]
    serializer_class = CompletedProductionReportSerializer
    pagination_class = ReportPagePagination

    def get_queryset(self):
        params = self.request.query_params
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        search_term = (params.get("q") or "").strip()
        extruder_value = (params.get("extruder") or "").strip()

        completed_orders = Zamowienie.objects.filter(Status=Zamowienie.StatusChoices.ZREALIZOWANE)
        queryset = Rolki.objects.filter(order__in=completed_orders).select_related("order").annotate(
            Artykul=F("order__Artykul"),
            SzerWorka=F("order__SzerWorka"),
            SzerRekawa=F("order__SzerRekawa"),
            Zakladka=F("order__Zakladka"),
            GrubWorka=F("order__GrubWorka"),
            order_uwagi=F("order__Uwagi"),
            DataText=Cast("Data", output_field=CharField()),
            NrWytlText=Cast("NrWytl", output_field=CharField()),
            RolkaText=Cast("Rolka", output_field=CharField()),
        )

        if date_from:
            queryset = queryset.filter(Data__gte=date_from)
        if date_to:
            queryset = queryset.filter(Data__lte=date_to)
        if extruder_value:
            queryset = queryset.filter(NrWytl=extruder_value)
        if search_term:
            queryset = queryset.filter(
                Q(order_id__icontains=search_term)
                | Q(Zmiana__icontains=search_term)
                | Q(DataText__icontains=search_term)
                | Q(NrWytlText__icontains=search_term)
                | Q(RolkaText__icontains=search_term)
                | Q(Artykul__icontains=search_term)
                | Q(UserName__icontains=search_term)
                | Q(Uwagi__icontains=search_term)
                | Q(order_uwagi__icontains=search_term)
                | Q(Mieszanka__icontains=search_term)
            )

        return queryset.order_by("-Data", "NrWytl", "order_id", "Rolka")


class OperatorReportAPIView(generics.ListAPIView):
    permission_classes = [CanViewReports]
    serializer_class = OperatorReportSerializer
    pagination_class = ReportPagePagination

    def get_queryset(self):
        return (
            Rolki.objects.values("Data", "Zmiana", "NrWytl", "UserName")
            .annotate(total_waga=Sum("WagaRolkiProd"), total_dlugosc=Sum("DlugRolkiProd"))
            .order_by("-Data", "UserName")
        )


class WorkersReportAPIView(generics.ListAPIView):
    permission_classes = [CanViewReports]
    serializer_class = WorkersReportSerializer
    pagination_class = ReportPagePagination

    def get_queryset(self):
        params = self.request.query_params
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        shift_value = (params.get("shift") or "").strip()
        operator_value = (params.get("operator") or "").strip()
        search_term = (params.get("q") or "").strip()

        queryset = Rolki.objects.all()

        if date_from:
            queryset = queryset.filter(Data__gte=date_from)
        if date_to:
            queryset = queryset.filter(Data__lte=date_to)
        if shift_value:
            queryset = queryset.filter(Zmiana=shift_value)

        grouped = queryset.values("Data", "Zmiana", "NrWytl", "Rodzaj").annotate(
            total_waga=Sum("WagaRolkiProd"),
            total_dlugosc=Sum("DlugRolkiProd"),
            operators=Coalesce(GroupConcat("UserName", distinct=True, ordering="UserName"), Value("")),
        ).annotate(
            DataText=Cast("Data", output_field=CharField()),
            NrWytlText=Cast("NrWytl", output_field=CharField()),
            RodzajText=Cast("Rodzaj", output_field=CharField()),
        )

        if operator_value:
            grouped = grouped.filter(operators__icontains=operator_value)
        if search_term:
            grouped = grouped.filter(
                Q(DataText__icontains=search_term)
                | Q(Zmiana__icontains=search_term)
                | Q(NrWytlText__icontains=search_term)
                | Q(RodzajText__icontains=search_term)
                | Q(operators__icontains=search_term)
            )

        return grouped.order_by("-Data", "Zmiana", "NrWytl", "Rodzaj")


class OrderStatusReportAPIView(generics.ListAPIView):
    permission_classes = [CanViewReports]
    serializer_class = OrderSerializer
    pagination_class = ReportPagePagination

    def get_queryset(self):
        return Zamowienie.objects.all().order_by("-created_at")
