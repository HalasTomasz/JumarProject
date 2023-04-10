from django.db.models import Sum

from .models import Zamowienie, Rolki
from rest_framework import serializers


class ZamSerializer(serializers.ModelSerializer):

    class Meta:
        model = Zamowienie
        fields = "__all__"

class RolSerializer(serializers.ModelSerializer):

    class Meta:
        model = Rolki
        fields = "__all__"

class RolkiSumSerializer(serializers.ModelSerializer):
    datas = serializers.DateField(source='Data')
    zmiana = serializers.CharField(source='Zmiana')
    nr_wytl = serializers.IntegerField(source='NrWytl')
    rodzaj = serializers.IntegerField(source='Rodzaj')
    operator = serializers.CharField(source='UserName')
    dlug_rolki_prod_sum = serializers.SerializerMethodField()
    waga_rolki_prod_sum = serializers.SerializerMethodField()

    class Meta:
        model = Rolki
        fields = ('datas', 'zmiana', 'nr_wytl', 'rodzaj', 'dlug_rolki_prod_sum', 'waga_rolki_prod_sum', 'operator')

    def get_dlug_rolki_prod_sum(self, obj):
        queryset = Rolki.objects.filter(Data=obj.Data, Zmiana=obj.Zmiana, NrWytl=obj.NrWytl, Rodzaj=obj.Rodzaj)
        return queryset.aggregate(Sum('DlugRolkiProd'))['DlugRolkiProd__sum']

    def get_waga_rolki_prod_sum(self, obj):
        queryset = Rolki.objects.filter(Data=obj.Data, Zmiana=obj.Zmiana, NrWytl=obj.NrWytl, Rodzaj=obj.Rodzaj)
        return queryset.aggregate(Sum('WagaRolkiProd'))['WagaRolkiProd__sum']