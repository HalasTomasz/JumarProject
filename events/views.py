from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.models import User
from django.db.models import Sum, Count
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST
from django.views.generic import ListView, CreateView, UpdateView
from rest_framework.generics import ListAPIView

from .models import Zamowienie, Rolki
from .serializer import ZamSerializer, RolSerializer, RolkiSumSerializer
from django.urls import reverse_lazy
from datetime import date, datetime
from .forms import AddForm, AddRolkiForm, AddUser
from django.http import JsonResponse
from django.template.defaulttags import register
from django.contrib.auth.forms import UserCreationForm
from .decorators import unathenticted_user,allowed_user
from django.contrib.auth import authenticate,login,logout, get_user

@register.filter
def get_item(dictionary, key):
  return dictionary.get(key)

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

@login_required(login_url='/login')
@allowed_user(allowed_groups=['admin'])
def register(request):

    form = AddUser()
    if request.method == "POST":
        form = AddUser(request.POST)
        if form.is_valid():
            user = form.save()
            group = form.cleaned_data['group']
            group.user_set.add(user)
            return redirect("Pracownicy.views.index")
        else:
            messages.info(request, "Błedne dane")
    context= {"form": form}
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
        "name": user.username,
        "user_kierownik":user_kierownik,
        "admin":admin
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
        request.POST = tempdict  # this is the added line
        form = AddForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('PlanProc.views.index')
        else:
            messages.error(request, 'DANE NIE POPRAWNIE WYPELNIONE')
    else:
        form = AddForm()
    context = {'form': form}
    return render(request, 'Doc1/form.html', context)


class ProductionOrdersPlanningView(LoginRequiredMixin, ListView):
    model = Zamowienie
    template_name = "Doc1/procPlanTable.html"
    queryset = Zamowienie.objects.filter(Status=0)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serializer = ZamSerializer(context['object_list'], many=True)
        context['serialized_data'] = serializer.data
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        return context


class copyForm(LoginRequiredMixin, CreateView):
    model = Zamowienie
    serializer_class = ZamSerializer
    form_class = AddForm
    template_name = "Doc1/copyForm.html"
    success_url = reverse_lazy('PlanProc.views.index')


    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        model = Zamowienie.objects.get(pk=self.kwargs['pk'])
        serializer = self.serializer_class(model)
        context['data'] = serializer.data
        return context

    def form_valid(self, form):
        # Modify the data before it is saved
        nr_zp_id = Zamowienie.objects.all().values_list('id', flat=True).order_by('-id').first()
        nr_zp = str(date.today()) + "/" + str(nr_zp_id)
        form.instance.pk = None
        form.instance.NrZp = nr_zp
        print(form)
        return super().form_valid(form)

class updateForm(LoginRequiredMixin, UpdateView):
    model = Zamowienie
    serializer_class = ZamSerializer
    form_class = AddForm
    template_name = "Doc1/editForm.html"
    success_url = reverse_lazy('PlanProc.views.index')

    def get_object(self, queryset=None):
        obj = super().get_object(queryset=queryset)
        print(obj)
        return obj

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serializer = self.serializer_class(instance=self.object)
        context['data'] = serializer.data
        return context


    # def form_valid(self, form):
    #     print("HERE")
    #     if 'submit-button' in self.request.POST and self.request.POST['submit-button'] == 'save':
    #         # Save the form data
    #         instance = form.save(commit=False)
    #         instance.user = self.request.user
    #         instance.save()
    #
    #     # Call the parent class's form_valid() method to redirect the user to the success URL
    #     return super().form_valid(form)


class foliaPlanning(LoginRequiredMixin, ListView):
    model = Zamowienie
    template_name = "Doc2/procFolia.html"
    queryset = Zamowienie.objects.filter(Status=1)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        serializer = ZamSerializer(context['object_list'], many=True)
        context['serialized_data'] = serializer.data
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        return context

@login_required(login_url='/login')
def order(request):
    return render(request, 'Doc346/some.html')


