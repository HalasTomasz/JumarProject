from django.db import models
from django.db.models.signals import post_save
from django.contrib.auth.models import User, Group
from django.db.models.signals import post_save
from django.contrib.auth.models import User, Group
from django.dispatch import receiver

class Zamowienie(models.Model):

    NrZp = models.CharField("NrZp", max_length=20)
    Data = models.DateField()
    Artykul = models.CharField(max_length=30)
    NrWyt = models.IntegerField()
    Status = models.IntegerField()
    Rodzaj = models.IntegerField()
    Priorytet = models.IntegerField()
    Tasma = models.IntegerField()
    Uwagi = models.CharField(max_length=40, blank=True, null=True , default='')
    IloscZlec = models.IntegerField()
    SzerWorka = models.IntegerField()
    SzerRekawa = models.IntegerField()
    Zakladka = models.FloatField()
    DlugWorka = models.IntegerField()
    GrubWorka = models.IntegerField()
    DolneOdch = models.IntegerField()
    DlugFoilPlan_Korekta = models.FloatField()
    WagaFoliZlec = models.FloatField()
    DlugFoliPlan = models.FloatField()
    IloscRolekZlec = models.FloatField()
    DlugRolkiZlec_Korekta = models.FloatField()
    DlugRolkiPlan = models.FloatField()
    DlugFoliZlec_Korekta = models.FloatField()
    WagaRolkiZlec = models.FloatField()

    def get_absolute_url(self):
        return reversed("home")

#DODAJ OPERATORA
class Rolki(models.Model):

    NrZp = models.CharField("NrZp", max_length=20)
    Data = models.DateField()
    Zmiana = models.CharField(max_length=10)
    Rolka = models.IntegerField()
    NrWytl = models.IntegerField()
    Rodzaj = models.IntegerField()
    DlugRolkiProd = models.FloatField()
    WagaRolkiProd = models.FloatField()
    Walce = models.CharField(max_length=20, blank=True, null=True, default='' )
    Slimak = models.CharField(max_length=20, blank=True, null=True, default='' )
    Wynikowa = models.FloatField()
    Wynik = models.FloatField()
    Mieszanka = models.CharField(max_length=40, blank=True, null=True, default='')
    Uwagi = models.CharField(max_length=40, blank=True, null=True, default='')
    UserName = models.CharField(max_length=40)

# @receiver(post_save, sender=User)
# def assign_admin_group(sender, instance, created, **kwargs):
#     if created and instance.is_superuser:
#         admin_group = Group.objects.get(name='admin')
#         instance.groups.add(admin_group)
#
#
# post_save.connect(assign_admin_group, sender=User)