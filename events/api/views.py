"""REST views powering the React front-end."""

from datetime import date

from django.contrib.auth.models import User
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from events.models import Rolki, Zamowienie
from events.utils import (
    calculate_foil_parameters,
    calculate_production_stats,
    format_number,
    get_user_permissions,
)
from .serializers import (
    CalculatorSerializer,
    OperatorReportSerializer,
    OrderSerializer,
    ProductionReportSerializer,
    RollSerializer,
    UserSerializer,
)


class LoginView(APIView):
    """Token-based login endpoint."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AuthTokenSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = getattr(request.user, 'auth_token', None)
        if token:
            token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


STATUS_PLANNED = 0
STATUS_IN_PROGRESS = 1


class OrderViewSet(viewsets.ModelViewSet):
    """CRUD operations for orders."""

    serializer_class = OrderSerializer
    queryset = Zamowienie.objects.select_related('created_by').all()

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        search_term = self.request.query_params.get('q')
        if status_filter not in (None, ''):
            queryset = queryset.filter(Status=status_filter)
        if search_term:
            queryset = queryset.filter(NrZp__icontains=search_term)
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        last_order = Zamowienie.objects.order_by('-id').first()
        order_id = (last_order.id + 1) if last_order else 1
        nr_zp = f"{date.today()}/{order_id}"
        serializer.save(NrZp=nr_zp, created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def copy(self, request, pk=None):
        """Duplicate an existing order."""

        order = self.get_object()
        data = OrderSerializer(order).data
        data.pop('id', None)
        data.pop('NrZp', None)
        serializer = OrderSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        last_order = Zamowienie.objects.order_by('-id').first()
        order_id = (last_order.id + 1) if last_order else 1
        nr_zp = f"{date.today()}/{order_id}"
        serializer.save(NrZp=nr_zp, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='status')
    def update_status(self, request, pk=None):
        order = self.get_object()
        status_value = request.data.get('status')
        if status_value is None:
            return Response({'detail': 'Missing status value'}, status=status.HTTP_400_BAD_REQUEST)
        status_value = int(status_value)
        if (
            status_value == STATUS_PLANNED
            and Rolki.objects.filter(NrZp=order.NrZp).exists()
        ):
            return Response({'detail': 'Nie można zmienić statusu'}, status=status.HTTP_400_BAD_REQUEST)
        order.Status = status_value
        order.save()
        return Response(self.get_serializer(order).data)


class OrderMetadataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        status_choices = Zamowienie._meta.get_field('Status').choices
        priority_choices = Zamowienie._meta.get_field('Priorytet').choices
        foil_choices = Zamowienie._meta.get_field('Rodzaj').choices
        return Response({
            'status': [{'value': value, 'label': label} for value, label in status_choices],
            'priority': [{'value': value, 'label': label} for value, label in priority_choices],
            'foil_types': [{'value': value, 'label': label} for value, label in foil_choices],
        })


class OrderRollListCreateView(generics.ListCreateAPIView):
    serializer_class = RollSerializer
    pagination_class = None

    def get_queryset(self):
        return Rolki.objects.filter(NrZp=self.kwargs['nrzp']).order_by('-Data', '-Zmiana', 'Rolka')

    def perform_create(self, serializer):
        serializer.save(NrZp=self.kwargs['nrzp'], UserName=self.request.user.username)


class OrderRollDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = RollSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return Rolki.objects.filter(NrZp=self.kwargs['nrzp'])


class ProductionSummaryView(APIView):
    def get(self, request, nrzp):
        stats = calculate_production_stats(nrzp)
        return Response(stats)


class ProductionOrdersView(generics.ListAPIView):
    serializer_class = OrderSerializer
    pagination_class = None

    def get_queryset(self):
        return Zamowienie.objects.filter(Status=STATUS_IN_PROGRESS)


class CalculatorApiView(APIView):
    def post(self, request):
        serializer = CalculatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = calculate_foil_parameters(serializer.validated_data)
        return Response(result)


class HomeSummaryView(APIView):
    def get(self, request):
        total_orders = Zamowienie.objects.count()
        status_counts = (
            Zamowienie.objects.values('Status')
            .annotate(total=Count('Status'))
            .order_by('Status')
        )
        status_map = dict(Zamowienie._meta.get_field('Status').choices)
        formatted_counts = {
            status_map.get(status_obj['Status'], str(status_obj['Status'])): status_obj['total']
            for status_obj in status_counts
        }

        return Response(
            {
                'user': UserSerializer(request.user).data,
                'stats': {
                    'total_orders': total_orders,
                    'by_status': formatted_counts,
                },
            }
        )


class ProductionReportAPIView(generics.ListAPIView):
    serializer_class = ProductionReportSerializer

    def get_queryset(self):
        return Rolki.objects.select_related(None).order_by('-Data')


class OperatorReportAPIView(APIView):
    def get(self, request):
        queryset = (
            Rolki.objects.values('Data', 'Zmiana', 'NrWytl', 'UserName')
            .annotate(total_waga=Sum('WagaRolkiProd'), total_dlugosc=Sum('DlugRolkiProd'))
            .order_by('-Data', 'UserName')
        )
        serializer = OperatorReportSerializer(queryset, many=True)
        return Response(serializer.data)


class OrderStatusReportAPIView(generics.ListAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Zamowienie.objects.all().order_by('-created_at')