# class foliaRaport(ListView):
#     model = Rolki
#     template_name = "foliaForm.html"
#     queryset = Rolki.objects.filter(Status=0)
#
#     def get_context_data(self, **kwargs):
#         context = super().get_context_data(**kwargs)
#         serializer = ZamSerializer(context['object_list'], many=True)
#         context['serialized_data'] = serializer.data
#         context['status_dict'] = status_dict
#         context['nrwyt_dict'] = nrwyt_dict
#         context['folia_dict'] = folia_dict
#         return context


class foliaForm(LoginRequiredMixin, CreateView):

    model = Rolki
    template_name = "Doc2/foliaForm.html"
    form_class = AddRolkiForm
    serializer_class = RolSerializer
    success_url = reverse_lazy('PlanFolia.views.index')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        NrZp = self.kwargs['date'] + "/"+str(self.kwargs['pk'])
        model = Zamowienie.objects.get(NrZp=NrZp)
        serializer = ZamSerializer(model, many=False)
        user = get_user(request=self.request)
        context['data'] = serializer.data
        context['user'] = user.username
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        print(context)
        return context

    def form_valid(self, form):
        # Modify the data before it is saved
        return super().form_valid(form)

class upateRolForm(LoginRequiredMixin, UpdateView):
    model = Rolki
    form_class = AddRolkiForm
    template_name = "Doc2/foliaForm.html"
    success_url = reverse_lazy('PlanFolia.views.index')

    def get_object(self, queryset=None):
        obj = super().get_object(queryset=queryset)
        print(obj)
        return obj

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        return context

@login_required(login_url='/login')
def get_data(request, date, pk):
    NrZp = date +'/'+str(pk)
    data = Rolki.objects.filter(NrZp=NrZp)
    data_list = []
    for item in data:
        data_list.append({'id': item.NrZp, 'data': item.Data,
                          'zmiana': item.Zmiana,
                          "rolka": item.Rolka,
                          "nrwytl": item.NrWytl,
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

    waga_sum = dataRol.aggregate(Sum('WagaRolkiProd'))['WagaRolkiProd__sum']
    waga_end = dataOrder.WagaFoliZlec - waga_sum
    dlugProd = dataRol.aggregate(Sum('DlugRolkiProd'))['DlugRolkiProd__sum']
    dlugEnd = dataOrder.IloscRolekZlec * dataOrder.DlugRolkiZlec_Korekta - dlugProd
    sumRol = dataRol.aggregate(Count('Rolka'))['Rolka__count']
    finishRol = dataOrder.IloscRolekZlec - sumRol

    return JsonResponse({'calc': [waga_sum, waga_end, dlugProd, dlugEnd , sumRol, finishRol]})

@login_required(login_url='/login')
def employer_list(request):
    employers = User.objects.all()
    context = {'employers': employers}
    return render(request, 'WrokersView/employer_list.html', context)

@login_required(login_url='/login')
@require_POST
def delete_user(request, name):
    user = get_object_or_404(User, username=name)
    user.delete()
    return redirect('Home.views.index')


class UserUpdateView(LoginRequiredMixin, UpdateView):
    model = User
    form_class = AddUser
    template_name = 'WrokersView/EditWorker.html'
    success_url = reverse_lazy('Pracownicy.views.index')


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

class procFolia(LoginRequiredMixin,ListView ):

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
            mapper[data["NrZp"]] =  data

        for rolki in context['rolki_list']:
            rolki.zamowienie = mapper[str(rolki.NrZp)]

        return context

class procPrac(ListView):
    model = Rolki
    template_name = "Doc346/ProdPrac.html"
    serializer_class = RolkiSumSerializer
    queryset = Rolki.objects.filter()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        serialized_data = self.serializer_class(context['object_list'], many=True)
        context['serialized_data'] = serialized_data.data
        return context

class procReal(ListView):
    model = Zamowienie
    template_name = "Doc346/procZrel.html"
    serializer_class = ZamSerializer
    queryset = Zamowienie.objects.filter(Status__gt=1)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['status_dict'] = status_dict
        context['nrwyt_dict'] = nrwyt_dict
        context['folia_dict'] = folia_dict
        serialized_data = self.serializer_class(context['object_list'], many=True)
        context['serialized_data'] = serialized_data.data
        context['realizacja'] = 10
        print(context)

        return context

def tmp(request):
        return render(request, 'Doc346/some.html')
