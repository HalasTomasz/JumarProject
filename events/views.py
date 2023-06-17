from urllib.parse import urlencode, unquote

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.models import User
from django.db.models import Sum, Count, Max
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.views.generic import ListView, CreateView, UpdateView
import numpy as np
import re
from rest_framework.generics import ListAPIView

from .models import Zamowienie, Rolki
from .serializer import ZamSerializer, RolSerializer, RolkiSumSerializer
from django.urls import reverse_lazy, reverse
from datetime import date, datetime
from .forms import AddForm, AddRolkiForm, AddUser
from django.http import JsonResponse, HttpResponse
from django.template.defaulttags import register
from .decorators import unathenticted_user,allowed_user
from django.contrib.auth import authenticate,login,logout, get_user
from django import template


status_dict = {
    0:"Planowane",
    1:"W realizacji",
    2:"Zrealizowane" ,
    3:"Anulowane",
}

nrwyt_dict = {
 0:"W1",
 1:"W2",
 2:"W3",
}

folia_dict = {
 0:"HDPE",
 1:"LDPE",
 2:"MDPE",
}

@register.filter
def readable_integer(value):
    readable = str(value).split(".")[0][::-1]
    readable = [readable[i:i+3][::-1] for i in range(0, len(readable), 3)]
    if len(str(value).split(".")) == 1:
        end = ""
    else:
        end = "." + str(value).split(".")[1]
    return " ".join(readable[::-1]) + end

def read_int(value):
    readable = str(value).split(".")[0][::-1]
    readable = [readable[i:i+3][::-1] for i in range(0, len(readable), 3)]
    if len(str(value).split(".")) == 1:
        end = ""
    else:
        end = "." + str(value).split(".")[1]
    return " ".join(readable[::-1]) + end

@register.filter
def get_item(dictionary, key):
  return dictionary.get(key)

@register.simple_tag
def divide(a, b):
    if b == 0:
        return 0
    if isinstance(a, str):
        a = re.sub(r'\s', '', a)
    if isinstance(b, str):
        b = re.sub(r'\s', '', b)

    tmp = float(a) / float(b) * 100
    return round(tmp, 2)


@login_required(login_url='/login')
@allowed_user(allowed_groups=['admin'])
def register(request):
    form = AddUser()
    if request.method == "POST":
        form = AddUser(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password1'])
            user.save()

            group = form.cleaned_data['group']
            group.user_set.add(user)

            return redirect("Pracownicy.views.index")
        else:
            messages.error(request, "Bledne dane")
    context = {"form": form}
    return render(request, "register.html", context)

@unathenticted_user
def loginFunc(request):

    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username = username, password = password)

        if user is not None:
            login(request,user)
            return redirect('Home.views.index')
        else:
            messages.info(request, "Błedne dane")

    context= {}
    return render(request, "login.html", context)

@login_required(login_url='/login')
def logoutUser(request):
    logout(request)
    return redirect("Login.views.index")

@login_required(login_url='/login')
@allowed_user(allowed_groups=['admin','kierownik', 'pracownik'])
def home(request):
        user = get_user(request)
        group = str(list(user.groups.all())[0])
        user_kierownik = False
        admin = False
        if group == 'kierownik':
            user_kierownik = True
            admin = False
        if group == 'admin':
            user_kierownik = True
            admin = True
        return render(request, 'home.html', {
        "name" : user.username,
        "user_kierownik" : user_kierownik,
        "admin" : admin
    })

@login_required(login_url='/login')
@allowed_user(allowed_groups=['admin', 'kierownik'])
def addProduct(request):

    if request.method == 'POST':
        nr_zp_id = Zamowienie.objects.all().values_list('id', flat=True).order_by('-id').first()
        if nr_zp_id == None:
            nr_zp_id = 0
        nr_zp = str(date.today()) + "/" + str(nr_zp_id)
        tempdict = request.POST.copy()
        tempdict['NrZp'] = nr_zp
        request.POST = tempdict

        numeric_fields = ['IloscZlec', 'SzerWorka', 'SzerRekawa', 'Zakladka', "DlugWorka", "GrubWorka", "DolneOdch", "DlugFoilPlan_Korekta", "WagaFoliZlec", "DlugFoliPlan", "IloscRolekZlec", "DlugRolkiZlec_Korekta", "DlugRolkiPlan", "DlugFoliZlec_Korekta","WagaRolkiZlec"]
        for field in numeric_fields:
            value = request.POST.get(field, '')
            # value = re.sub(r'[^\d.]', '', value)
            value = re.sub(r'\s', '', value)
            request.POST[field] = value

        form = AddForm(request.POST)
        if form.is_valid():
            form.save()
            if 'redirect_another' in request.POST:
                return redirect('Form.views.index')
            else:
                return redirect('PlanProc.views.index')
        else:
            invalid_fields = form.errors.keys()
            error_message = 'Dane w tych polach niepoprawne: ' + ', '.join(invalid_fields)
            messages.error(request, error_message)
    else:
        form = AddForm()
    context = {'form': form}
    return render(request, 'Doc1/form.html', context)


