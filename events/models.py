from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField('Telefon', max_length=32, blank=True)

    def __str__(self):
        return f"Profil {self.user.username}"


class DailyOrderCounter(models.Model):
    date_prefix = models.CharField(max_length=8, unique=True)
    last_value = models.PositiveIntegerField(default=1000)

    class Meta:
        verbose_name = 'Licznik zlecen dziennych'
        verbose_name_plural = 'Liczniki zlecen dziennych'

    def __str__(self):
        return f"{self.date_prefix}: {self.last_value}"


class OrderRollCounter(models.Model):
    NrZp = models.CharField('Numer zlecenia', max_length=50, unique=True)
    last_value = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Licznik rolek'
        verbose_name_plural = 'Liczniki rolek'

    def __str__(self):
        return f"{self.NrZp}: {self.last_value}"


class Zamowienie(models.Model):

    class StatusChoices(models.IntegerChoices):
        PLANOWANE = 0, 'Planowane'
        W_REALIZACJI = 1, 'W realizacji'
        ZREALIZOWANE = 2, 'Zrealizowane'
        ANULOWANE = 3, 'Anulowane'

    class PriorityChoices(models.IntegerChoices):
        WYSOKI = 0, 'Wysoki'
        SREDNI = 1, 'Średni'
        NISKI = 2, 'Niski'

    class FoilTypeChoices(models.IntegerChoices):
        HDPE = 0, 'HDPE'
        LDPE = 1, 'LDPE'
        MDPE = 2, 'MDPE'

    NrZp = models.CharField('Numer zlecenia', max_length=50, unique=True)
    Data = models.DateField('Data')
    Kod = models.CharField('Kod', max_length=20, blank=True)
    Artykul = models.CharField('Artykuł', max_length=40)
    MMK = models.CharField('MMK', max_length=20, blank=True)
    Barwnik = models.CharField('Barwnik', max_length=20, blank=True)
    Status = models.IntegerField(
        'Status',
        choices=StatusChoices.choices,
        default=StatusChoices.PLANOWANE,
    )
    Priorytet = models.IntegerField(
        'Priorytet',
        choices=PriorityChoices.choices,
        default=PriorityChoices.SREDNI,
    )
    Rodzaj = models.IntegerField('Rodzaj folii', choices=FoilTypeChoices.choices)

    # Product parameters
    IloscZlec = models.DecimalField(
        'Ilość zlecona', max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))]
    )
    SzerWorka = models.IntegerField('Szerokość worka [mm]', validators=[MinValueValidator(1)])
    SzerRekawa = models.IntegerField('Szerokość rękawa [mm]', validators=[MinValueValidator(1)])
    Zakladka = models.DecimalField('Zakładka [mm]', max_digits=10, decimal_places=2, blank=True, null=True)
    DlugWorka = models.IntegerField('Długość worka [mm]', validators=[MinValueValidator(1)])
    GrubWorka = models.IntegerField('Grubość worka [μm]', validators=[MinValueValidator(1)])
    DlugFoilPlan_Korekta = models.DecimalField(
        'Dług. folii plan (korekta)', max_digits=10, decimal_places=2, blank=True, null=True
    )

    # Calculated fields
    WagaFoliZlec = models.DecimalField('Waga folii', max_digits=10, decimal_places=2, blank=True, null=True)
    DlugFoliPlan = models.DecimalField('Długość folii plan', max_digits=10, decimal_places=2, blank=True, null=True)
    IloscRolekZlec = models.DecimalField('Ilość rolek zlec.', max_digits=10, decimal_places=2, blank=True, null=True)
    DlugRolkiZlec_Korekta = models.DecimalField(
        'Długość rolki zlec. (korekta)', max_digits=10, decimal_places=2, blank=True, null=True
    )
    DlugRolkiPlan = models.DecimalField(
        'Długość rolki plan', max_digits=10, decimal_places=2, blank=True, null=True
    )
    DlugFoliZlec_Korekta = models.DecimalField(
        'Dług. folii zlec. korekta', max_digits=12, decimal_places=2, blank=True, null=True
    )
    WagaRolkiZlec = models.DecimalField(
        'Waga rolki zlec.', max_digits=10, decimal_places=2, blank=True, null=True
    )

    # Production line
    NrWytl = models.IntegerField('Nr wytłaczarki', default=0)
    Tasma = models.BooleanField('Taśma', default=False)

    # Metadata
    Uwagi = models.TextField('Uwagi', max_length=1024, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_orders')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Zamówienie'
        verbose_name_plural = 'Zamówienia'
        indexes = [
            models.Index(fields=['Status', 'Priorytet']),
            models.Index(fields=['NrZp']),
            models.Index(fields=['Status', 'Data'], name='events_order_status_date_idx'),
        ]
    
    def __str__(self):
        return f"{self.NrZp} - {self.get_Status_display()}"
    
    def calculate_parameters(self):
        """
        Delegate calculations to service layer so formulas stay centralized.
        """
        from events.services.calculations import apply_order_calculations

        apply_order_calculations(self)
    
    def save(self, *args, **kwargs):
        # Calculate parameters on every save to ensure data consistency,
        # not just on creation.
        self.calculate_parameters()
        super().save(*args, **kwargs)

class Rolki(models.Model):
    
    SHIFT_CHOICES = [
        ('I', 'Zmiana I'),
        ('II', 'Zmiana II'),
        ('III', 'Zmiana III'),
    ]
    
    order = models.ForeignKey(
        Zamowienie,
        db_column='NrZp',
        to_field='NrZp',
        on_delete=models.PROTECT,
        related_name='rolls',
        verbose_name='Zlecenie',
    )
    Data = models.DateField('Data produkcji')
    Zmiana = models.CharField('Zmiana', max_length=3, choices=SHIFT_CHOICES)
    Rolka = models.IntegerField('Numer rolki')
    NrWytl = models.IntegerField('Nr wytłaczarki')
    Rodzaj = models.IntegerField('Rodzaj folii')
    
    # Production data
    DlugRolkiProd = models.DecimalField('Długość rolki', max_digits=10, decimal_places=2)
    WagaRolkiProd = models.DecimalField('Waga rolki', max_digits=10, decimal_places=2)
    
    # Machine parameters
    Slimak = models.DecimalField('Ślimak', max_digits=6, decimal_places=2, blank=True, null=True)
    Walce = models.DecimalField('Walce', max_digits=6, decimal_places=2, blank=True, null=True)
    Wynikowa = models.DecimalField('Wynikowa', max_digits=6, decimal_places=2, blank=True, null=True)
    Wynik = models.DecimalField('Wynik', max_digits=6, decimal_places=2, blank=True, null=True)
    
    # Additional info
    Mieszanka = models.CharField('Mieszanka', max_length=100, blank=True)
    Uwagi = models.TextField('Uwagi', blank=True)
    UserName = models.CharField('Operator', max_length=150)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-Data', '-Zmiana', 'Rolka']
        verbose_name = 'Rolka'
        verbose_name_plural = 'Rolki'
        unique_together = [['order', 'Rolka']]
        indexes = [
            models.Index(fields=['order', 'Data']),
            models.Index(fields=['UserName', 'Data']),
            models.Index(fields=['Data', 'NrWytl', 'order', 'Rolka'], name='events_rolls_completed_idx'),
            models.Index(fields=['Data', 'Zmiana', 'NrWytl', 'Rodzaj'], name='events_rolls_workers_idx'),
        ]
    
    def __str__(self):
        return f"{self.order_id} - Rolka {self.Rolka}"


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    from events.user_roles import ensure_reserved_admin_access

    if created:
        UserProfile.objects.create(user=instance)
    else:
        UserProfile.objects.get_or_create(user=instance)
    ensure_reserved_admin_access(instance)
