"""DRF permission classes driven by application roles."""

from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from events.services.permissions import get_user_permissions


class _PermissionFlagMixin(BasePermission):
    permission_flag: str | None = None
    message = "Brak uprawnień do wykonania tej operacji."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or not self.permission_flag:
            return False
        return bool(get_user_permissions(request.user).get(self.permission_flag))


class IsAdminRole(_PermissionFlagMixin):
    permission_flag = "can_manage_users"
    message = "Brak uprawnień administracyjnych do zarządzania użytkownikami."


class CanManageOrders(_PermissionFlagMixin):
    permission_flag = "can_edit_orders"
    message = "Brak uprawnień do zarządzania zleceniami."


class CanManageProduction(_PermissionFlagMixin):
    permission_flag = "can_manage_production"
    message = "Brak uprawnień do pracy w module produkcji."


class CanViewReports(_PermissionFlagMixin):
    permission_flag = "can_view_reports"
    message = "Brak uprawnień do raportów."


class CanUseCalculator(_PermissionFlagMixin):
    permission_flag = "can_use_calculator"
    message = "Brak uprawnień do kalkulatora."


class CanAccessRolls(BasePermission):
    message = "Brak uprawnień do danych rolek."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        permissions = get_user_permissions(request.user)
        if request.method in SAFE_METHODS:
            return bool(permissions.get("can_view_reports") or permissions.get("can_write_rolls"))
        return bool(permissions.get("can_write_rolls"))
