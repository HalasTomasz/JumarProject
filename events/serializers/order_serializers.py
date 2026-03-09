from rest_framework import serializers
from ..models import Zamowienie

class ZamowienieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zamowienie
        fields = "__all__"
