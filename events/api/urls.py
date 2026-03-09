"""URL routing for the events REST API."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views


router = DefaultRouter()
router.register('orders', views.OrderViewSet, basename='orders')

app_name = "events_api"


urlpatterns = [
    # Auth
    path('auth/login/', views.LoginView.as_view(), name='api-login'),
    path('auth/logout/', views.LogoutView.as_view(), name='api-logout'),
    path('auth/me/', views.CurrentUserView.as_view(), name='api-me'),
    path('users/', views.UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', views.UserDetailUpdateView.as_view(), name='user-detail-update'),
    path('users/groups/', views.UserGroupListView.as_view(), name='user-groups'),

    # Metadata & dashboards
    path('meta/orders/', views.OrderMetadataView.as_view(), name='order-metadata'),
    path('home/summary/', views.HomeSummaryView.as_view(), name='home-summary'),
    path('orders/legacy/', views.LegacyOrderListView.as_view(), name='orders-legacy'),
    path('orders/progress/', views.OrderProgressBatchView.as_view(), name='orders-progress'),

    # Production / rolls
    path('production/orders/', views.ProductionOrdersView.as_view(), name='production-orders'),
    path('production/orders/<path:nrzp>/summary/', views.ProductionSummaryView.as_view(), name='production-summary'),
    path('production/orders/<path:nrzp>/rolls/', views.OrderRollListCreateView.as_view(), name='production-rolls'),
    path('production/orders/<path:nrzp>/rolls/<int:pk>/', views.OrderRollDetailView.as_view(), name='production-roll-detail'),

    # Calculator
    path('calculator/', views.CalculatorApiView.as_view(), name='calculator'),

    # Reports
    path('reports/completed-production/', views.CompletedProductionReportAPIView.as_view(), name='report-completed-production'),
    path('reports/production/', views.ProductionReportAPIView.as_view(), name='report-production'),
    path('reports/operator/', views.OperatorReportAPIView.as_view(), name='report-operator'),
    path('reports/order-status/', views.OrderStatusReportAPIView.as_view(), name='report-order-status'),
    path('reports/workers/', views.WorkersReportAPIView.as_view(), name='report-workers'),

    # Router-backed endpoints
    path('', include(router.urls)),
]
