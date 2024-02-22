from django.urls import path
from . import views
from .views import ProductionOrdersPlanningView, updateForm,copyForm, foliaPlanning, foliaForm, \
    upateRolForm, UserUpdateView, procFolia, procPrac, procReal, RealPlan, rapStatus

urlpatterns = [
    path('', views.home, name='Home.views.index'),
    path('login', views.loginFunc, name='Login.views.index'),
    path('logout', views.logoutUser, name='Logout.views.index'),
    path('calculator', views.calculator, name='Calculator.views.index'),

    path("form", views.addProduct, name='Form.views.index'), #1
    path('planProc', ProductionOrdersPlanningView.as_view(), name='PlanProc.views.index'),
    path("editForm/<int:pk>", updateForm.as_view(), name="editForm"),
    path("copyForm/<int:pk>", copyForm.as_view(), name="copyForm"),


    path('planFolia', foliaPlanning.as_view(), name="PlanFolia.views.index"), #3  # 3
    path('formFolia/<str:date>/<int:pk>', foliaForm.as_view(), name="formFolia.views.index"),
    path('get-data/<str:date>/<int:pk>', views.get_data, name='get-data'),
    path('get-dataCal/<str:date>/<int:pk>', views.get_dataCal, name='get-dataCal'),
    path("editRolForm/<str:date>/<int:pk>/<int:rolka>", upateRolForm.as_view(), name="editRol"), #2

    path('register', views.register, name='Register.views.index'),
    path('pracownicy', views.employer_list, name='Pracownicy.views.index'),
    path('pracownicy/Edycja/<str:name>', UserUpdateView.as_view(), name='Edycja.views.index'),
    path('usun/<str:name>', views.delete_user, name='Usun.views.index'),

    path('realizacja', RealPlan.as_view(), name='Realizacja.views.index'),

    ### Raport section
    path('doc4', procFolia.as_view() , name='procFolia.views.index'),
    path('doc6', procPrac.as_view(), name='procPrac.views.index'),
    path('doc5', procReal.as_view() ,  name='procReal.views.index'),
    path('update_status', views.update_status, name='update_status'),

    path('doc7', rapStatus.as_view() ,  name='rapStatus.views.index'),
]

