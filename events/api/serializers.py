"""Serializers powering the React front-end API."""

from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import Group, User
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from events.models import Zamowienie, Rolki, UserProfile
from events.services import can_change_order_status
from events.user_roles import ensure_reserved_admin_access
from events.utils import get_user_permissions


EXTRUDER_LABELS = {
    0: "W1",
    1: "W2",
    2: "W3",
    3: "W4",
    4: "W5",
}

FOIL_TYPE_LABELS = {
    value: label for value, label in Zamowienie.FoilTypeChoices.choices
}


def _read_value(obj, key):
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


class UserSerializer(serializers.ModelSerializer):
    """Basic representation of the authenticated user."""

    groups = serializers.SlugRelatedField(
        slug_field='name', read_only=True, many=True
    )
    permissions = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'groups',
            'permissions',
            'phone_number',
        ]

    def get_permissions(self, obj):
        return get_user_permissions(obj)

    def get_phone_number(self, obj):
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'phone_number', '')


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer used for creating new users via the API."""

    group = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password', 'group', 'phone_number']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': False, 'allow_blank': True},
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        user = User(
            username=attrs.get('username', ''),
            first_name=attrs.get('first_name', ''),
            last_name=attrs.get('last_name', ''),
            email=attrs.get('email', ''),
        )
        try:
            validate_password(attrs['password'], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        group_name = validated_data.pop('group', '').strip()
        phone_number = validated_data.pop('phone_number', '')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if phone_number:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.phone_number = phone_number
            profile.save()
        if group_name:
            group, _ = Group.objects.get_or_create(name=group_name)
            user.groups.add(group)
        ensure_reserved_admin_access(user)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer used for updating user's core information."""

    group = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'group', 'phone_number']

    def update(self, instance, validated_data):
        group_name = validated_data.pop('group', None)
        phone_number = validated_data.pop('phone_number', None)

        for field in ['first_name', 'last_name', 'email']:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()

        if group_name is not None:
            instance.groups.clear()
            name = (group_name or '').strip()
            if name:
                group, _ = Group.objects.get_or_create(name=name)
                instance.groups.add(group)

        if phone_number is not None:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            profile.phone_number = phone_number or ''
            profile.save()

        ensure_reserved_admin_access(instance)
        return instance


