from django import forms
from .models import Zamowienie, Rolki
from django.contrib.auth.models import Group
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError


class AddForm(forms.ModelForm):
    class Meta:
        model = Zamowienie
        fields = "__all__"

class AddRolkiForm(forms.ModelForm):
    class Meta:
        model = Rolki
        fields = "__all__"

class AddUser(UserCreationForm):
    group = forms.ModelChoiceField(queryset=Group.objects.all(), empty_label="Select Group")

    def is_valid(self):
        valid = super().is_valid()
        if not valid:
            return valid

        password = self.cleaned_data.get('password1')
        if not any(char in password for char in "!@#$%^&*()+"):
            self.add_error('password1', "Brak znaku specjalnego")
            valid = False

        return valid

    class Meta:
        model = User
        fields = ["username", "password1" ,"password2", "group"]