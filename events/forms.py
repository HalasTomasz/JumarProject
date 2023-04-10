from django import forms
from .models import Zamowienie, Rolki
from django.contrib.auth.models import Group
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm

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
    class Meta:
        model = User
        fields = ["username", "password1" ,"password2", "group"]