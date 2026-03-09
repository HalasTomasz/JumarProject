from rest_framework import serializers
from ..models import Rolki

class RolkaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rolki
        fields = "__all__"

class AggregatedRolkaSerializer(serializers.Serializer):
    """
    Serializer for displaying aggregated production data.
    Note: The aggregation (Sum) should be performed in the view's queryset.
    """
    Data = serializers.DateField()
    Zmiana = serializers.CharField()
    NrWytl = serializers.IntegerField()
    Rodzaj = serializers.IntegerField()
    UserName = serializers.CharField()
    total_dlugosc = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_waga = serializers.DecimalField(max_digits=10, decimal_places=2)