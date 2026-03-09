"""Serializers powering the React front-end API."""

from django.contrib.auth.models import Group, User
from rest_framework import serializers

from events.models import Zamowienie, Rolki
from events.utils import get_user_permissions


class UserSerializer(serializers.ModelSerializer):
    """Basic representation of the authenticated user."""

    groups = serializers.SlugRelatedField(
        slug_field='name', read_only=True, many=True
    )
    permissions = serializers.SerializerMethodField()

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
        ]

    def get_permissions(self, obj):
        return get_user_permissions(obj)


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer used for creating new users via the API."""

    group = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password', 'group']
        extra_kwargs = {
            'password': {'write_only': True, 'min_length': 6},
            'email': {'required': False, 'allow_blank': True},
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        group_name = validated_data.pop('group', '').strip()
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if group_name:
            group = Group.objects.filter(name=group_name).first()
            if group:
                user.groups.add(group)
        return user


class OrderSerializer(serializers.ModelSerializer):
    """Main serializer for the Zamowienie model."""

    status_label = serializers.CharField(source='get_Status_display', read_only=True)
    priority_label = serializers.CharField(source='get_Priorytet_display', read_only=True)
    foil_type_label = serializers.CharField(source='get_Rodzaj_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Zamowienie
        fields = [
            'id',
            'NrZp',
            'Data',
            'Status',
            'status_label',
            'Priorytet',
            'priority_label',
            'Rodzaj',
            'foil_type_label',
            'IloscZlec',
            'SzerWorka',
            'SzerRekawa',
            'DlugWorka',
            'GrubWorka',
            'WagaFoliZlec',
            'DlugFoliPlan',
            'NrWytl',
            'Tasma',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ['NrZp', 'created_at', 'updated_at', 'created_by', 'created_by_name']


class RollSerializer(serializers.ModelSerializer):
    """Serializer for production rolls."""

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
        read_only_fields = ['NrZp', 'UserName', 'Rolka']


class CalculatorSerializer(serializers.Serializer):
    """Input serializer for the calculator endpoint."""

    Rodzaj = serializers.ChoiceField(choices=Zamowienie.FoilType.choices)
    Tasma = serializers.BooleanField(required=False)
    SzerWorka = serializers.IntegerField(min_value=1)
    SzerRekawa = serializers.IntegerField(min_value=1)
    GrubWorka = serializers.IntegerField(min_value=1)
    DolneOdch = serializers.IntegerField(min_value=1)
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