class ProductionOrdersPlanningView(LoginRequiredMixin,UserPassesTestMixin, ListView):
    model = Zamowienie
    template_name = "Doc1/procPlanTable.html"
    queryset = Zamowienie.objects.filter(Status=0)

    def test_func(self):
        if self.request.user.groups.filter(name='admin').exists() or self.request.user.groups.filter(
                name='kierownik').exists():
            return True
        else:
            return False

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serializer = ZamSerializer(context['object_list'], many=True)
        context['serialized_data'] = serializer.data
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        return context


class copyForm(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Zamowienie
    serializer_class = ZamSerializer
    form_class = AddForm
    template_name = "Doc1/copyForm.html"
    success_url = reverse_lazy('PlanProc.views.index')

    def test_func(self):
        if self.request.user.groups.filter(name='admin').exists() or self.request.user.groups.filter(name='kierownik').exists():
            return True
        else:
            return False

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        model = Zamowienie.objects.get(pk=self.kwargs['pk'])
        serializer = self.serializer_class(model)
        context['data'] = serializer.data
        return context

    def post(self, request, *args, **kwargs):
        # Create a mutable copy of request.POST
        mutable_post = request.POST.copy()

        # Modify the mutable_post data before form validation
        numeric_fields = ['IloscZlec', 'SzerWorka', 'SzerRekawa', 'Zakladka', "DlugWorka", "GrubWorka", "DolneOdch",
                          "DlugFoilPlan_Korekta", "WagaFoliZlec", "DlugFoliPlan", "IloscRolekZlec",
                          "DlugRolkiZlec_Korekta", "DlugRolkiPlan", "DlugFoliZlec_Korekta", "WagaRolkiZlec"]

        for field in numeric_fields:
            value = mutable_post.get(field, '')
            value = re.sub(r'\s', '', value)
            mutable_post[field] = value

        # Replace request.POST with the modified mutable_post
        request.POST = mutable_post
        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        # Modify the data before it is saved
        nr_zp_id = Zamowienie.objects.all().values_list('id', flat=True).order_by('-id').first()
        nr_zp = str(date.today()) + "/" + str(nr_zp_id)
        form.instance.pk = None
        form.instance.NrZp = nr_zp

        return super().form_valid(form)

    def form_invalid(self, form):
        invalid_fields = form.errors.keys()
        error_message = 'Dane w tych polach niepoprawne: ' + ', '.join(invalid_fields)
        messages.error(self.request, error_message)

        context = self.get_context_data(form=form)
        form_data = form.cleaned_data  # Get the cleaned form data
        # form_data['Data] = form_data['Data'].strftime('%Y-%m-%d'')
        data_value = form_data['Data'].strftime('%Y-%m-%d')

        form_data['Data'] = data_value
        context['form'] = form_data

        return self.render_to_response(context)


class updateForm(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Zamowienie
    serializer_class = ZamSerializer
    form_class = AddForm
    template_name = "Doc1/editForm.html"
    success_url = reverse_lazy('PlanProc.views.index')

    def test_func(self):
        if self.request.user.groups.filter(name='admin').exists() or self.request.user.groups.filter(name='kierownik').exists():
            return True
        else:
            return False

    def get_object(self, queryset=None):
        obj = super().get_object(queryset=queryset)
        return obj

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serializer = self.serializer_class(instance=self.object)
        context['data'] = serializer.data
        return context

    def post(self, request, *args, **kwargs):
        # Create a mutable copy of request.POST
        mutable_post = request.POST.copy()

        # Modify the mutable_post data before form validation
        numeric_fields = ['IloscZlec', 'SzerWorka', 'SzerRekawa', 'Zakladka', "DlugWorka", "GrubWorka", "DolneOdch",
                          "DlugFoilPlan_Korekta", "WagaFoliZlec", "DlugFoliPlan", "IloscRolekZlec",
                          "DlugRolkiZlec_Korekta", "DlugRolkiPlan", "DlugFoliZlec_Korekta", "WagaRolkiZlec"]
        for field in numeric_fields:
            value = mutable_post.get(field, '')
            value = re.sub(r'\s', '', value)
            mutable_post[field] = value

        # Replace request.POST with the modified mutable_post
        request.POST = mutable_post

        return super().post(request, *args, **kwargs)

    def form_invalid(self, form):

        invalid_fields = form.errors.keys()
        error_message = 'Dane w tych polach niepoprawne: ' + ', '.join(invalid_fields)
        messages.error(self.request, error_message)
        context = self.get_context_data(form=form)
        form_data = form.cleaned_data  # Get the cleaned form data
        #form_data['Data] = form_data['Data'].strftime('%Y-%m-%d'')
        data_value = form_data['Data'].strftime('%Y-%m-%d')
        form_data['Data'] = data_value
        context['data'] = form_data

        return self.render_to_response(context)

class foliaPlanning(LoginRequiredMixin, ListView):
    model = Zamowienie
    template_name = "Doc2/procFolia.html"
    queryset = Zamowienie.objects.filter(Status=1)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serializer = ZamSerializer(context['object_list'], many=True)
        # for data_dict in serializer.data:
        #     print()
        #     data_dict['NrWytl'] = nrwyt_dict[data_dict['NrWytl']]
        if self.request.GET.get('selected_id'):
            context['selected_id'] = unquote(self.request.GET.get('selected_id'))
        context['serialized_data'] = serializer.data
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        return context

class foliaForm(LoginRequiredMixin, CreateView):

    model = Rolki
    template_name = "Doc2/foliaForm.html"
    form_class = AddRolkiForm
    serializer_class = RolSerializer

    def get_success_url(self):
        selected_id = self.kwargs['date'] + "/" + str(self.kwargs['pk'])
        params = {'selected_id': selected_id}
        url = reverse('PlanFolia.views.index') + '?' + urlencode(params)
        return url

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        NrZp = self.kwargs['date'] + "/"+str(self.kwargs['pk'])
        model = Zamowienie.objects.get(NrZp=NrZp)
        serializer = ZamSerializer(model, many=False)
        user = get_user(request=self.request)
        context['data'] = serializer.data
        context['user'] = user.username

        max_rolka = Rolki.objects.filter(NrZp=NrZp).aggregate(Max('Rolka'))['Rolka__max']

        if max_rolka is None:
            max_rolka = 1
        else:
            max_rolka += 1

        context['rolka'] = max_rolka
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict

        return context

    def post(self, request, *args, **kwargs):
        # Create a mutable copy of request.POST
        mutable_post = request.POST.copy()

        # Modify the mutable_post data before form validation
        numeric_fields = ['DlugRolkiProd', 'WagaRolkiProd', 'Slimak', 'Walce', "Wynikowa", "Wynik"
                         ]
        for field in numeric_fields:
            value = mutable_post.get(field, '')
            value = re.sub(r'\s', '', value)


            mutable_post[field] = value

        # Replace request.POST with the modified mutable_post
        request.POST = mutable_post
        print(mutable_post)
        return super().post(request, *args, **kwargs)

    def form_invalid(self, form):

        invalid_fields = form.errors.keys()
        error_message = 'Dane w tych polach niepoprawne: ' + ', '.join(invalid_fields)
        messages.error(self.request, error_message)
        context = self.get_context_data(form=form)
        form_data = form.cleaned_data  # Get the cleaned form data
        # form_data['Data] = form_data['Data'].strftime('%Y-%m-%d'')
        if 'Data' in form_data:
            data_value = form_data['Data'].strftime('%Y-%m-%d')
            form_data['Data'] = data_value

        context['update_form'] = form_data

        return self.render_to_response(context)

class upateRolForm(LoginRequiredMixin, UpdateView):
    model = Rolki
    form_class = AddRolkiForm
    template_name = "Doc2/editForm.html"


    def get_success_url(self):
        selected_id = self.kwargs['date'] + "/" + str(self.kwargs['pk'])
        params = {'selected_id': selected_id}
        url = reverse('PlanFolia.views.index') + '?' + urlencode(params)
        return url


    def get_object(self, queryset=None):
        # Get the object with NrZp="AAA" and Rolka="aa"
        date = self.kwargs.get('date')
        pk = self.kwargs.get('pk')
        rolka = self.kwargs.get('rolka')
        nrzp = str(date) + "/" + str(pk)
        obj = Rolki.objects.get(NrZp=nrzp, Rolka=rolka)

        return obj

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serializer = RolSerializer(context['object'], many=False)
        context['rols'] = serializer.data
        date = self.kwargs.get('date')
        pk = self.kwargs.get('pk')
        nrzp = str(date) + "/" + str(pk)
        data = Zamowienie.objects.get(NrZp=nrzp)
        dataSem = ZamSerializer(data)
        context['data'] = dataSem.data
        context['folia_dict'] = folia_dict
        return context

    def post(self, request, *args, **kwargs):
        # Create a mutable copy of request.POST
        mutable_post = request.POST.copy()

        # Modify the mutable_post data before form validation
        numeric_fields = ['DlugRolkiProd', 'WagaRolkiProd', 'Slimak', 'Walce', 'Wynikowa', "Wynik"
                         ]
        for field in numeric_fields:
            value = mutable_post.get(field, '')
            value = re.sub(r'\s', '', value)
            mutable_post[field] = value


        # Replace request.POST with the modified mutable_post
        request.POST = mutable_post

        return super().post(request, *args, **kwargs)

    def form_invalid(self, form):
        invalid_fields = form.errors.keys()
        error_message = 'Dane w tych polach niepoprawne: ' + ', '.join(invalid_fields)
        messages.error(self.request, error_message)
        context = self.get_context_data(form=form)
        form_data = form.cleaned_data  # Get the cleaned form data
        # form_data['Data] = form_data['Data'].strftime('%Y-%m-%d'')
        data_value = form_data['Data'].strftime('%Y-%m-%d')
        form_data['Data'] = data_value
        context['rols'] = form_data



        return self.render_to_response(context)

@login_required(login_url='/login')
def get_data(request, date, pk):
    NrZp = date +'/'+str(pk)
    data = Rolki.objects.filter(NrZp=NrZp)
    data_list = []

    for item in data:

        data_list.append({'id': item.NrZp, 'data': item.Data,
                          'zmiana': item.Zmiana,
                          "rolka": item.Rolka,
                          "nrwytl": nrwyt_dict[item.NrWytl],
                          "operator": item.UserName,
                          "dlugrolkiprod": item.DlugRolkiProd,
                          "wagarolkiprod": item.WagaRolkiProd,
                            "walce" : item.Walce,
                           "slimak" : item.Slimak,
                            "wynikowa": item.Wynikowa,
                           "wynik" : item.Wynik,
                            "mieszanka": item.Mieszanka,
                            "uwagi": item.Uwagi,

                          })
    return JsonResponse({'dane': data_list})

@login_required(login_url='/login')
def get_dataCal(request, date, pk):

    NrZp = date +'/'+str(pk)
    dataRol = Rolki.objects.filter(NrZp=NrZp)
    dataOrder = Zamowienie.objects.get(NrZp=NrZp)

    if not dataRol:
        return JsonResponse({'calc': [0,0,0,0,0,0]})

    waga_sum = float(np.round(dataRol.aggregate(Sum('WagaRolkiProd'))['WagaRolkiProd__sum'],2))
    waga_end = float(np.round(dataOrder.WagaFoliZlec - waga_sum,2))
    dlugProd = float(np.round(dataRol.aggregate(Sum('DlugRolkiProd'))['DlugRolkiProd__sum'],2))
    dlugEnd = float(np.round(dataOrder.IloscRolekZlec * dataOrder.DlugRolkiZlec_Korekta - dlugProd,2))
    sumRol = float(np.round(dataRol.aggregate(Count('Rolka'))['Rolka__count'],2))
    finishRol = float(np.round(dataOrder.IloscRolekZlec - sumRol,2))

    return JsonResponse({'calc': [read_int(waga_sum), read_int(waga_end), read_int(dlugProd), read_int(dlugEnd) ,
                                  read_int(sumRol), read_int(finishRol)]})

@csrf_exempt
def update_status(request):
    if request.method == 'POST':
        id = request.POST.get('id')
        status = request.POST.get('status')
        zamowienie = get_object_or_404(Zamowienie, NrZp=id)
        zamowienie.Status = status
        zamowienie.save()
        return HttpResponse(status=200)


### EMP SECTION
@login_required(login_url='/login')
@allowed_user(allowed_groups=['admin'])
def employer_list(request):
    employers = User.objects.all()
    context = {'employers': employers}
    return render(request, 'WrokersView/employer_list.html', context)

@login_required(login_url='/login')
@allowed_user(allowed_groups=['admin'])
@require_POST
def delete_user(request, name):
    user = get_object_or_404(User, username=name)
    user.delete()
    return redirect('Home.views.index')


class UserUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = User
    form_class = AddUser
    template_name = 'WrokersView/EditWorker.html'
    success_url = reverse_lazy('Pracownicy.views.index')

    def test_func(self):
        if self.request.user.groups.filter(name='admin').exists():
            return True
        else:
            return False

    def get_object(self, queryset=None):
        # Get the user object based on the username from the URL
        username = self.kwargs['name']
        return User.objects.get(username=username)

    def form_valid(self, form):
        # Save the group field value
        group = form.cleaned_data['group']
        self.object.groups.clear()
        self.object.groups.add(group)

        return super().form_valid(form)


#### DATA VALIDATION SECTOR
class procFolia(LoginRequiredMixin, ListView ):

    model = Rolki
    template_name = "Doc346/ZlecWytl.html"
    serializer_class = RolSerializer

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        model = Zamowienie.objects.filter(Status__gt=0)
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        mapper = {}
        for id, data in enumerate(model.values()):
            print(id,data)
            mapper[data["NrZp"]] = data

        for rolki in context['rolki_list']:
                rolki.zamowienie = mapper[str(rolki.NrZp)]


        return context

class procPrac(LoginRequiredMixin, ListView):
    model = Rolki
    template_name = "Doc346/ProdPrac.html"
    serializer_class = RolkiSumSerializer
    queryset = Rolki.objects.filter()


    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        queary = Rolki.objects.values('Data', 'Zmiana', 'NrWytl', 'Rodzaj' ,'UserName').annotate(
            Sum('DlugRolkiProd'), Sum('WagaRolkiProd')
        )

        context['serialized_data'] = queary

        return context

class procReal(LoginRequiredMixin,UserPassesTestMixin, ListView):
    model = Zamowienie
    template_name = "Doc346/procZrel.html"
    serializer_class = ZamSerializer
    queryset = Zamowienie.objects.filter(Status__gt=1)


    def test_func(self):
        if self.request.user.groups.filter(name='admin').exists() or self.request.user.groups.filter(
                name='kierownik').exists():
            return True
        else:
            return False

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        serialized_data = self.serializer_class(context['object_list'], many=True)
        for data in serialized_data.data:
            data["Research"] = realCaluclator(data['NrZp'], data['DlugFoliZlec_Korekta'])
        context['serialized_data'] = serialized_data.data
        return context

### REALIZACJA

class RealPlan(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = Zamowienie
    template_name = "Doc5/ProductionTable.html"
    queryset = Zamowienie.objects.filter(Status=1)

    def test_func(self):
        if self.request.user.groups.filter(name='admin').exists() or self.request.user.groups.filter(
                name='kierownik').exists():
            return True
        else:
            return False


    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serializer = ZamSerializer(context['object_list'], many=True)
        context['serialized_data'] = serializer.data
        for data in serializer.data:
            print(data)
            data["Research"] = realCaluclator(data['NrZp'], data['DlugFoliZlec_Korekta'])
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict

        return context

def realCaluclator(NrZp, Dlugosc):
    dataRol = Rolki.objects.filter(NrZp=NrZp)
    dataOrder = Zamowienie.objects.get(NrZp=NrZp)

    if not dataRol:
        return {'wagaSum':0,
                'wagaEnd':0,
                'dlugProd':0,
                'dlugEnd':0,
                'sumRol':0,
                'finishRol':0,
                'progres':0}

    waga_sum = float(np.round(dataRol.aggregate(Sum('WagaRolkiProd'))['WagaRolkiProd__sum'],2))
    waga_end = float(np.round(dataOrder.WagaFoliZlec - waga_sum,2))
    dlugProd = float(np.round(dataRol.aggregate(Sum('DlugRolkiProd'))['DlugRolkiProd__sum'],2))
    dlugEnd = float(np.round(dataOrder.IloscRolekZlec * dataOrder.DlugRolkiZlec_Korekta - dlugProd,2))
    sumRol = float(np.round(dataRol.aggregate(Count('Rolka'))['Rolka__count'],2))
    finishRol = float(np.round(dataOrder.IloscRolekZlec - sumRol,2))
    progres = float(np.round(Dlugosc / dlugProd,2))

    return {'wagaSum': waga_sum,
            'wagaEnd': waga_end,
            'dlugProd':dlugProd,
            'dlugEnd':dlugEnd,
            'sumRol': sumRol,
            'finishRol': finishRol,
            'progres':progres}