class OrderSerializer(serializers.ModelSerializer):
    """Main serializer for the Zamowienie model."""

    status_label = serializers.CharField(source='get_Status_display', read_only=True)
    priority_label = serializers.CharField(source='get_Priorytet_display', read_only=True)
    foil_type_label = serializers.CharField(source='get_Rodzaj_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    tasma_label = serializers.SerializerMethodField()
    nrwyt_label = serializers.SerializerMethodField()

    class Meta:
        model = Zamowienie
        fields = [
            'id',
            'NrZp',
            'Data',
            'Kod',
            'Artykul',
            'Status',
            'status_label',
            'Priorytet',
            'priority_label',
            'Rodzaj',
            'foil_type_label',
            'MMK',
            'Barwnik',
            'IloscZlec',
            'SzerWorka',
            'SzerRekawa',
            'Zakladka',
            'DlugWorka',
            'GrubWorka',
            'DlugFoilPlan_Korekta',
            'WagaFoliZlec',
            'DlugFoliPlan',
            'IloscRolekZlec',
            'DlugRolkiZlec_Korekta',
            'DlugRolkiPlan',
            'DlugFoliZlec_Korekta',
            'WagaRolkiZlec',
            'NrWytl',
            'nrwyt_label',
            'Tasma',
            'tasma_label',
            'Uwagi',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ['NrZp', 'created_at', 'updated_at', 'created_by', 'created_by_name']

    def validate(self, attrs):
        if self.instance is None:
            return attrs

        new_status = attrs.get('Status', self.instance.Status)
        if new_status != self.instance.Status and not can_change_order_status(self.instance, new_status):
            raise serializers.ValidationError({'Status': ['Nie można zmienić statusu']})
        protected_fields = ('NrWytl', 'Rodzaj')
        changed_protected_fields = [
            field for field in protected_fields
            if field in attrs and attrs[field] != getattr(self.instance, field)
        ]
        if changed_protected_fields and self.instance.rolls.exists():
            raise serializers.ValidationError(
                {
                    field: ['Nie można zmienić po utworzeniu rolek dla zlecenia.']
                    for field in changed_protected_fields
                }
            )
        return attrs

    def get_tasma_label(self, obj):
        return 'Tak' if obj.Tasma else 'Nie'

    def get_nrwyt_label(self, obj):
        mapping = {0: 'W1', 1: 'W2', 2: 'W3', 3: 'W4', 4: 'W5'}
        if obj.NrWytl in mapping:
            return mapping[obj.NrWytl]
        try:
            return f"W{int(obj.NrWytl) + 1}"
        except (TypeError, ValueError):
            return str(obj.NrWytl)


class RollSerializer(serializers.ModelSerializer):
    """Serializer for production rolls."""

    NrZp = serializers.CharField(source='order_id', read_only=True)

    class Meta:
        model = Rolki
        fields = [
            'id',
            'NrZp',
            'Data',
            'Zmiana',
            'Rolka',
            'NrWytl',
            'Rodzaj',
            'DlugRolkiProd',
            'WagaRolkiProd',
            'Slimak',
            'Walce',
            'Wynikowa',
            'Wynik',
            'Mieszanka',
            'Uwagi',
            'UserName',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['NrZp', 'NrWytl', 'Rodzaj', 'UserName', 'Rolka']


class CalculatorSerializer(serializers.Serializer):
    """Input serializer for the calculator endpoint."""

    Rodzaj = serializers.ChoiceField(choices=Zamowienie.FoilTypeChoices.choices)
    Tasma = serializers.BooleanField(required=False)
    SzerWorka = serializers.IntegerField(min_value=1)
    SzerRekawa = serializers.IntegerField(min_value=1)
    GrubWorka = serializers.IntegerField(min_value=1)
    DlugWorka = serializers.IntegerField(min_value=1)
    IloscZlec = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0.01)


class OperatorReportSerializer(serializers.Serializer):
    """Aggregated production metrics grouped by operator."""

    Data = serializers.DateField()
    Zmiana = serializers.CharField()
    NrWytl = serializers.IntegerField()
    UserName = serializers.CharField()
    total_waga = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_dlugosc = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProductionReportSerializer(serializers.ModelSerializer):
    """Serializer for production report rows (individual rolls)."""

    NrZp = serializers.CharField(source='order_id', read_only=True)

    class Meta:
        model = Rolki
        fields = [
            'NrZp',
            'Data',
            'Zmiana',
            'Rolka',
            'NrWytl',
            'Rodzaj',
            'DlugRolkiProd',
            'WagaRolkiProd',
            'UserName',
        ]


class CompletedProductionReportSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    NrZp = serializers.CharField(source='order_id')
    Data = serializers.DateField()
    Zmiana = serializers.CharField()
    Rolka = serializers.IntegerField()
    NrWytl = serializers.IntegerField()
    nrwyt_label = serializers.SerializerMethodField()
    Rodzaj = serializers.IntegerField()
    foil_type_label = serializers.SerializerMethodField()
    Artykul = serializers.CharField(allow_blank=True)
    SzerWorka = serializers.IntegerField(allow_null=True)
    SzerRekawa = serializers.IntegerField(allow_null=True)
    Zakladka = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    GrubWorka = serializers.IntegerField(allow_null=True)
    DlugRolkiProd = serializers.DecimalField(max_digits=10, decimal_places=2)
    WagaRolkiProd = serializers.DecimalField(max_digits=10, decimal_places=2)
    UserName = serializers.CharField(allow_blank=True)
    Mieszanka = serializers.CharField(allow_blank=True)
    Uwagi = serializers.CharField(allow_blank=True)
    order_uwagi = serializers.CharField(allow_blank=True)
    Wynikowa = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    Wynik = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    Slimak = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    Walce = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)

    def get_nrwyt_label(self, obj):
        value = _read_value(obj, "NrWytl")
        return EXTRUDER_LABELS.get(value, f"W{int(value) + 1}" if value is not None else "—")

    def get_foil_type_label(self, obj):
        value = _read_value(obj, "Rodzaj")
        return FOIL_TYPE_LABELS.get(value, str(value if value is not None else "—"))


class WorkersReportSerializer(serializers.Serializer):
    Data = serializers.DateField()
    Zmiana = serializers.CharField()
    NrWytl = serializers.IntegerField()
    nrwyt_label = serializers.SerializerMethodField()
    Rodzaj = serializers.IntegerField()
    foil_type_label = serializers.SerializerMethodField()
    total_waga = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_dlugosc = serializers.DecimalField(max_digits=12, decimal_places=2)
    operators = serializers.CharField()

    def get_nrwyt_label(self, obj):
        value = _read_value(obj, "NrWytl")
        return EXTRUDER_LABELS.get(value, f"W{int(value) + 1}" if value is not None else "—")

    def get_foil_type_label(self, obj):
        value = _read_value(obj, "Rodzaj")
        return FOIL_TYPE_LABELS.get(value, str(value if value is not None else "—"))
