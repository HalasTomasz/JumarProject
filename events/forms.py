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

    def clean_password1(self):
        password1 = self.cleaned_data.get("password1")
        if password1:
            # Add your custom validation here
            if not any(char in password1 for char in "!@#$%^&*"):
                raise ValidationError(
                    _("The password must contain at least one special symbol (!@#$%^&*)"),
                    code='password_no_special_symbol',
                )
        return password1

    class Meta:
        model = User
        fields = ["username", "password1" ,"password2", "group"]