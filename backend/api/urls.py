from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("trip/", views.plan_trip_view, name="plan_trip"),
]
